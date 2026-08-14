import { create } from 'zustand';

interface MobileNavState {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  showChat: () => void;
  showSidebarView: () => void;
}

export const useMobileNav = create<MobileNavState>((set) => ({
  showSidebar: true,

  setShowSidebar: (show) => set({ showSidebar: show }),

  showChat: () => set({ showSidebar: false }),

  showSidebarView: () => set({ showSidebar: true }),
}));
