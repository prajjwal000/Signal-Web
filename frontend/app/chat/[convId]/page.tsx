'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useConversationStore } from '@/stores/conversationStore';
import { useMobileNav } from '@/stores/mobileNavStore';
import AuthGate from '@/components/AuthGate';
import AppLayout from '@/components/layout/AppLayout';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const convId = Number(params.convId);

  useEffect(() => {
    if (!isNaN(convId) && convId > 0) {
      useConversationStore.getState().selectConversation(convId);
      useMobileNav.getState().showChat();
    } else {
      router.replace('/');
    }
  }, [convId, router]);

  return (
    <AuthGate>
      <AppLayout />
    </AuthGate>
  );
}
