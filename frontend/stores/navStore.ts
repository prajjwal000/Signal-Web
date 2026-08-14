import { create } from 'zustand';

export type NavTab = 'chats' | 'calls' | 'stories' | 'settings';

interface NavState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const useNavStore = create<NavState>((set) => ({
  activeTab: 'chats',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
