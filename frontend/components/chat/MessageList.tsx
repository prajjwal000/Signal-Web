'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import ScrollToBottom from './ScrollToBottom';

const SCROLL_THRESHOLD = 200;

export default function MessageList({ conversationId }: { conversationId: number }) {
  const messages = useMessageStore((s) => s.messagesByConv[conversationId] || []);
  const loading = useMessageStore((s) => s.loadingByConv[conversationId]);
  const loadMessages = useMessageStore((s) => s.loadMessages);
  const loadOlderMessages = useMessageStore((s) => s.loadOlderMessages);
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevMessageCountRef = useRef(messages.length);

  // Load messages on conversation change
  useEffect(() => {
    loadMessages(conversationId);
    setNewMessageCount(0);
    prevMessageCountRef.current = 0;
  }, [conversationId, loadMessages]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distanceFromBottom < SCROLL_THRESHOLD);

    // Load older messages when scrolled to top
    if (el.scrollTop < 50 && !loadingRef.current) {
      loadingRef.current = true;
      loadOlderMessages(conversationId).then(() => {
        loadingRef.current = false;
      });
    }
  }, [conversationId, loadOlderMessages]);

  // Auto-scroll to bottom on new messages (only if near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const newCount = messages.length - prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (newCount > 0) {
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
        setNewMessageCount(0);
      } else {
        setNewMessageCount((c) => c + newCount);
      }
    }
  }, [messages.length, isNearBottom]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversationId]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setNewMessageCount(0);
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentGroup: (typeof messages)[0][] = [];
  let currentDate = '';

  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString();
    if (date !== currentDate) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ date: currentDate, messages: currentGroup });
      }
      currentGroup = [msg];
      currentDate = date;
    } else {
      currentGroup.push(msg);
    }
  }
  if (currentGroup.length > 0) {
    groupedMessages.push({ date: currentDate, messages: currentGroup });
  }

  return (
    <div className="flex-1 relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto px-4 py-2"
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-label-secondary text-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-1">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                {group.messages.map((msg, i) => {
                  const isOwn = msg.sender_id === user?.id;
                  const showSender = !isOwn && (
                    i === 0 ||
                    group.messages[i - 1].sender_id !== msg.sender_id
                  );
                  const isLastInGroup =
                    i === group.messages.length - 1 ||
                    group.messages[i + 1].sender_id !== msg.sender_id;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                      showSender={showSender}
                      isLastInGroup={isLastInGroup}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll to bottom FAB */}
      {!isNearBottom && (
        <ScrollToBottom onClick={scrollToBottom} newMessageCount={newMessageCount} />
      )}
    </div>
  );
}
