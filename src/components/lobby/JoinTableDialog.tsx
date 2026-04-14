'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, useToast, Skeleton } from '@/components/ui';
import styles from './JoinTableDialog.module.css';

interface Agent {
  id: number;
  name: string;
}

interface JoinTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  onSuccess?: () => void;
}

export const JoinTableDialog = ({ isOpen, onClose, tableId, onSuccess }: JoinTableDialogProps) => {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data);
      if (data.length > 0) {
        setSelectedAgent(data[0].id);
      }
    } catch (error: any) {
      addToast('Failed to load agents', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedAgent || selectedSeat === null) {
      addToast('Please select an agent and a seat', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          seatNumber: selectedSeat,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to join table');
      }

      addToast('Joined table successfully', 'success');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      addToast(error.message || 'Failed to join table', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Join Table" size="md">
        <div className={styles.skeleton}>
          <Skeleton width="100%" height="40px" />
          <Skeleton width="100%" height="40px" />
          <Skeleton width="100%" height="100px" />
        </div>
      </Modal>
    );
  }

  if (agents.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Join Table" size="md">
        <div className={styles.empty}>
          <p>You have no agents to join with.</p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join Table" size="md">
      <div className={styles.content}>
        <div className={styles.section}>
          <label className={styles.label}>Select Agent</label>
          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(parseInt(e.target.value, 10))}
            className={styles.select}
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Select Seat (1-9)</label>
          <div className={styles.seatGrid}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map(seat => (
              <button
                key={seat}
                className={`${styles.seat} ${selectedSeat === seat ? styles.selected : ''}`}
                onClick={() => setSelectedSeat(seat)}
              >
                {seat}
              </button>
            ))}
          </div>
        </div>

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
            onClick={handleJoin}
            loading={loading}
            fullWidth
          >
            Join Table
          </Button>
        </div>
      </div>
    </Modal>
  );
};
