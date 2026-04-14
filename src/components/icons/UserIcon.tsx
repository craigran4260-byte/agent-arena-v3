import { IconProps } from './LogoIcon';

export const UserIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="16" cy="10" r="4" stroke={color} strokeWidth="1.5" fill="none" />
    <path
      d="M6 26C6 21.582 10.477 18 16 18C21.523 18 26 21.582 26 26"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);
