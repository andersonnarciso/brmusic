import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
}

export const Icon = {
  Home: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  ),
  Compass: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  ),
  Sparkles: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.6 10.4 11.2 6 9.6 10.4 8z" />
      <path d="M18.5 15.5 19.3 17.6 21.4 18.4 19.3 19.2 18.5 21.3 17.7 19.2 15.6 18.4 17.7 17.6z" />
    </svg>
  ),
  Studio: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 19V5" />
      <path d="M8 19V9" />
      <path d="M12 19v-7" />
      <path d="M16 19v-4" />
      <path d="M20 19v-9" />
    </svg>
  ),
  Library: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  ),
  Bell: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z" />
      <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  ),
  More: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </svg>
  ),
  Play: (p: IconProps) => (
    <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  ),
  Pause: (p: IconProps) => (
    <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
    </svg>
  ),
  Next: (p: IconProps) => (
    <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
      <path d="M6 5.5v13l9-6.5z" />
      <rect x="16" y="5" width="2.6" height="13" rx="1.1" />
    </svg>
  ),
  Prev: (p: IconProps) => (
    <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
      <path d="M18 5.5v13L9 12z" />
      <rect x="5.4" y="5" width="2.6" height="13" rx="1.1" />
    </svg>
  ),
  Shuffle: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M16 4h4v4" />
      <path d="M20 4 13 11" />
      <path d="M4 20 11 13" />
      <path d="M16 20h4v-4" />
      <path d="m14 14 6 6" />
    </svg>
  ),
  Repeat: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M17 3.5 20.5 7 17 10.5" />
      <path d="M20.5 7H7a3.5 3.5 0 0 0-3.5 3.5V12" />
      <path d="M7 20.5 3.5 17 7 13.5" />
      <path d="M3.5 17H17a3.5 3.5 0 0 0 3.5-3.5V12" />
    </svg>
  ),
  Volume: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5z" />
      <path d="M16 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M18.5 7a7 7 0 0 1 0 10" />
    </svg>
  ),
  VolumeOff: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5z" />
      <path d="m16 10 4 4" />
      <path d="m20 10-4 4" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  Heart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 19.5s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10.5c0 4.7-7 9-7 9Z" />
    </svg>
  ),
  HeartFilled: (p: IconProps) => (
    <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
      <path d="M12 19.5s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10.5c0 4.7-7 9-7 9Z" />
    </svg>
  ),
  Dislike: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4.5s7 4.3 7 9a4 4 0 0 1-7 2.6A4 4 0 0 1 5 13.5c0-4.7 7-9 7-9Z" />
    </svg>
  ),
  Share: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M14 5.5 19.5 11 14 16.5V13c-4 0-6.5 1.5-8 5 0-4.5 2.5-7.5 8-7.5z" />
    </svg>
  ),
  Download: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 3.5 4-3.5" />
      <path d="M5 19h14" />
    </svg>
  ),
  Trash: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7v12h10V7" />
    </svg>
  ),
  Mic: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="9.5" y="3.5" width="5" height="10" rx="2.5" />
      <path d="M6 11.5a6 6 0 0 0 12 0" />
      <path d="M12 17.5V21" />
    </svg>
  ),
  Image: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 4.5-4.5 3.5 3.5 2.5-2.5 3.5 3.5" />
    </svg>
  ),
  Audio: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 9.5h3L12 6v12l-4-3.5H5z" />
      <path d="M16 8.5a5 5 0 0 1 0 7" />
    </svg>
  ),
  Filter: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  ),
  List: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  Grid: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </svg>
  ),
  ChevronDown: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m6 9.5 6 5.5 6-5.5" />
    </svg>
  ),
  ChevronRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m9.5 6 5.5 6-5.5 6" />
    </svg>
  ),
  Sliders: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 8h10" />
      <path d="M18 8h2" />
      <circle cx="16" cy="8" r="2" />
      <path d="M4 16h4" />
      <path d="M12 16h8" />
      <circle cx="10" cy="16" r="2" />
    </svg>
  ),
  PanelLeft: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M10 4.5v15" />
    </svg>
  ),
  Send: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 19V5" />
      <path d="m6.5 10.5 5.5-5.5 5.5 5.5" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  ),
  Undo: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 8H5V4" />
      <path d="M5.5 8.5a7.5 7.5 0 1 1-1 6.5" />
    </svg>
  ),
  Redo: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M15 8h4V4" />
      <path d="M18.5 8.5a7.5 7.5 0 1 0 1 6.5" />
    </svg>
  ),
  Expand: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 4.5H4.5V9" />
      <path d="M15 4.5h4.5V9" />
      <path d="M9 19.5H4.5V15" />
      <path d="M15 19.5h4.5V15" />
    </svg>
  ),
  Note: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  ),
};
