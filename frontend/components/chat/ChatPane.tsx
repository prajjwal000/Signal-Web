'use client';

import { useEffect } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import MessageList from './MessageList';
import CompositionArea from './CompositionArea';
import ChatHeader from './ChatHeader';

function ChatContent({ conversationId }: { conversationId: number }) {
  const conversations = useConversationStore((s) => s.conversations);
  const selectedConv = conversations.find((c) => c.id === conversationId);
  const { send } = useWebSocketContext();
  const loadConversations = useConversationStore((s) => s.loadConversations);

  useEffect(() => {
    send({ type: 'read_all', conversation_id: conversationId });
    // Reload conversations to get updated unread counts from backend
    const timer = setTimeout(() => loadConversations(), 500);
    return () => clearTimeout(timer);
  }, [conversationId, send, loadConversations]);

  if (!selectedConv) return null;

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <ChatHeader conversation={selectedConv} />
      <MessageList conversationId={conversationId} />
      <CompositionArea conversationId={conversationId} />
    </div>
  );
}

export default function ChatPane() {
  const selectedConvId = useConversationStore((s) => s.selectedConvId);

  if (!selectedConvId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg-primary text-label-secondary select-none">
        {/* Signal logo */}
        <div className="mb-6">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="1.5" className="text-label-tertiary" />
            <path
              d="M40 20C30.059 20 22 28.059 22 38c0 3.39.96 6.54 2.61 9.22L22 58l11.05-2.52C36.02 56.82 37.97 57.5 40 57.5c9.941 0 18-8.059 18-18S49.941 20 40 20z"
              fill="currentColor"
              className="text-brand"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-label-primary mb-1">Signal</h2>
        <p className="text-sm text-label-secondary mb-6">Send private messages to anyone on Signal</p>
        <p className="text-xs text-label-tertiary">Select a conversation or start a new one</p>
      </div>
    );
  }

  return <ChatContent key={selectedConvId} conversationId={selectedConvId} />;
}
