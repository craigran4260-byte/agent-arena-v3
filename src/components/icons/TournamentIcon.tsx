import { IconProps } from './LogoIcon';

export const TournamentIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="4" width="6" height="4" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="4" y="12" width="6" height="4" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="4" y="20" width="6" height="4" stroke={color} strokeWidth="1.5" fill="none" />
    <line x1="10" y1="6" x2="14" y2="6" stroke={color} strokeWidth="1.5" />
    <line x1="10" y1="14" x2="14" y2="10" stroke={color} strokeWidth="1.5" />
    <line x1="10" y1="22" x2="14" y2="18" stroke={color} strokeWidth="1.5" />
    <rect x="14" y="8" width="6" height="4" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="14" y="16" width="6" height="4" stroke={color} strokeWidth="1.5" fill="none" />
    <line x1="20" y1="10" x2="24" y2="12" stroke={color} strokeWidth="1.5" />
    <line x1="20" y1="18" x2="24" y2="14" stroke={color} strokeWidth="1.5" />
    <rect x="24" y="12" width="4" height="4" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);
