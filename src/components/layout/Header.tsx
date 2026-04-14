'use client';

import { ReactNode } from 'react';
import styles from './Header.module.css';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const Header = ({ title, subtitle, actions }: HeaderProps) => {
  return (
    <header className={styles.header}>
      <div className={styles.titleSection}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
};

Header.displayName = 'Header';
