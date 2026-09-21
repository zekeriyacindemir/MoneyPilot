import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Environment } from '../config/environment.validation';

@Injectable()
export class PasswordMailer {
 constructor(private readonly configuration: ConfigService<Environment, true>) {}
 assertConfigured(): void {
   if (!this.configuration.get('SMTP_HOST', { infer: true }) || !this.configuration.get('SMTP_FROM', { infer: true })) {
     throw new ServiceUnavailableException('Şifre kurtarma e-posta hizmeti henüz yapılandırılmadı. Lütfen daha sonra tekrar deneyin.');
   }
 }
 async send(email: string, token: string): Promise<void> {
   this.assertConfigured();
   const port = this.configuration.get('SMTP_PORT', { infer: true });
   const user = this.configuration.get('SMTP_USER', { infer: true });
   const password = this.configuration.get('SMTP_PASSWORD', { infer: true });
   const transport = createTransport({
     host: this.configuration.get('SMTP_HOST', { infer: true }), port, secure: port === 465,
     requireTLS: true, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
     ...(user && password ? { auth: { user, pass: password } } : {}),
   });
   const link = new URL('/reset-password', this.configuration.get('CORS_ORIGIN', { infer: true }));
   // Fragment keeps the token out of access logs and HTTP referrers.
   link.hash = token;
   try {
     await transport.sendMail({ from: this.configuration.get('SMTP_FROM', { infer: true }), to: email,
       subject: 'MoneyPilot · Şifreni yenile',
       text: 'Şifreni yenilemek için aşağıdaki bağlantıyı aç. Bağlantı 20 dakika geçerlidir ve bir kez kullanılabilir. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.\n\n' + link.toString(),
     });
   } finally { transport.close(); }
 }
}
