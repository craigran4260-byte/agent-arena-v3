'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, AgentIcon, CardsIcon, TrophyIcon, UserIcon, KeyIcon } from '@/components/icons';
import styles from './MobileNav.module.css';

interface MobileNavItem {
  href: string;
  icon: React.ReactNode;
}

const navItems: MobileNavItem[] = [
  { href: '/dashboard', icon: <HomeIcon size={24} /> },
  { href: '/agents', icon: <AgentIcon size={24} /> },
  { href: '/lobby', icon: <CardsIcon size={24} /> },
  { href: '/leaderboard', icon: <TrophyIcon size={24} /> },
  { href: '/keys', icon: <KeyIcon size={24} /> },
  { href: '/profile', icon: <UserIcon size={24} /> },
];

export const MobileNav = () => {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.navItem} ${pathname?.startsWith(item.href) ? styles.active : ''}`}
        >
          {item.icon}
        </Link>
      ))}
    </nav>
  );
};

MobileNav.displayName = 'MobileNav';
