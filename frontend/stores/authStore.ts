import { create } from 'zustand';
import type { User } from '@/lib/types';
import * as api from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  register: (username: string, displayName: string, phone?: string) => Promise<string>;
  verifyNew: (username: string, otp: string) => Promise<void>;
  login: (username: string, otp: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null,
  loading: true,

  register: async (username, displayName, phone) => {
    const res = await api.register({
      username,
      display_name: displayName,
      phone,
    });
    return res.otp;
  },

  verifyNew: async (username, otp) => {
    const res = await api.verify({ username, otp, is_new: true });
    localStorage.setItem('signal_token', res.token);
    set({ token: res.token, user: res.user });
  },

  login: async (username, otp) => {
    const res = await api.login({ username, otp });
    localStorage.setItem('signal_token', res.token);
    set({ token: res.token, user: res.user });
  },

  logout: () => {
    localStorage.removeItem('signal_token');
    set({ token: null, user: null });
  },

  hydrate: async () => {
    const token = get().token || localStorage.getItem('signal_token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await api.getMe();
      set({ token, user: res.user, loading: false });
    } catch {
      localStorage.removeItem('signal_token');
      set({ token: null, user: null, loading: false });
    }
  },
}));
