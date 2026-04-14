export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

export const LogoIcon = ({ size = 32, className = '', color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16 2L24.66 6.34V12.66L16 17L7.34 12.66V6.34L16 2Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M16 17L24.66 21.34V27.66L16 32L7.34 27.66V21.34L16 17Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="16" cy="14" r="2" fill={color} />
  </svg>
);
