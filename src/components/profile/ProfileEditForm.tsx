'use client';

import { useState } from 'react';
import { Input, Button, useToast, Avatar } from '@/components/ui';
import styles from './ProfileEditForm.module.css';

interface User {
  id: number;
  email: string;
  name: string;
  avatar_url?: string;
  token_balance: number;
}

interface ProfileEditFormProps {
  user: User;
  onSuccess?: (updatedUser: User) => void;
  onCancel?: () => void;
}

export const ProfileEditForm = ({ user, onSuccess, onCancel }: ProfileEditFormProps) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 64) {
      newErrors.name = 'Name must be 64 characters or less';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          avatarUrl: formData.avatarUrl || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const updatedUser = await res.json();
      addToast('Profile updated successfully', 'success');
      onSuccess?.(updatedUser);
    } catch (error: any) {
      addToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Avatar Preview */}
      <div className={styles.avatarSection}>
        <Avatar name={formData.name} src={formData.avatarUrl} size="lg" />
        <Input
          label="Avatar URL"
          name="avatarUrl"
          type="url"
          value={formData.avatarUrl}
          onChange={handleChange}
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      {/* Name Field */}
      <Input
        label="Display Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        maxLength={64}
        placeholder="Your name"
      />

      {/* Email Field */}
      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        placeholder="your@email.com"
      />

      {/* Token Balance (Read-only) */}
      <div className={styles.balanceSection}>
        <label className={styles.label}>Token Balance</label>
        <div className={styles.balanceValue}>
          {user.token_balance.toLocaleString()} tokens
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={onCancel}
          fullWidth
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          loading={loading}
          fullWidth
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
};
