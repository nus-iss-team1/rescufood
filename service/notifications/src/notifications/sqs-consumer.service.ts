import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  type Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MailerService } from './mailer.service';
import { NotificationMessageDto } from './notification-message.dto';
import { NotificationsRepository } from './notifications.repository';
import { renderEmail, UnsupportedNotificationTypeError } from './templates';

type Outcome = 'sent' | 'permanent-failure' | 'transient-failure';

// Success or a poison message deletes it; anything else is left for SQS to retry/dead-letter.
@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerService.name);
  private readonly client: SQSClient;
  private readonly queueUrl: string;
  private running = false;
  private loopPromise?: Promise<void>;

  constructor(
    config: ConfigService,
    private readonly mailer: MailerService,
    private readonly repository: NotificationsRepository,
  ) {
    this.client = new SQSClient({ region: config.getOrThrow('AWS_REGION') });
    this.queueUrl = config.getOrThrow('NOTIFICATION_QUEUE_URL');
  }

  onModuleInit(): void {
    this.running = true;
    this.loopPromise = this.poll();
  }

  // Can take up to WaitTimeSeconds (20s) to actually stop.
  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.loopPromise;
  }

  private async poll(): Promise<void> {
    while (this.running) {
      const result = await this.client
        .send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
          }),
        )
        .catch((error: unknown) => {
          this.logger.error({ err: error }, 'sqs receive failed');
          return undefined;
        });

      for (const message of result?.Messages ?? []) {
        await this.handle(message);
      }
    }
  }

  private async handle(message: Message): Promise<void> {
    const outcome = await this.process(message);
    if (outcome !== 'transient-failure' && message.ReceiptHandle) {
      await this.client
        .send(
          new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        )
        .catch((error: unknown) => {
          this.logger.error({ err: error }, 'sqs delete failed');
        });
    }
  }

  // Handles one message: parse, validate, render, send, record the outcome.
  async process(message: Message): Promise<Outcome> {
    const body = message.Body;
    if (!body) {
      this.logger.error('sqs message has no body');
      return 'permanent-failure';
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.logger.error({ body }, 'sqs message body is not valid JSON');
      return 'permanent-failure';
    }

    const dto = plainToInstance(NotificationMessageDto, parsed);
    const errors = await validate(dto);
    if (errors.length > 0) {
      this.logger.error({ body, errors }, 'sqs message failed validation');
      return 'permanent-failure';
    }

    const payload = dto.payload ?? {};

    try {
      const email = renderEmail(dto.type, payload);
      await this.mailer.send(dto.recipientEmail, email.subject, email.body);
      // Email already sent; stays 'sent' even if the audit write fails.
      await this.safeRecord({
        recipientEmail: dto.recipientEmail,
        type: dto.type,
        channel: dto.channel,
        payload,
        status: 'sent',
      });
      return 'sent';
    } catch (error) {
      const failureReason =
        error instanceof Error ? error.message : String(error);
      await this.safeRecord({
        recipientEmail: dto.recipientEmail,
        type: dto.type,
        channel: dto.channel,
        payload,
        status: 'failed',
        failureReason,
      });
      this.logger.error({ err: error }, 'notification delivery failed');
      return error instanceof UnsupportedNotificationTypeError
        ? 'permanent-failure'
        : 'transient-failure';
    }
  }

  // Records the delivery outcome; logs and swallows any write failure.
  private async safeRecord(
    entry: Parameters<NotificationsRepository['record']>[0],
  ): Promise<void> {
    try {
      await this.repository.record(entry);
    } catch (error) {
      this.logger.error(
        { err: error },
        'failed to record notification delivery',
      );
    }
  }
}
