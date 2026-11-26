import { useId } from 'react';

type Tone = 'auto' | 'light';

/**
 * The MoneyPilot compass mark: a compass ring with four points, a rising teal trend line and a
 * gold arrow. `auto` follows the theme's foreground; `light` is for dark surfaces such as the
 * landing hero and the auth panel.
 */
export function BrandMark({
  className = 'size-9',
  tone = 'auto',
}: {
  className?: string;
  tone?: Tone;
}) {
  const gradientId = `brand-gold-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="28"
          y1="10"
          x2="40"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f4d98f" />
          <stop offset="1" stopColor="#c48f30" />
        </linearGradient>
      </defs>
      <g className={tone === 'light' ? 'text-white' : 'text-[var(--foreground)]'}>
        <path
          d="M32 10.14A16 16 0 1 0 38.83 18"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="m24 2 2.2 6h-4.4zM24 46l-2.2-6h4.4zM2 24l6-2.2v4.4z" fill="currentColor" />
        <path d="m46 24-6 2.2v-4.4z" fill="currentColor" opacity=".9" />
      </g>
      <path
        d="m13.5 32.5 7-7 4 4 8.5-8.5"
        stroke={tone === 'light' ? '#2dd4bf' : 'var(--brand-teal)'}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M41 7.5 26 13.6l6 2.2 2.6 6.4z" fill={`url(#${gradientId})`} />
    </svg>
  );
}

export function BrandLogo({ className = '', tone = 'auto' }: { className?: string; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.03em] ${tone === 'light' ? 'text-white' : 'text-[var(--foreground)]'} ${className}`}
    >
      <BrandMark tone={tone} className="size-[1.75em]" />
      <span>
        Money
        <span className={tone === 'light' ? 'text-[#2dd4bf]' : 'text-[var(--brand-teal)]'}>
          Pilot
        </span>
      </span>
    </span>
  );
}
