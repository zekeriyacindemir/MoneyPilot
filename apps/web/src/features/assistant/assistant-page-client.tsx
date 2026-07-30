'use client';

import { DashboardCard, PageHeader } from '@/features/dashboard/components/ui';

export function AssistantPageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MoneyPilot AI"
        title="AI Asistan"
        description="Finansal koçluk deneyimimiz üzerinde çalışıyoruz."
      />
      <DashboardCard className="mx-auto max-w-2xl p-8 text-center sm:p-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--secondary)] text-lg font-bold text-[var(--primary)]">AI</span>
        <h2 className="mt-5 text-xl font-semibold text-[var(--card-foreground)]">Yakında burada</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          Size finansal alışkanlıklarınız için rehberlik edecek AI Asistan yakında kullanıma açılacak.
        </p>
      </DashboardCard>
    </div>
  );
}
