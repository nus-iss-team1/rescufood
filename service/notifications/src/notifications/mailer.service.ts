import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

// Gmail's own servers send the mail, authenticated as a real account - unlike SES sending "from" a domain it isn't authorized for.
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
    await this.transport.sendMail({ from: this.from, to, subject, text: body });
  }
}
