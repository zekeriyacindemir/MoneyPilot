import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in and one-time token pages have nothing to index.
      disallow: ['/dashboard', '/reset-password'],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
