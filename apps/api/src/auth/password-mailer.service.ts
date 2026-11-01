import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PasswordMailer {
  constructor(private readonly mail: MailService) {}
  assertConfigured(): void {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'Şifre kurtarma e-posta hizmeti henüz yapılandırılmadı. Lütfen daha sonra tekrar deneyin.',
      );
    }
  }
  async send(email: string, token: string): Promise<void> {
    this.assertConfigured();
    const link = this.mail.appLink('/reset-password');
    // Fragment keeps the token out of access logs and HTTP referrers.
    link.hash = token;
    await this.mail.send({
      to: email,
      subject: 'MoneyPilot · Şifreni yenile',
      text:
        'Şifreni yenilemek için aşağıdaki bağlantıyı aç. Bağlantı 20 dakika geçerlidir ve bir kez kullanılabilir. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.\n\n' +
        link.toString(),
    });
  }
}
