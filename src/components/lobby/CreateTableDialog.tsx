'use client';

import { useState } from 'react';
import { Modal, Input, Button, useToast } from '@/components/ui';
import styles from './CreateTableDialog.module.css';

interface CreateTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTableDialog = ({ isOpen, onClose, onSuccess }: CreateTableDialogProps) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    buyIn: '1000',
    maxPlayers: '6',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      addToast('Table name is required', 'error');
      return;
    }

    const buyIn = parseInt(formData.buyIn, 10);
    const maxPlayers = parseInt(formData.maxPlayers, 10);

    if (buyIn < 100 || buyIn > 100000) {
      addToast('Buy-in must be between 100 and 100,000', 'error');
      return;
    }

    if (maxPlayers < 2 || maxPlayers > 9) {
      addToast('Max players must be between 2 and 9', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          buyIn,
          maxPlayers,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create table');
      }

      addToast('Table created successfully', 'success');
      setFormData({ name: '', buyIn: '1000', maxPlayers: '6' });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      addToast(error.message || 'Failed to create table', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Table"
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Table Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., High Stakes Table"
          maxLength={64}
        />

        <Input
          label="Buy-in (chips)"
          name="buyIn"
          type="number"
          value={formData.buyIn}
          onChange={handleChange}
          min="100"
          max="100000"
          step="100"
        />

        <Input
          label="Max Players"
          name="maxPlayers"
          type="number"
          value={formData.maxPlayers}
          onChange={handleChange}
          min="2"
          max="9"
        />

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={onClose}
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
            Create Table
          </Button>
        </div>
      </form>
    </Modal>
  );
};
