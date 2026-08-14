'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useMessageStore } from '@/stores/messageStore';
import { useToastStore } from '@/hooks/useToast';
import type { WSOutbound } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface WebSocketContextValue {
  connected: boolean;
  send: (event: WSOutbound) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  send: () => {},
  disconnect: () => {},
});

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [connected, setConnected] = useState(false);

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const addMessage = useMessageStore((s) => s.addMessage);
  const updateReceipt = useMessageStore((s) => s.updateReceipt);
  const setTyping = useMessageStore((s) => s.setTyping);
  const setPresence = useMessageStore((s) => s.setPresence);
  const updateReactions = useMessageStore((s) => s.updateReactions);
  const updateConversationLastMessage = useConversationStore((s) => s.updateLastMessage);

  const addToast = useToastStore((s) => s.addToast);

  const send = useCallback((event: WSOutbound) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    function connect() {
      if (cancelled || wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

      ws.onopen = () => {
        if (cancelled) return;
        reconnectAttempts.current = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'message': {
              const msg = data.message;
              addMessage(msg);
              updateConversationLastMessage(
                msg.conversation_id,
                msg.content,
                msg.created_at
              );
              // Auto-send delivered receipt for messages from others
              if (user && msg.sender_id !== user.id) {
                send({ type: 'receipt', message_id: msg.id, status: 'delivered' });
              }
              break;
            }

            case 'receipt':
              updateReceipt(data.message_id, data.user_id, data.status);
              break;

            case 'typing':
              setTyping(data.conversation_id, data.user_id, data.is_typing);
              break;

            case 'presence':
              setPresence(data.user_id, data.status);
              break;

            case 'reaction':
              updateReactions(data.message_id, data.conversation_id, data.reactions);
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setConnected(false);
        if (
          !cancelled &&
          token &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, RECONNECT_DELAY * (reconnectAttempts.current + 1));
        } else if (!cancelled && reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          addToast('Connection lost. Please refresh the page.', 'error');
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [token, user, addMessage, updateReceipt, setTyping, setPresence, updateReactions, updateConversationLastMessage, send, addToast]);

  return (
    <WebSocketContext.Provider value={{ connected, send, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}
