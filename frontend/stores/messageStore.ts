import { create } from 'zustand';
import type { Message, Receipt, ReactionGroup } from '@/lib/types';
import * as api from '@/lib/api';
import { useAuthStore } from './authStore';

interface MessageState {
  messagesByConv: Record<number, Message[]>;
  typingUsers: Record<number, Set<number>>;
  onlineUsers: Set<number>;
  loadingByConv: Record<number, boolean>;

  loadMessages: (convId: number) => Promise<void>;
  loadOlderMessages: (convId: number) => Promise<boolean>;
  addMessage: (message: Message) => void;
  updateReceipt: (messageId: number, userId: number, status: Receipt['status']) => void;
  setTyping: (convId: number, userId: number, isTyping: boolean) => void;
  setPresence: (userId: number, status: 'online' | 'offline') => void;
  updateReactions: (messageId: number, convId: number, reactions: ReactionGroup[]) => void;
  optimisticallySendMessage: (convId: number, content: string, replyTo?: number, attachmentId?: number, expiresInSeconds?: number) => number;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByConv: {},
  typingUsers: {},
  onlineUsers: new Set(),
  loadingByConv: {},

  loadMessages: async (convId) => {
    set((s) => ({ loadingByConv: { ...s.loadingByConv, [convId]: true } }));
    try {
      const messages = await api.getMessages(convId);
      set((s) => ({
        messagesByConv: { ...s.messagesByConv, [convId]: messages },
        loadingByConv: { ...s.loadingByConv, [convId]: false },
      }));
    } catch {
      set((s) => ({ loadingByConv: { ...s.loadingByConv, [convId]: false } }));
    }
  },

  loadOlderMessages: async (convId) => {
    const messages = get().messagesByConv[convId] || [];
    if (messages.length === 0) return false;
    const oldestId = messages[0].id;
    try {
      const older = await api.getMessages(convId, 50, oldestId);
      if (older.length === 0) return false;
      set((s) => ({
        messagesByConv: {
          ...s.messagesByConv,
          [convId]: [...older, ...s.messagesByConv[convId]],
        },
      }));
      return true;
    } catch {
      return false;
    }
  },

  addMessage: (message) => {
    const convId = message.conversation_id;
    const existing = get().messagesByConv[convId] || [];
    if (existing.some((m) => m.id === message.id)) return;
    const filtered = existing.filter(
      (m) => !(m.id < 0 && m.sender_id === message.sender_id && m.content === message.content)
    );
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [convId]: [...filtered, message],
      },
    }));
  },

  updateReceipt: (messageId, userId, status) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (userId === currentUserId) return;
    const convs = get().messagesByConv;
    for (const [convIdStr, messages] of Object.entries(convs)) {
      const convId = Number(convIdStr);
      const msg = messages.find((m) => m.id === messageId);
      if (msg) {
        const updated = messages.map((m) => {
          if (m.id !== messageId) return m;
          const receipts = m.receipts.map((r) =>
            r.user_id === userId ? { ...r, status } : r
          );
          const bestStatus = getBestStatus(receipts);
          return { ...m, receipts, status: bestStatus };
        });
        set((s) => ({
          messagesByConv: { ...s.messagesByConv, [convId]: updated },
        }));
        break;
      }
    }
  },

  setTyping: (convId, userId, isTyping) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (userId === currentUserId) return;
    set((s) => {
      const current = new Set(s.typingUsers[convId] || []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      return { typingUsers: { ...s.typingUsers, [convId]: current } };
    });
  },

  setPresence: (userId, status) => {
    set((s) => {
      const next = new Set(s.onlineUsers);
      if (status === 'online') next.add(userId);
      else next.delete(userId);
      return { onlineUsers: next };
    });
  },

  updateReactions: (messageId, convId, reactions) => {
    const messages = get().messagesByConv[convId] || [];
    const updated = messages.map((m) =>
      m.id === messageId ? { ...m, reactions } : m
    );
    set((s) => ({
      messagesByConv: { ...s.messagesByConv, [convId]: updated },
    }));
  },

  optimisticallySendMessage: (convId, content, replyTo, attachmentId, expiresInSeconds) => {
    const user = useAuthStore.getState().user;
    if (!user) return -1;
    const tempId = -Date.now();
    const msg: Message = {
      id: tempId,
      conversation_id: convId,
      sender_id: user.id,
      sender_name: user.display_name,
      content,
      created_at: new Date().toISOString(),
      reply_to: replyTo,
      expires_at: expiresInSeconds
        ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
        : undefined,
      receipts: [],
      status: 'sending',
    };
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [convId]: [...(s.messagesByConv[convId] || []), msg],
      },
    }));
    return tempId;
  },
}));

function getBestStatus(receipts: Receipt[]): Message['status'] {
  if (receipts.length === 0) return 'sent';
  const statuses = receipts.map((r) => r.status);
  if (statuses.every((s) => s === 'read')) return 'read';
  if (statuses.some((s) => s === 'delivered')) return 'delivered';
  return 'sent';
}
