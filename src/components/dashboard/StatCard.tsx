'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui';
import styles from './StatCard.module.css';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  description?: string;
}

export const StatCard = ({ title, value, icon, trend = 'neutral', trendValue, description }: StatCardProps) => {
  return (
    <Card variant="glass" padding="lg" className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        <div className={styles.icon}>{icon}</div>
      </div>

      <div className={styles.valueSection}>
        <div className={styles.value}>{value}</div>
        {trendValue && (
          <div className={`${styles.trend} ${styles[trend]}`}>
            <span className={styles.arrow}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

StatCard.displayName = 'StatCard';
