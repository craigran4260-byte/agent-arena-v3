'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: string;
  userId: number;
  userName: string;
  tableId: number;
  content: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  isConnected: boolean;
  error: string | null;
}

export function useChat(tableId: number) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isConnected: false,
    error: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const messageBufferRef = useRef<ChatMessage[]>([]);

  // Connect to chat stream
  useEffect(() => {
    if (!tableId) return;

    const connectToChat = async () => {
      try {
        setState(prev => ({ ...prev, error: null }));

        const eventSource = new EventSource(`/api/tables/${tableId}/chat`);

        eventSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'history') {
              // Initial history load
              messageBufferRef.current = data.messages || [];
              setState(prev => ({
                ...prev,
                messages: data.messages || [],
                isConnected: true
              }));
            } else if (data.type === 'message') {
              // New message received
              const message = data.message as ChatMessage;
              setState(prev => ({
                ...prev,
                messages: [...prev.messages, message]
              }));
              messageBufferRef.current.push(message);
            }
          } catch (error) {
            console.error('Failed to parse chat data:', error);
          }
        });

        eventSource.addEventListener('error', () => {
          setState(prev => ({
            ...prev,
            isConnected: false,
            error: 'Connection lost'
          }));
          eventSource.close();
          eventSourceRef.current = null;
        });

        eventSourceRef.current = eventSource;
      } catch (error) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }));
      }
    };

    connectToChat();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [tableId]);

  // Send message
  const sendMessage = useCallback(
    async (content: string): Promise<ChatMessage> => {
      if (!tableId) {
        throw new Error('Table ID not set');
      }

      if (!content.trim()) {
        throw new Error('Message cannot be empty');
      }

      try {
        const response = await fetch(`/api/tables/${tableId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        }

        const message = await response.json() as ChatMessage;
        return message;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
        setState(prev => ({ ...prev, error: errorMsg }));
        throw error;
      }
    },
    [tableId]
  );

  // Clear messages
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: []
    }));
    messageBufferRef.current = [];
  }, []);

  // Get recent messages (for overlay)
  const getRecentMessages = useCallback((count: number = 10): ChatMessage[] => {
    return state.messages.slice(-count);
  }, [state.messages]);

  return {
    messages: state.messages,
    isConnected: state.isConnected,
    error: state.error,
    sendMessage,
    clearMessages,
    getRecentMessages
  };
}
