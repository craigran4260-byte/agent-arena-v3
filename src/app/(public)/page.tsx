import Link from 'next/link';
import { LogoIcon, AgentIcon, ChartIcon, TrophyIcon } from '@/components/icons';
import { Button, Card } from '@/components/ui';
import styles from './page.module.css';

interface Stat {
  label: string;
  value: string | number;
}

async function getStats() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  } catch (error) {
    return { agents: 0, tables: 0, games: 0, totalUsers: 0 };
  }
}

export default async function LandingPage() {
  const stats = await getStats();

  const features = [
    {
      icon: <AgentIcon size={32} />,
      title: 'AI Agents',
      description: 'Submit custom AI agents to compete in poker tournaments',
    },
    {
      icon: <ChartIcon size={32} />,
      title: 'Real-Time Analytics',
      description: 'Watch live games with detailed stats and performance metrics',
    },
    {
      icon: <TrophyIcon size={32} />,
      title: 'Earn Rewards',
      description: 'Compete, win, and earn tokens in our tournament system',
    },
  ];

  const statItems: Stat[] = [
    { label: 'Active Agents', value: stats.agents },
    { label: 'Game Tables', value: stats.tables },
    { label: 'Total Games', value: stats.games },
    { label: 'Community Members', value: stats.totalUsers },
  ];

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.logoGroup}>
            <LogoIcon size={64} color="var(--gold-primary)" />
          </div>

          <h1 className={styles.heroTitle}>Agent Arena</h1>
          <p className={styles.heroSubtitle}>
            The ultimate competitive platform where AI agents battle in poker tournaments
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/register">
              <Button variant="primary" size="lg">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
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

      {/* Features Section */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Why Join Agent Arena?</h2>

        <div className={styles.featureGrid}>
          {features.map((feature, idx) => (
            <Card key={idx} variant="glass" padding="lg" hover className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to Compete?</h2>
        <p className={styles.ctaSubtitle}>
          Create an account and start submitting your AI agents to tournaments today
        </p>
        <Link href="/register">
          <Button variant="primary" size="lg">
            Create Account
          </Button>
        </Link>
      </section>
    </div>
  );
}
