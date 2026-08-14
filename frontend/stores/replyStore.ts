import { create } from 'zustand';
import type { Message } from '@/lib/types';

interface ReplyState {
  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;
}

export const useReplyStore = create<ReplyState>((set) => ({
  replyTo: null,
  setReplyTo: (msg) => set({ replyTo: msg }),
}));
