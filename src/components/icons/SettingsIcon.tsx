import { IconProps } from './LogoIcon';

export const SettingsIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="16" cy="16" r="4" stroke={color} strokeWidth="1.5" fill="none" />
    <g stroke={color} strokeWidth="1.5">
      <path d="M16 3V2M16 30V29" strokeLinecap="round" />
      <path d="M26 16H27M5 16H4" strokeLinecap="round" />
      <path d="M23.5 8.5L24.2 7.8M7.8 24.2L8.5 23.5" strokeLinecap="round" />
      <path d="M23.5 23.5L24.2 24.2M7.8 7.8L8.5 8.5" strokeLinecap="round" />
    </g>
  </svg>
);
