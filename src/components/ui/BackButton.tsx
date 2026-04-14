'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/icons';
import styles from './BackButton.module.css';

interface BackButtonProps {
  label?: string;
  className?: string;
}

export const BackButton = ({ label = 'Back', className }: BackButtonProps) => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`${styles.button} ${className || ''}`}
      aria-label="Go back"
    >
      <ArrowLeftIcon size={16} />
      <span>{label}</span>
    </button>
  );
};

BackButton.displayName = 'BackButton';