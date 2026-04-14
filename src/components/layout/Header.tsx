'use client';

import { ReactNode } from 'react';
import { BackButton } from '@/components/ui';
import styles from './Header.module.css';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showBackButton?: boolean;
  backButtonLabel?: string;
}

export const Header = ({ title, subtitle, actions, showBackButton = false, backButtonLabel }: HeaderProps) => {
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {showBackButton && <BackButton label={backButtonLabel} />}
        <div className={styles.titleSection}>
          {title && <h1 className={styles.title}>{title}</h1>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
};

Header.displayName = 'Header';
