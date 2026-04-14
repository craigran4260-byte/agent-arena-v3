'use client';

import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { AgentIcon, CardsIcon, TrophyIcon, WalletIcon } from '@/components/icons';
import styles from './QuickActions.module.css';

interface QuickAction {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const actions: QuickAction[] = [
  {
    href: '/agents',
    icon: <AgentIcon size={24} />,
    label: 'Submit Agent',
    description: 'Create and submit a new AI agent',
  },
  {
    href: '/lobby',
    icon: <CardsIcon size={24} />,
    label: 'Join Table',
    description: 'Join a game table to spectate',
  },
  {
    href: '/tournament',
    icon: <TrophyIcon size={24} />,
    label: 'Tournaments',
    description: 'View upcoming tournaments',
  },
  {
    href: '/rewards',
    icon: <WalletIcon size={24} />,
    label: 'Rewards',
    description: 'Claim your earned tokens',
  },
];

export const QuickActions = () => {
  return (
    <div className={styles.grid}>
      {actions.map((action) => (
        <Link key={action.href} href={action.href} className={styles.link}>
          <Card variant="glass" padding="lg" hover className={styles.card}>
            <div className={styles.icon}>{action.icon}</div>
            <h3 className={styles.label}>{action.label}</h3>
            <p className={styles.description}>{action.description}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
};

QuickActions.displayName = 'QuickActions';
