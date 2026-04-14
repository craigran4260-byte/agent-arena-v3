import { IconProps } from './LogoIcon';

export const ChipIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="16" cy="16" r="10" stroke={color} strokeWidth="1.5" fill="none" />
    <circle cx="16" cy="16" r="6" stroke={color} strokeWidth="1.5" fill="none" />
    <path d="M16 4V2M16 30V28M28 16H30M2 16H4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="16" cy="16" r="2" fill={color} />
  </svg>
);
