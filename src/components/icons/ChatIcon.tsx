import { IconProps } from './LogoIcon';

export const ChatIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 6C4 4.895 4.895 4 6 4H26C27.105 4 28 4.895 28 6V20C28 21.105 27.105 22 26 22H8L4 26V6Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="10" cy="14" r="1.5" fill={color} />
    <circle cx="16" cy="14" r="1.5" fill={color} />
    <circle cx="22" cy="14" r="1.5" fill={color} />
  </svg>
);
