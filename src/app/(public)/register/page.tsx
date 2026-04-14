'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogoIcon } from '@/components/icons';
import { Button, Input, Card, useToast } from '@/components/ui';
import styles from './page.module.css';

interface PasswordStrength {
  level: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels: Array<'weak' | 'fair' | 'good' | 'strong'> = ['weak', 'weak', 'fair', 'good', 'good', 'strong', 'strong'];
  return { level: levels[score] || 'weak', score };
};

export default function RegisterPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = getPasswordStrength(formData.password);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Name is required';
    else if (formData.name.length > 64) newErrors.name = 'Name must be 64 characters or less';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || 'Registration failed', 'error');
        return;
      }

      addToast('Account created! Logging in...', 'success');

      // Auto sign in
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      addToast('Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Card variant="default" padding="lg" className={styles.card}>
        <div className={styles.header}>
          <LogoIcon size={40} color="#FFD700" />
          <h1 className={styles.title}>NEW PLAYER</h1>
        </div>

        <p className={styles.subtitle}>CREATE YOUR PROFILE</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="NAME"
            placeholder="Player One"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            autoComplete="name"
          />

          <Input
            label="EMAIL"
            type="email"
            placeholder="player@arena.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            autoComplete="email"
          />

          <div className={styles.passwordField}>
            <Input
              label="PASSWORD"
              type="password"
              placeholder="********"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              autoComplete="new-password"
            />
            {formData.password && (
              <div className={styles.strengthMeter}>
                <div className={`${styles.bar} ${styles[passwordStrength.level]}`} />
                <span className={styles.label}>{passwordStrength.level}</span>
              </div>
            )}
          </div>

          <Input
            label="CONFIRM"
            type="password"
            placeholder="********"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            CREATE PLAYER
          </Button>
        </form>

        <p className={styles.footer}>
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link href="/login" className={styles.link}>
            SIGN IN
          </Link>
        </p>
      </Card>
    </div>
  );
}