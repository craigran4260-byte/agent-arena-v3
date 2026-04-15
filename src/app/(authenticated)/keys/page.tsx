'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout';
import { Button, Skeleton, Badge, Modal, useToast } from '@/components/ui';
import { ShieldIcon, KeyIcon, CopyIcon, TrashIcon } from '@/components/icons';
import { useTranslation } from '@/contexts/LanguageContext';
import styles from './page.module.css';

interface ApiKey {
  id: number;
  userId: number;
  agentId: number | null;
  keyPrefix: string;
  name: string | null;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

interface KeyCounts {
  total: number;
  active: number;
  revoked: number;
}

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [counts, setCounts] = useState<KeyCounts>({ total: 0, active: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys');
      if (!res.ok) throw new Error('Failed to fetch keys');
      const data = await res.json();
      setKeys(data.keys);
      setCounts(data.counts);
    } catch (error) {
      addToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    if (session?.user) {
      fetchKeys();
    }
  }, [session, fetchKeys]);

  const handleCreateKey = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create key');
      }

      const data = await res.json();
      setCreatedKey(data.fullKey);
      setKeys(prev => [...prev, data.key]);
      setCounts(prev => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }));
      addToast(t('common.success'), 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('common.error'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: number) => {
    try {
      const res = await fetch(`/api/keys/${keyId}/revoke`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error('Failed to revoke key');

      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, revoked: true } : k));
      setCounts(prev => ({ ...prev, active: prev.active - 1, revoked: prev.revoked + 1 }));
      addToast(t('common.success'), 'success');
    } catch (error) {
      addToast(t('common.error'), 'error');
    }
  };

  const handleDeleteKey = async (keyId: number) => {
    try {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete key');

      setKeys(prev => prev.filter(k => k.id !== keyId));
      setCounts(prev => ({ ...prev, total: prev.total - 1 }));
      addToast(t('common.success'), 'success');
    } catch (error) {
      addToast(t('common.error'), 'error');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(t('keys.copied'), 'success');
    } catch {
      addToast(t('common.error'), 'error');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const permissionLabels: Record<string, string> = {
    read: 'Read',
    write: 'Write',
    admin: 'Admin',
    agent_play: 'Agent Play'
  };

  return (
    <>
      <Header
        title={t('keys.title')}
        subtitle={t('keys.subtitle')}
        showBackButton
      />

      <div className={styles.container}>
        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <KeyIcon size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{counts.total}</div>
              <div className={styles.statLabel}>{t('keys.table.name')}</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <ShieldIcon size={24} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{counts.active}</div>
              <div className={styles.statLabel}>{t('agents.status.active')}</div>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className={styles.actionsBar}>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            disabled={creating}
          >
            + {t('keys.createKey')}
          </Button>
        </div>

        {/* Keys List */}
        <div className={styles.keysList}>
          {loading ? (
            <>
              <Skeleton width="100%" height="80px" variant="rect" />
              <Skeleton width="100%" height="80px" variant="rect" />
              <Skeleton width="100%" height="80px" variant="rect" />
            </>
          ) : keys.length === 0 ? (
            <div className={styles.emptyState}>
              <KeyIcon size={48} />
              <h3>{t('keys.noKeys')}</h3>
              <p>{t('keys.createFirst')}</p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                {t('keys.createKey')}
              </Button>
            </div>
          ) : (
            keys.map(key => (
              <div key={key.id} className={`${styles.keyCard} ${key.revoked ? styles.revoked : ''}`}>
                <div className={styles.keyHeader}>
                  <div className={styles.keyPrefix}>{key.keyPrefix}</div>
                  {key.revoked && <Badge variant="error">Revoked</Badge>}
                  {!key.revoked && key.expiresAt && new Date(key.expiresAt) < new Date() && (
                    <Badge variant="warning">Expired</Badge>
                  )}
                  {!key.revoked && key.expiresAt && new Date(key.expiresAt) > new Date() && (
                    <Badge variant="info">Expires: {formatDate(key.expiresAt)}</Badge>
                  )}
                </div>

                <div className={styles.keyDetails}>
                  <div className={styles.keyName}>
                    {key.name || 'Unnamed Key'}
                  </div>
                  <div className={styles.keyPermissions}>
                    {key.permissions.map(p => (
                      <Badge key={p} variant="default" size="sm">
                        {permissionLabels[p] || p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className={styles.keyMeta}>
                  <span>{t('agents.table.created')}: {formatDate(key.createdAt)}</span>
                  <span>{t('keys.table.lastUsed')}: {formatDate(key.lastUsedAt)}</span>
                </div>

                <div className={styles.keyActions}>
                  {!key.revoked && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRevokeKey(key.id)}
                    >
                      {t('keys.revoke')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <TrashIcon size={16} />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewKeyName('');
          setNewKeyPermissions(['read']);
          setCreatedKey(null);
        }}
        title={t('keys.createKey')}
      >
        {createdKey ? (
          <div className={styles.createdKeySection}>
            <div className={styles.successMessage}>
              <ShieldIcon size={32} />
              <h4>{t('common.success')}</h4>
              <p>Save this key now - it will not be shown again.</p>
            </div>
            <div className={styles.createdKeyBox}>
              <code>{createdKey}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(createdKey)}
              >
                <CopyIcon size={16} />
              </Button>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowCreateModal(false);
                setCreatedKey(null);
                setNewKeyName('');
                setNewKeyPermissions(['read']);
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <div className={styles.createForm}>
            <div className={styles.formGroup}>
              <label htmlFor="keyName">{t('keys.form.name')} (optional)</label>
              <input
                id="keyName"
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t('keys.form.namePlaceholder')}
                maxLength={64}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Permissions</label>
              <div className={styles.permissionOptions}>
                {['read', 'write', 'agent_play'].map(p => (
                  <label key={p} className={styles.permissionCheckbox}>
                    <input
                      type="checkbox"
                      checked={newKeyPermissions.includes(p)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyPermissions(prev => [...prev, p]);
                        } else {
                          setNewKeyPermissions(prev => prev.filter(x => x !== p));
                        }
                      }}
                    />
                    <span>{permissionLabels[p]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateKey}
                loading={creating}
              >
                {t('keys.form.create')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}