'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogoIcon } from '@/components/icons';
import { Button, Input, Card, useToast } from '@/components/ui';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

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
        addToast('Logged in successfully!', 'success');
        router.push('/dashboard');
      }
    } catch (error) {
      addToast('Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = searchParams?.get('error');

  return (
    <Card variant="glass" padding="lg" className={styles.card}>
      <div className={styles.header}>
        <LogoIcon size={40} color="var(--gold-primary)" />
        <h1 className={styles.title}>Agent Arena</h1>
      </div>

      <p className={styles.subtitle}>Sign in to your account</p>

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
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
          <span>Remember me</span>
        </label>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Sign In
        </Button>
      </form>

      <p className={styles.footer}>
        Don't have an account?{' '}
        <Link href="/register" className={styles.link}>
          Create one
        </Link>
      </p>
    </Card>
  );
}
