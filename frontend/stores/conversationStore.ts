import { create } from 'zustand';
import type { Conversation } from '@/lib/types';
import * as api from '@/lib/api';

interface ConversationState {
  conversations: Conversation[];
  selectedConvId: number | null;
  loading: boolean;
  loadConversations: () => Promise<void>;
  selectConversation: (id: number | null) => void;
  updateLastMessage: (convId: number, content: string, updatedAt: string) => void;
  decrementUnread: (convId: number) => void;
  addConversation: (conv: Conversation) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  selectedConvId: null,
  loading: false,

  loadConversations: async () => {
    set({ loading: true });
    try {
      const convs = await api.getConversations();
      set({ conversations: convs, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectConversation: (id) => {
    set({ selectedConvId: id });
    // Reset unread count locally
    if (id !== null) {
      const convs = get().conversations.map((c) =>
        c.id === id ? { ...c, unread_count: 0 } : c
      );
      set({ conversations: convs });
    }
  },

  updateLastMessage: (convId, content, updatedAt) => {
    const convs = get().conversations.map((c) =>
      c.id === convId
        ? { ...c, last_message: content, updated_at: updatedAt }
        : c
    );
    // Sort by updated_at descending
    convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    set({ conversations: convs });
  },

  decrementUnread: (convId) => {
    const convs = get().conversations.map((c) =>
      c.id === convId ? { ...c, unread_count: Math.max(0, c.unread_count - 1) } : c
    );
    set({ conversations: convs });
  },

  addConversation: (conv) => {
    const convs = [conv, ...get().conversations];
    convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    set({ conversations: convs });
  },
}));
