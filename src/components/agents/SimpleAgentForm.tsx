'use client';

import { useState } from 'react';
import { Button, Input, useToast, Badge } from '@/components/ui';
import { CopyIcon, KeyIcon } from '@/components/icons';
import styles from './SimpleAgentForm.module.css';

export interface SimpleAgentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SimpleAgentForm = ({ onSuccess, onCancel }: SimpleAgentFormProps) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<{
    id: number;
    name: string;
    wsEndpoint: string;
    apiKey: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (formData.name.length > 64) {
      newErrors.name = 'Name must be 64 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create agent with auto-generated WS endpoint and API key
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          connectionType: 'websocket', // New field
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || 'Failed to create agent', 'error');
        return;
      }

      const agentData = await res.json();

      // Generate WebSocket endpoint for this agent
      const wsEndpoint = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/ws/agent/${agentData.id}`;

      setCreatedAgent({
        id: agentData.id,
        name: formData.name,
        wsEndpoint,
        apiKey: agentData.apiKey || `aa_live_${agentData.id}_auto`,
      });

      addToast('Agent created successfully!', 'success');
    } catch (error) {
      addToast('Failed to create agent', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied!`, 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  if (createdAgent) {
    return (
      <div className={styles.successSection}>
        <div className={styles.successHeader}>
          <div className={styles.successIcon}>🎉</div>
          <h3>Agent Created!</h3>
          <p className={styles.agentName}>{createdAgent.name}</p>
        </div>

        <div className={styles.connectionInfo}>
          <h4>Quick Start - WebSocket Connection</h4>
          <p className={styles.infoText}>
            Your agent can connect directly via WebSocket. No HTTP API needed!
          </p>

          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <Badge variant="info">WebSocket Endpoint</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(createdAgent.wsEndpoint, 'WebSocket URL')}
              >
                <CopyIcon size={16} />
              </Button>
            </div>
            <code>{createdAgent.wsEndpoint}</code>
          </div>

          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <Badge variant="success">API Key (for auth)</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(createdAgent.apiKey, 'API Key')}
              >
                <CopyIcon size={16} />
              </Button>
            </div>
            <code>{createdAgent.apiKey}</code>
          </div>

          <div className={styles.exampleCode}>
            <h4>Example Connection Code</h4>
            <pre className={styles.codeSnippet}>{`
// JavaScript/Node.js
const ws = new WebSocket('${createdAgent.wsEndpoint}');

ws.onopen = () => {
  // Send auth message
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: '${createdAgent.apiKey}'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // Handle game events: game_state, your_turn, etc.
  if (msg.type === 'your_turn') {
    // Send your action
    ws.send(JSON.stringify({
      type: 'action',
      action: 'call', // fold, check, call, raise, all_in
      amount: 100
    }));
  }
};
`}</pre>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="primary" fullWidth onClick={onSuccess}>
            Done
          </Button>
          <Button variant="secondary" fullWidth onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formHeader}>
        <KeyIcon size={24} className={styles.headerIcon} />
        <h3>Create Your Agent</h3>
        <p className={styles.formSubtitle}>
          Simple WebSocket connection - no complex API setup needed
        </p>
      </div>

      <Input
        label="Agent Name"
        placeholder="My Poker Agent"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
      />

      <Input
        label="Description (optional)"
        placeholder="A brief description of your agent"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      <div className={styles.infoBox}>
        <h4>How It Works</h4>
        <ul>
          <li>We generate a WebSocket endpoint for you</li>
          <li>Your agent connects and receives game events</li>
          <li>Respond with poker actions (fold, check, call, raise)</li>
          <li>No HTTP endpoints or API tokens to configure!</li>
        </ul>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          Create Agent
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

SimpleAgentForm.displayName = 'SimpleAgentForm';