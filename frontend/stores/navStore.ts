import { create } from 'zustand';

export type NavTab = 'chats' | 'calls' | 'stories' | 'settings';

interface NavState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  navCollapsed: boolean;
  toggleNavCollapsed: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  activeTab: 'chats',
  setActiveTab: (tab) => set({ activeTab: tab }),
  navCollapsed: false,
  toggleNavCollapsed: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
}));
