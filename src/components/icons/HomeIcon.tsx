import { IconProps } from './LogoIcon';

export const HomeIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M4 16L16 6L28 16" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path
      d="M6 14V26C6 27.105 6.895 28 8 28H24C25.105 28 26 27.105 26 26V14"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <rect x="12" y="20" width="8" height="8" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);
