import { IconProps } from './LogoIcon';

export const ChartIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <line x1="4" y1="26" x2="28" y2="26" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <rect x="6" y="18" width="3" height="8" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="12" y="12" width="3" height="14" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="18" y="8" width="3" height="18" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="24" y="14" width="3" height="12" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);
