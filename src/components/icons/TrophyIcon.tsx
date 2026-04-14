import { IconProps } from './LogoIcon';

export const TrophyIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6 6H26V12C26 15.314 23.314 18 20 18H12C8.686 18 6 15.314 6 12V6Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path d="M10 18V22C10 23.105 10.895 24 12 24H20C21.105 24 22 23.105 22 22V18" stroke={color} strokeWidth="1.5" />
    <rect x="12" y="24" width="8" height="2" stroke={color} strokeWidth="1.5" fill="none" />
    <line x1="16" y1="26" x2="16" y2="28" stroke={color} strokeWidth="1.5" />
  </svg>
);
