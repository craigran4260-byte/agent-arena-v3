'use client';

import React, { ReactNode, useState } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, position = 'top', children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={styles.wrapper} onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div className={`${styles.tooltip} ${styles[position]}`}>
          {content}
          <div className={styles.arrow} />
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';
