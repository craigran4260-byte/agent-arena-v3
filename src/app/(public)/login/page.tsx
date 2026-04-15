'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogoIcon } from '@/components/icons';
import { Button, Input, Card, useToast, LanguageSwitcher } from '@/components/ui';
import { useTranslation } from '@/contexts/LanguageContext';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = t('login.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('login.errors.emailInvalid');
    }

    if (!formData.password) newErrors.password = t('login.errors.passwordRequired');
    else if (formData.password.length < 6) newErrors.password = t('login.errors.passwordShort');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        addToast(result.error, 'error');
        setErrors({ form: result.error });
      } else if (result?.ok) {
        addToast(t('login.success'), 'success');
        router.push('/dashboard');
      }
    } catch (error) {
      addToast(t('login.failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = searchParams?.get('error');

  return (
    <div className={styles.pageWrapper}>
      {/* Language Switcher */}
      <div className={styles.languageBar}>
        <LanguageSwitcher />
      </div>

      <Card variant="default" padding="lg" className={styles.card}>
        <div className={styles.header}>
          <LogoIcon size={40} color="#FFD700" />
          <h1 className={styles.title}>{t('login.title')}</h1>
        </div>

        <p className={styles.subtitle}>{t('login.subtitle')}</p>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label={t('login.email')}
            type="email"
            placeholder={t('login.emailPlaceholder')}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label={t('login.password')}
            type="password"
            placeholder={t('login.passwordPlaceholder')}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            autoComplete="current-password"
          />

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>{t('login.rememberMe')}</span>
          </label>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {t('login.startGame')}
          </Button>
        </form>

        <p className={styles.footer}>
          {t('login.noAccount')}{' '}
          <Link href="/register" className={styles.link}>
            {t('login.createOne')}
          </Link>
        </p>
      </Card>
    </div>
  );
}