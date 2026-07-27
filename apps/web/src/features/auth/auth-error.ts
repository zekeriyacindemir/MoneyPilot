import { isAxiosError } from 'axios';

export function getAuthErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }

  if (!error.response) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  const message = error.response.data?.message;

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }

  return 'İşleminiz tamamlanamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
}
