import { IconProps } from './LogoIcon';

export const CopyIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect
      x="8"
      y="8"
      width="12"
      height="12"
      rx="2"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M4 16V6C4 4.89543 4.89543 4 6 4H16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);