import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

@Injectable()
export class MailerService {
  private readonly client: SESv2Client;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.client = new SESv2Client({ region: config.getOrThrow('AWS_REGION') });
    this.from = config.getOrThrow('MAIL_FROM_ADDRESS');
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Text: { Data: body } },
          },
        },
      }),
    );
  }
}
