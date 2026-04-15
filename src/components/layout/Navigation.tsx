'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HomeIcon, AgentIcon, CardsIcon, TrophyIcon, UserIcon, KeyIcon, SettingsIcon } from '@/components/icons';
import { LanguageSwitcher } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import styles from './Navigation.module.css';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  highlight?: boolean; // V3: Prominent docs link
}

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: <HomeIcon size={20} /> },
  { href: '/agents', labelKey: 'nav.agents', icon: <AgentIcon size={20} /> },
  { href: '/lobby', labelKey: 'nav.lobby', icon: <CardsIcon size={20} /> },
  { href: '/leaderboard', labelKey: 'nav.leaderboard', icon: <TrophyIcon size={20} /> },
  { href: '/keys', labelKey: 'nav.keys', icon: <KeyIcon size={20} /> },
  { href: '/docs', labelKey: 'nav.docs', icon: <SettingsIcon size={20} />, highlight: true },
  { href: '/profile', labelKey: 'nav.profile', icon: <UserIcon size={20} /> },
];

export const Navigation = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();

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
            <span className={styles.label}>{t(item.labelKey)}</span>
          </Link>
        ))}
      </div>

      <div className={styles.userSection}>
        <LanguageSwitcher />
        {session?.user?.name && (
          <span className={styles.userName}>{session.user.name}</span>
        )}
      </div>
    </nav>
  );
};

Navigation.displayName = 'Navigation';