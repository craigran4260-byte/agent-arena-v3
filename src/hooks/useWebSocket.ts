'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'table_update' | 'player_action' | 'hand_complete' | 'error';
  tableId?: number;
  data?: any;
  timestamp?: number;
}

interface UseWebSocketOptions {
  tableId?: number;
  autoSubscribe?: boolean;
  onMessage?: (message: WSMessage) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface WebSocketState {
  connected: boolean;
  error: string | null;
  lastMessage: WSMessage | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): {
  state: WebSocketState;
  subscribe: (tableId: number) => void;
  unsubscribe: (tableId: number) => void;
  sendMessage: (message: WSMessage) => void;
  disconnect: () => void;
} {
  const {
    tableId,
    autoSubscribe = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  const [state, setState] = useState<WebSocketState>({
    connected: false,
    error: null,
    lastMessage: null,
  });

  const connect = useCallback(() => {
    // Determine WebSocket URL based on environment
    const wsUrl = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws';

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS Hook] Connected');
        reconnectAttemptsRef.current = 0;
        setState({ connected: true, error: null, lastMessage: null });

        // Auto-subscribe to table if provided
        if (tableId && autoSubscribe) {
          ws.send(JSON.stringify({ type: 'subscribe', tableId }));
        }

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: message }));
          onMessage?.(message);
        } catch (err) {
          console.error('[WS Hook] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS Hook] Error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket error' }));
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('[WS Hook] Disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, connected: false }));
        wsRef.current = null;
        onDisconnect?.();

        // Auto-reconnect with exponential backoff (max 5 attempts)
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS Hook] Failed to connect:', err);
      setState({ connected: false, error: 'Failed to connect', lastMessage: null });
    }
  }, [tableId, autoSubscribe, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setState({ connected: false, error: null, lastMessage: null });
  }, []);

  const subscribe = useCallback((subscribeTableId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', tableId: subscribeTableId }));
    }
  }, []);

  const unsubscribe = useCallback((unsubscribeTableId: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', tableId: unsubscribeTableId }));
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Re-subscribe when tableId changes
  useEffect(() => {
    if (state.connected && tableId && autoSubscribe) {
      subscribe(tableId);
    }
  }, [tableId, state.connected, autoSubscribe, subscribe]);

  return {
    state,
    subscribe,
    unsubscribe,
    sendMessage,
    disconnect,
  };
}

// Export type for use in components
export type { WSMessage, WebSocketState };