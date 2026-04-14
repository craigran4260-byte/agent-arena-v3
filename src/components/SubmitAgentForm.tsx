'use client';

import { useState } from 'react';
import { Button, Input, useToast } from '@/components/ui';
import styles from './SubmitAgentForm.module.css';

export interface SubmitAgentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SubmitAgentForm = ({ onSuccess, onCancel }: SubmitAgentFormProps) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    apiEndpoint: '',
    apiToken: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Agent name is required';
    else if (formData.name.length > 64) newErrors.name = 'Name must be 64 characters or less';

    if (!formData.apiEndpoint) newErrors.apiEndpoint = 'API endpoint is required';
    else if (!formData.apiEndpoint.startsWith('http')) newErrors.apiEndpoint = 'Must be a valid URL';

    if (!formData.apiToken) newErrors.apiToken = 'API token is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || 'Failed to submit agent', 'error');
        return;
      }

      addToast('Agent submitted successfully!', 'success');
      setFormData({ name: '', apiEndpoint: '', apiToken: '' });
      onSuccess?.();
    } catch (error) {
      addToast('Failed to submit agent', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Agent Name"
        placeholder="My Smart Agent"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <Input
        label="API Endpoint"
        type="url"
        placeholder="https://your-api.com/agent"
        value={formData.apiEndpoint}
        onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
        error={errors.apiEndpoint}
      />

      <Input
        label="API Token"
        type="password"
        placeholder="••••••••••••••••"
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={errors.apiToken}
      />

      <div className={styles.actions}>
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          Submit Agent
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

SubmitAgentForm.displayName = 'SubmitAgentForm';
