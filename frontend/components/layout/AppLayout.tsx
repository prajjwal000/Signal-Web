'use client';

import { useEffect, useState, useCallback } from 'react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { useMobileNav } from '@/stores/mobileNavStore';
import { useConversationStore } from '@/stores/conversationStore';
import Sidebar from './Sidebar';
import ChatPane from '@/components/chat/ChatPane';
import ShortcutsModal from '@/components/ui/ShortcutsModal';

export default function AppLayout() {
  const showSidebar = useMobileNav((s) => s.showSidebar);
  const selectedConvId = useConversationStore((s) => s.selectedConvId);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // On mobile: when a conversation is selected, show chat view
  useEffect(() => {
    if (selectedConvId) {
      useMobileNav.getState().showChat();
    }
  }, [selectedConvId]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+K — open new chat (focus search in SidebarHeader)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Trigger new chat panel via a custom event
      window.dispatchEvent(new CustomEvent('signal:new-chat'));
    }

    // Ctrl+/ — show shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      setShowShortcuts((s) => !s);
    }

    // Esc — close shortcuts modal, or go back on mobile
    if (e.key === 'Escape') {
      if (showShortcuts) {
        setShowShortcuts(false);
      } else if (!showSidebar && window.innerWidth < 768) {
        useMobileNav.getState().showSidebarView();
      }
    }
  }, [showShortcuts, showSidebar]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <WebSocketProvider>
      <div className="h-full flex overflow-hidden">
        {/* Sidebar — hidden on mobile when chat is open */}
        <div
          className={`flex-shrink-0 flex flex-col border-r border-border overflow-hidden ${
            showSidebar ? 'flex' : 'hidden'
          } md:flex`}
          style={{ width: 'var(--sidebar-width)' }}
        >
          <Sidebar />
        </div>

        {/* Chat Pane — full width on mobile when sidebar is hidden */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            showSidebar ? 'hidden' : 'flex'
          } md:flex`}
        >
          <ChatPane />
        </div>
      </div>

      {/* Shortcuts modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </WebSocketProvider>
  );
}
