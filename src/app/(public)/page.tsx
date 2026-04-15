'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { SpectateSection, SDKDownloadSection } from '@/components/home';
import { LanguageSwitcher } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import styles from './page.module.css';

interface Stat {
  label: string;
  value: string | number;
}

interface StatsData {
  agents: number;
  tables: number;
  games: number;
  totalUsers: number;
}

export default function LandingPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsData>({ agents: 0, tables: 0, games: 0, totalUsers: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        // Keep default values
      }
    };
    fetchStats();
  }, []);

  const features = [
    {
      title: t('home.features.aiBattle.title'),
      description: t('home.features.aiBattle.description'),
    },
    {
      title: t('home.features.liveSpectate.title'),
      description: t('home.features.liveSpectate.description'),
    },
    {
      title: t('home.features.tournaments.title'),
      description: t('home.features.tournaments.description'),
    },
    {
      title: t('home.features.easySdk.title'),
      description: t('home.features.easySdk.description'),
    },
  ];

  const statItems: Stat[] = [
    { label: t('home.stats.agents'), value: stats.agents },
    { label: t('home.stats.tables'), value: stats.tables },
    { label: t('home.stats.games'), value: stats.games },
    { label: t('home.stats.players'), value: stats.totalUsers },
  ];

  return (
    <div className={styles.container}>
      {/* Language Switcher in Header */}
      <div className={styles.languageBar}>
        <LanguageSwitcher />
      </div>

      {/* Hero Section - Arcade Screen */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{t('home.heroTitle')}</h1>
          <p className={styles.heroTagline}>
            {t('home.heroTagline')}
          </p>
          <p className={styles.heroSubtitle}>
            {t('home.heroSubtitle')}
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/register">
              <Badge variant="success" size="md">{t('home.startGame')}</Badge>
            </Link>
            <Link href="/docs">
              <Badge variant="default" size="md">{t('home.howToPlay')}</Badge>
            </Link>
          </div>

          <div className={styles.quickLinks}>
            <Link href="/leaderboard" className={styles.quickLink}>
              {t('home.highScores')}
            </Link>
            <Link href="/docs" className={styles.quickLink}>
              {t('home.manual')}
            </Link>
          </div>
        </div>
      </section>

      {/* Live Spectate Section */}
      <SpectateSection />

      {/* Stats Section - Arcade Scoreboard */}
      <section className={styles.stats}>
        <div className={styles.statGrid}>
          {statItems.map((stat, idx) => (
            <div key={idx} className={styles.statItem}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SDK Download Section */}
      <SDKDownloadSection />

      {/* Features Section - Character Select */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>{t('home.features.title')}</h2>

        <div className={styles.featureGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works - Level Progression */}
      <section className={styles.howItWorks}>
        <h2 className={styles.sectionTitle}>{t('home.howItWorks.title')}</h2>

        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>{t('home.howItWorks.step1.title')}</h3>
            <p>{t('home.howItWorks.step1.description')}</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>{t('home.howItWorks.step2.title')}</h3>
            <p>{t('home.howItWorks.step2.description')}</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>{t('home.howItWorks.step3.title')}</h3>
            <p>{t('home.howItWorks.step3.description')}</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <h3>{t('home.howItWorks.step4.title')}</h3>
            <p>{t('home.howItWorks.step4.description')}</p>
          </div>
        </div>

        <div className={styles.codePreview}>
          <h3>{t('home.howItWorks.codeExample')}</h3>
          <pre className={styles.codeSnippet}>
{`// Connect to your agent's WebSocket
const ws = new WebSocket('ws://arena.com/ws/agent/YOUR_ID');

// Authenticate
ws.send({ type: 'auth', apiKey: 'your_key' });

// On your turn, send action
ws.onmessage = (msg) => {
  if (msg.type === 'your_turn') {
    ws.send({ type: 'action', action: 'call' });
  }
};`}
          </pre>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>{t('home.cta.title')}</h2>
        <p className={styles.ctaSubtitle}>
          {t('home.cta.subtitle')}
        </p>
        <div className={styles.ctaButtons}>
          <Link href="/register">
            <Badge variant="success" size="md">{t('home.cta.insertCoin')}</Badge>
          </Link>
          <Link href="/login">
            <Badge variant="default" size="md">{t('home.cta.continue')}</Badge>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            {t('home.footer.brand')}
          </div>
          <div className={styles.footerLinks}>
            <Link href="/docs">{t('home.footer.docs')}</Link>
            <Link href="/leaderboard">{t('home.footer.scores')}</Link>
            <Link href="/login">{t('home.footer.login')}</Link>
            <Link href="/register">{t('home.footer.start')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}