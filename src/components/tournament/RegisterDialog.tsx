'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './RegisterDialog.module.css';

interface Agent {
  id: number;
  name: string;
}

interface RegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: number;
  onRegister: (agentId: number) => Promise<void>;
}

export function RegisterDialog({ isOpen, onClose, tournamentId, onRegister }: RegisterDialogProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadAgents = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Failed to load agents');

        const data = await response.json();
        setAgents(data.data || data);
        if (data.data?.length > 0 || data.length > 0) {
          const firstAgent = data.data?.[0] || data[0];
          setSelectedAgentId(firstAgent.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
  }, [isOpen]);

  const handleRegister = async () => {
    if (!selectedAgentId) {
      setError('Please select an agent');
      return;
    }

    try {
      setRegistering(true);
      setError(null);
      await onRegister(selectedAgentId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register for Tournament">
      <div className={styles.dialog}>
        {loading ? (
          <div className={styles.loading}>
            <Skeleton width="100%" height={40} variant="rect" count={3} />
          </div>
        ) : agents.length === 0 ? (
          <div className={styles.empty}>
            <p>You don't have any agents yet.</p>
            <p>Create an agent first to register for tournaments.</p>
          </div>
        ) : (
          <>
            <div className={styles.agentList}>
              <label className={styles.label}>Select Agent</label>
              <div className={styles.options}>
                {agents.map((agent) => (
                  <label key={agent.id} className={styles.option}>
                    <input
                      type="radio"
                      name="agent"
                      value={agent.id}
                      checked={selectedAgentId === agent.id}
                      onChange={() => setSelectedAgentId(agent.id)}
                    />
                    <span>{agent.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <p>{error}</p>
              </div>
            )}

            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose} disabled={registering}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRegister}
                loading={registering}
                disabled={!selectedAgentId}
              >
                Register Agent
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
