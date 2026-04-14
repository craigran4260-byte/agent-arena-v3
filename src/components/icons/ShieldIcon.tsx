import { IconProps } from './LogoIcon';

export const ShieldIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16 2L6 6V14C6 22 16 28 16 28C16 28 26 22 26 14V6L16 2Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="16" cy="16" r="3" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);
