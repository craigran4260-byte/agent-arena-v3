'use client';

import React, { ReactNode } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'md', children, className = '' }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className}`}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
