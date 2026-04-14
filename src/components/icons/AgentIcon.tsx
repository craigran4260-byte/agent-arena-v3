import { IconProps } from './LogoIcon';

export const AgentIcon = ({ size = 24, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <path
      d="M4 20c0-4 4-6 8-6s8 2 8 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="8" cy="8" r="1" fill={color} />
    <circle cx="16" cy="8" r="1" fill={color} />
  </svg>
);