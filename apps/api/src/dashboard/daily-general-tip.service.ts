import { Injectable } from '@nestjs/common';
import type { CoachingItem } from './personal-insight.provider';

const tips: CoachingItem[] = [
  { title: 'Bugünün küçük adımı', body: 'Günün sonunda son harcamalarınızı kaydetmek, bütçenizi görünür ve yönetilebilir tutar.', actionHref: '/dashboard/transactions', actionLabel: 'İşlem ekle' },
  { title: 'Küçük bir kontrol yapın', body: 'Bu haftaki en büyük giderinizi inceleyin; tekrar eden bir masrafı fark edebilirsiniz.', actionHref: '/dashboard/reports', actionLabel: 'Raporları incele' },
  { title: 'Bütçenize alan açın', body: 'Yaklaşan bir harcamayı şimdiden bütçenize eklemek sürprizleri azaltır.', actionHref: '/dashboard/budgets', actionLabel: 'Bütçeleri aç' },
  { title: 'Hedefinizi hatırlayın', body: 'Birikim hedefinize küçük ve düzenli katkılar eklemek ilerlemeyi kolaylaştırır.', actionHref: '/dashboard/savings', actionLabel: 'Hedeflere git' },
];

@Injectable()
export class DailyGeneralTipService {
  getTip(date: Date): CoachingItem {
    const day = Math.floor(date.getTime() / 86_400_000);
    return tips[((day % tips.length) + tips.length) % tips.length]!;
  }
}
