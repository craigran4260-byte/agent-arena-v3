import { IconProps } from './LogoIcon';

export const KeyIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12.65 10.65C11.85 8.55 9.75 7 7.25 7C4.35 7 2 9.35 2 12.25C2 15.15 4.35 17.5 7.25 17.5C9.75 17.5 11.85 15.95 12.65 13.85H15V16.5H17.5V13.85H19V16.5H21.5V13.85H22V10.65H12.65Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="7.25" cy="12.25" r="2.25" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);