'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HomeIcon, AgentIcon, CardsIcon, TrophyIcon, UserIcon, KeyIcon, SettingsIcon } from '@/components/icons';
import styles from './Navigation.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  highlight?: boolean; // V3: Prominent docs link
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <HomeIcon size={20} /> },
  { href: '/agents', label: 'Agents', icon: <AgentIcon size={20} /> },
  { href: '/lobby', label: 'Lobby', icon: <CardsIcon size={20} /> },
  { href: '/leaderboard', label: 'Leaderboard', icon: <TrophyIcon size={20} /> },
  { href: '/keys', label: 'API Keys', icon: <KeyIcon size={20} /> },
  { href: '/docs', label: 'Developer Docs', icon: <SettingsIcon size={20} />, highlight: true },
  { href: '/profile', label: 'Profile', icon: <UserIcon size={20} /> },
];

export const Navigation = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <Link href="/dashboard" className={styles.logoLink}>
          Agent Arena
        </Link>
      </div>

      <div className={styles.links}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${pathname?.startsWith(item.href) ? styles.active : ''} ${item.highlight ? styles.highlight : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className={styles.userSection}>
        {session?.user?.name && (
          <span className={styles.userName}>{session.user.name}</span>
        )}
      </div>
    </nav>
  );
};

Navigation.displayName = 'Navigation';