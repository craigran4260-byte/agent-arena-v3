'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ChatMessage } from '@/hooks/useChat';
import { ChatIcon } from '@/components/icons/ChatIcon';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
  error?: string | null;
  disabled?: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isConnected,
  error,
  disabled = false
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || disabled) return;

    try {
      setSending(true);
      await onSendMessage(input);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <ChatIcon size={20} className={styles.icon} />
        <h3>Chat</h3>
        <div className={styles.status}>
          <div className={`${styles.indicator} ${isConnected ? styles.connected : styles.disconnected}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={styles.message}>
                <span className={styles.userName}>{msg.userName}</span>
                <span className={styles.content}>{msg.content}</span>
                <span className={styles.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorMsg}>
          <p>{error}</p>
        </div>
      )}

      {/* Input */}
      <div className={styles.input}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message... (Shift+Enter for new line)"
          disabled={disabled || !isConnected || sending}
          rows={2}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          loading={sending}
          disabled={disabled || !isConnected || !input.trim()}
          fullWidth
        >
          Send
        </Button>
      </div>
    </div>
  );
}
