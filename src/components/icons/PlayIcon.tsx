import { IconProps } from './LogoIcon';

export const PlayIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M10 8L16 12L10 16V8Z"
      fill={color}
    />
  </svg>
);