import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const isDevelopment = process.env.NODE_ENV === 'development';
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').origin;

// Pages are statically rendered, so a nonce-based policy is not possible; inline scripts stay
// allowed while sources, connections, framing and plugins are locked down.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Upgrading is only safe when the API itself is served over HTTPS.
  ...(apiOrigin.startsWith('https:') ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isDevelopment
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]),
        ],
      },
    ];
  },
  turbopack: {
    root: resolve(__dirname, '../..'),
  },
};

export default nextConfig;
