import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${site.url}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${site.url}/register`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${site.url}/login`, changeFrequency: 'yearly', priority: 0.5 },
  ];
}
