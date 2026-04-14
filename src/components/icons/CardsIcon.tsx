import { IconProps } from './LogoIcon';

export const CardsIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="6" width="12" height="16" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="10" y="4" width="12" height="16" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
    <rect x="16" y="8" width="12" height="16" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);
