import type { SVGProps } from 'react';

export type IconName =
  | 'arrows'
  | 'bell'
  | 'chart'
  | 'chevron'
  | 'close'
  | 'grid'
  | 'menu'
  | 'moon'
  | 'monitor'
  | 'settings'
  | 'sun'
  | 'target'
  | 'wallet';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, ...properties }: IconProps) {
  const sharedProperties = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    ...properties,
  };

  switch (name) {
    case 'arrows':
      return <svg {...sharedProperties}><path d="M7 7h12m0 0-3-3m3 3-3 3M17 17H5m0 0 3 3m-3-3 3-3" /></svg>;
    case 'bell':
      return <svg {...sharedProperties}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case 'chart':
      return <svg {...sharedProperties}><path d="M4 19V5m0 14h16M8 16v-3m4 3V8m4 8v-6" /></svg>;
    case 'chevron':
      return <svg {...sharedProperties}><path d="m9 18 6-6-6-6" /></svg>;
    case 'close':
      return <svg {...sharedProperties}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case 'grid':
      return <svg {...sharedProperties}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
    case 'menu':
      return <svg {...sharedProperties}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case 'moon':
      return <svg {...sharedProperties}><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" /></svg>;
    case 'monitor':
      return <svg {...sharedProperties}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>;
    case 'settings':
      return <svg {...sharedProperties}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20.3h-3v-.09A1.7 1.7 0 0 0 10.68 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15 1.7 1.7 0 0 0 5.47 14H5.4v-3h.07A1.7 1.7 0 0 0 7.02 9.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.55V4.7h3v.06a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.53 11h.07v3h-.07A1.7 1.7 0 0 0 19.4 15Z" /></svg>;
    case 'sun':
      return <svg {...sharedProperties}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>;
    case 'target':
      return <svg {...sharedProperties}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></svg>;
    case 'wallet':
      return <svg {...sharedProperties}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2H7a2 2 0 0 0 0 4h13v4a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9ZM16 13h1" /></svg>;
  }
}
