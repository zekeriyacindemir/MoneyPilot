import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Environment } from '../config/environment.validation';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Sends plain-text email over SMTP with mandatory TLS. */
@Injectable()
export class MailService {
  constructor(private readonly configuration: ConfigService<Environment, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.configuration.get('SMTP_HOST', { infer: true }) &&
      this.configuration.get('SMTP_FROM', { infer: true }),
    );
  }

  /** Builds an absolute link to a page of the web app. */
  appLink(path: string): URL {
    return new URL(path, this.configuration.get('CORS_ORIGIN', { infer: true }));
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.isConfigured()) throw new Error('SMTP is not configured.');

    const port = this.configuration.get('SMTP_PORT', { infer: true });
    const user = this.configuration.get('SMTP_USER', { infer: true });
    const password = this.configuration.get('SMTP_PASSWORD', { infer: true });
    const transport = createTransport({
      host: this.configuration.get('SMTP_HOST', { infer: true }),
      port,
      secure: port === 465,
      requireTLS: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
    try {
      await transport.sendMail({
        from: this.configuration.get('SMTP_FROM', { infer: true }),
        ...message,
      });
    } finally {
      transport.close();
    }
  }
}
