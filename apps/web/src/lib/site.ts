/** Public facts about the site, shared by metadata, robots, sitemap and the manifest. */
export const site = {
  name: 'MoneyPilot',
  title: 'MoneyPilot · Kişisel finans takibi',
  description:
    'Gelirini, harcamalarını, bütçelerini ve birikim hedeflerini tek bir sakin ekranda takip et. MoneyPilot ile paranı anla, yarınına yön ver.',
  // The public web origin, inlined at build time. Production builds receive WEB_ORIGIN.
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'tr_TR',
} as const;
