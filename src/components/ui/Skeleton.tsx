'use client';

import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'circular' | 'rect';
  count?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  variant = 'text',
  count = 1,
  className = '',
}) => {
  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${styles[variant]} ${className}`}
          style={{
            width: variant === 'circular' ? height : width,
            height,
          }}
        />
      ))}
    </>
  );
};

Skeleton.displayName = 'Skeleton';
