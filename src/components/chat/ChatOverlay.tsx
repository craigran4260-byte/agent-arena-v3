'use client';

import { useEffect, useState } from 'react';
import { ChatMessage } from '@/hooks/useChat';
import styles from './ChatOverlay.module.css';

interface ChatOverlayProps {
  messages: ChatMessage[];
  maxMessages?: number;
  speed?: 'slow' | 'normal' | 'fast';
}

interface DisplayMessage extends ChatMessage {
  displayId: string;
}

export function ChatOverlay({ messages, maxMessages = 20, speed = 'normal' }: ChatOverlayProps) {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);

  useEffect(() => {
    const recent = messages.slice(-maxMessages);
    const newMessages = recent.map((msg, index) => ({
      ...msg,
      displayId: `${msg.id}-${index}`
    }));
    setDisplayMessages(newMessages);

    // Remove messages after animation completes
    const timers = newMessages.map((msg, index) => {
      const duration = speed === 'slow' ? 10000 : speed === 'fast' ? 5000 : 7000;
      return setTimeout(() => {
        setDisplayMessages(prev =>
          prev.filter(m => m.displayId !== msg.displayId)
        );
      }, duration);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [messages, maxMessages, speed]);

  const speedClass = {
    slow: styles.slow,
    normal: styles.normal,
    fast: styles.fast
  }[speed];

  return (
    <div className={styles.overlay}>
      {displayMessages.map((message, index) => (
        <div
          key={message.displayId}
          className={`${styles.message} ${speedClass}`}
          style={{
            top: `${20 + (index * 40)}px`,
            animationDelay: '0s'
          }}
        >
          <span className={styles.userName}>{message.userName}:</span>
          <span className={styles.content}>{message.content}</span>
        </div>
      ))}
    </div>
  );
}
