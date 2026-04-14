import { IconProps } from './LogoIcon';

export const WalletIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="6" width="24" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
    <path d="M4 12H28" stroke={color} strokeWidth="1.5" />
    <circle cx="23" cy="20" r="2" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);
