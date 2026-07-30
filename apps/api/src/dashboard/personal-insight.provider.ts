import { Currency } from '@prisma/client';

export type CoachingHref =
  '/dashboard/transactions' | '/dashboard/budgets' | '/dashboard/savings' | '/dashboard/reports';

export interface CoachingItem {
  title: string;
  body: string;
  actionHref: CoachingHref;
  actionLabel: string;
}

export interface PersonalInsightInput {
  currency: Currency;
  isHealthReady: boolean;
  missingSignals: ('income' | 'budget' | 'goal')[];
  healthScore: number | null;
  hasExceededBudget: boolean;
  exceededBudgetName: string | null;
  currentSavingsRate: number | null;
  previousSavingsRate: number | null;
  behindGoalName: string | null;
  positive: boolean;
}

export interface PersonalInsightProvider {
  getInsight(input: PersonalInsightInput): CoachingItem;
}

/** Rule-based v1 provider. A future AI provider can implement this same contract. */
export class RuleBasedPersonalInsightProvider implements PersonalInsightProvider {
  getInsight(input: PersonalInsightInput): CoachingItem {
    if (!input.isHealthReady) {
      const setup = {
        income: {
          body: `${input.currency} için tasarruf oranını hesaplamak üzere bu ay bir gelir kaydedin.`,
          actionHref: '/dashboard/transactions' as const,
          actionLabel: 'İşlemlere git',
        },
        budget: {
          body: 'Harcama alışkanlığınızı daha net görmek için aylık bir gider bütçesi oluşturun.',
          actionHref: '/dashboard/budgets' as const,
          actionLabel: 'Bütçe oluştur',
        },
        goal: {
          body: 'İlerlemenizi takip edebilmek için aktif bir birikim hedefi ekleyin.',
          actionHref: '/dashboard/savings' as const,
          actionLabel: 'Hedef ekle',
        },
      }[input.missingSignals[0] ?? 'income'];
      return {
        title: 'Finansal görünümünüzü tamamlayın',
        ...setup,
      };
    }
    if ((input.healthScore ?? 100) < 40) {
      return {
        title: 'Öncelik: finansal sağlığınızı toparlayın',
        body: 'Bu ayki göstergeleriniz kritik seviyede. Giderlerinizi ve bütçe uyumunuzu birlikte gözden geçirin.',
        actionHref: '/dashboard/reports',
        actionLabel: 'Raporları incele',
      };
    }
    if (input.hasExceededBudget) {
      return {
        title: 'Bütçe sınırını aştınız',
        body: `${input.exceededBudgetName ?? 'Bir'} kategorisindeki harcama aylık bütçesini geçti. Kalan harcamaları planlamak faydalı olabilir.`,
        actionHref: '/dashboard/budgets',
        actionLabel: 'Bütçeleri incele',
      };
    }
    if (
      input.currentSavingsRate !== null &&
      input.previousSavingsRate !== null &&
      input.currentSavingsRate < input.previousSavingsRate
    ) {
      return {
        title: 'Tasarruf oranınız geriledi',
        body: `Bu ayki tasarruf oranınız önceki aya göre daha düşük. Düzenli giderlerinizi kontrol ederek küçük bir pay ayırmayı deneyin.`,
        actionHref: '/dashboard/transactions',
        actionLabel: 'İşlemleri incele',
      };
    }
    if (input.behindGoalName) {
      return {
        title: 'Hedefiniz için tempo artırılabilir',
        body: `${input.behindGoalName} hedefi planlanan ilerlemenin gerisinde görünüyor. Küçük, düzenli katkılar fark yaratabilir.`,
        actionHref: '/dashboard/savings',
        actionLabel: 'Hedeflere git',
      };
    }
    return {
      title: 'İyi gidiyorsunuz',
      body: input.positive
        ? 'Bütçeniz, tasarruf oranınız ve hedefleriniz bu ay dengeli ilerliyor. Bu düzeni sürdürün.'
        : 'Finansal görünümünüzü düzenli takip etmeyi sürdürün; küçük kayıtlar daha sağlıklı kararlar sağlar.',
      actionHref: '/dashboard/reports',
      actionLabel: 'Raporları gör',
    };
  }
}
