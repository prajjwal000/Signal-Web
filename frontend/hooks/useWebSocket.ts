'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useMessageStore } from '@/stores/messageStore';
import type { WSOutbound } from '@/lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket(token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [connected, setConnected] = useState(false);

  const addMessage = useMessageStore((s) => s.addMessage);
  const updateReceipt = useMessageStore((s) => s.updateReceipt);
  const setTyping = useMessageStore((s) => s.setTyping);
  const setPresence = useMessageStore((s) => s.setPresence);

  const updateConversationLastMessage = useConversationStore(
    (s) => s.updateLastMessage
  );

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const send = useCallback((event: WSOutbound) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
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
            case 'message':
              addMessage(data.message);
              updateConversationLastMessage(
                data.message.conversation_id,
                data.message.content,
                data.message.created_at
              );
              break;

            case 'receipt':
              updateReceipt(data.message_id, data.user_id, data.status);
              break;

            case 'typing':
              setTyping(data.conversation_id, data.user_id, data.is_typing);
              break;

            case 'presence':
              setPresence(data.user_id, data.status);
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
  }, [token, addMessage, updateReceipt, setTyping, setPresence, updateConversationLastMessage]);

  return { connected, send, disconnect };
}
