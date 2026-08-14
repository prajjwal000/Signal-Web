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
const HEARTBEAT_INTERVAL = 25_000;   // send ping every 25s
const MAX_MISSED_PONGS = 3;          // close after 3 missed pongs
const MAX_PENDING_MESSAGES = 50;     // max queued offline messages
const MAX_PENDING_AGE_MS = 5 * 60_000; // discard pending messages older than 5 min

interface PendingMessage {
  event: WSOutbound;
  timestamp: number;
}

interface WebSocketContextValue {
  connected: boolean;
  send: (event: WSOutbound) => boolean;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  send: () => false,
  disconnect: () => {},
});

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>(null);
  const missedPongs = useRef(0);
  const [connected, setConnected] = useState(false);

  // Offline message queue — survives reconnections
  const pendingMessages = useRef<PendingMessage[]>([]);

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // Store callbacks in refs so the useEffect never re-runs due to reference changes
  const addMessageRef = useRef(useMessageStore.getState().addMessage);
  const updateReceiptRef = useRef(useMessageStore.getState().updateReceipt);
  const setTypingRef = useRef(useMessageStore.getState().setTyping);
  const setPresenceRef = useRef(useMessageStore.getState().setPresence);
  const updateReactionsRef = useRef(useMessageStore.getState().updateReactions);
  const updateConversationLastMessageRef = useRef(useConversationStore.getState().updateLastMessage);
  const incrementUnreadRef = useRef(useConversationStore.getState().incrementUnread);
  const updateUnreadRef = useRef(useConversationStore.getState().updateUnread);
  const loadConversationsRef = useRef(useConversationStore.getState().loadConversations);
  const addToastRef = useRef(useToastStore.getState().addToast);
  const userRef = useRef(user);

  // Keep refs in sync
  useEffect(() => {
    addMessageRef.current = useMessageStore.getState().addMessage;
    updateReceiptRef.current = useMessageStore.getState().updateReceipt;
    setTypingRef.current = useMessageStore.getState().setTyping;
    setPresenceRef.current = useMessageStore.getState().setPresence;
    updateReactionsRef.current = useMessageStore.getState().updateReactions;
    updateConversationLastMessageRef.current = useConversationStore.getState().updateLastMessage;
    incrementUnreadRef.current = useConversationStore.getState().incrementUnread;
    updateUnreadRef.current = useConversationStore.getState().updateUnread;
    loadConversationsRef.current = useConversationStore.getState().loadConversations;
    addToastRef.current = useToastStore.getState().addToast;
    userRef.current = user;
  });

  const send = useCallback((event: WSOutbound) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
      return true;
    }
    // Queue non-heartbeat messages for retry on reconnect
    if (event.type !== 'ping' && event.type !== 'typing') {
      const queue = pendingMessages.current;
      if (queue.length < MAX_PENDING_MESSAGES) {
        queue.push({ event, timestamp: Date.now() });
      }
    }
    return false;
  }, []);

  const flushPending = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    const queue = pendingMessages.current;
    // Discard stale messages
    pendingMessages.current = queue.filter(
      (m) => now - m.timestamp < MAX_PENDING_AGE_MS
    );

    for (const msg of pendingMessages.current.splice(0)) {
      try {
        ws.send(JSON.stringify(msg.event));
      } catch {
        // Put back on failure
        pendingMessages.current.push(msg);
        break;
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    missedPongs.current = 0;
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    function startHeartbeat() {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      missedPongs.current = 0;
      heartbeatTimer.current = setInterval(() => {
        missedPongs.current++;
        if (missedPongs.current >= MAX_MISSED_PONGS) {
          // Connection is dead — force reconnect
          wsRef.current?.close();
          return;
        }
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL);
    }

    function connect() {
      if (cancelled) return;
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

      ws.onopen = () => {
        if (cancelled) return;
        reconnectAttempts.current = 0;
        missedPongs.current = 0;
        setConnected(true);
        startHeartbeat();
        flushPending();
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'pong':
              missedPongs.current = 0;
              break;

            case 'message': {
              const msg = data.message;
              addMessageRef.current(msg);
              updateConversationLastMessageRef.current(
                msg.conversation_id,
                msg.content,
                msg.created_at
              );

              const convState = useConversationStore.getState();
              const activeConvId = convState.selectedConvId;
              const convExists = convState.conversations.some(c => c.id === msg.conversation_id);

              if (userRef.current && msg.sender_id !== userRef.current.id) {
                send({ type: 'receipt', message_id: msg.id, status: 'delivered' });

                if (activeConvId !== msg.conversation_id) {
                  incrementUnreadRef.current(msg.conversation_id);
                }
              }

              if (!convExists) {
                loadConversationsRef.current();
              }
              break;
            }

            case 'receipt':
              updateReceiptRef.current(data.message_id, data.user_id, data.status);
              break;

            case 'typing':
              setTypingRef.current(data.conversation_id, data.user_id, data.is_typing);
              break;

            case 'presence':
              setPresenceRef.current(data.user_id, data.status);
              break;

            case 'reaction':
              updateReactionsRef.current(data.message_id, data.conversation_id, data.reactions);
              break;

            case 'conversation_update':
              updateUnreadRef.current(data.conversation_id, data.unread_count);
              break;

            case 'user_search_results':
              window.dispatchEvent(new CustomEvent('ws:user_search_results', { detail: data }));
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
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
          addToastRef.current('Connection lost. Please refresh the page.', 'error');
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
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      missedPongs.current = 0;
      reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [token, send, flushPending]);

  return (
    <WebSocketContext.Provider value={{ connected, send, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}
