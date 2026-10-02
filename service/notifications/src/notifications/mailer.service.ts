import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

// Permanent failure; the provider rejected the recipient, so a retry never helps.
export class PermanentDeliveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PermanentDeliveryError';
  }
}

// SMTP 5xx is permanent per RFC 5321, as is an outright rejected recipient;
// 4xx and transport-level errors are worth another attempt.
function isPermanent(error: unknown): boolean {
  const e = error as { responseCode?: unknown; rejected?: unknown } | null;
  if (typeof e?.responseCode === 'number') {
    return e.responseCode >= 500 && e.responseCode < 600;
  }
  return Array.isArray(e?.rejected) && e.rejected.length > 0;
}

// Sends email through Gmail SMTP.
@Injectable()
export class MailerService {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.getOrThrow('GMAIL_USER');
    this.transport = createTransport({
      service: 'gmail',
      auth: {
        user: this.from,
        pass: config.getOrThrow('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.from,
        to,
        subject,
        text: body,
      });
    } catch (error) {
      if (isPermanent(error)) {
        throw new PermanentDeliveryError(
          error instanceof Error ? error.message : String(error),
          { cause: error },
        );
      }
      throw error;
    }
  }
}
