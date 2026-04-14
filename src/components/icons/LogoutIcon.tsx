import { IconProps } from './LogoIcon';

export const LogoutIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 6H8C6.895 6 6 6.895 6 8V24C6 25.105 6.895 26 8 26H12" stroke={color} strokeWidth="1.5" />
    <path d="M20 12L26 18M26 18L20 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="14" y1="18" x2="26" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
