'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as api from '@/lib/api';
import type { GroupMember } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';

interface GroupInfoPanelProps {
  conversationId: number;
  conversationName: string;
  onClose: () => void;
}

export default function GroupInfoPanel({ conversationId, conversationName, onClose }: GroupInfoPanelProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; display_name: string; username: string }[]>([]);
  const user = useAuthStore((s) => s.user);

  const currentMember = members.find((m) => m.id === user?.id);
  const isAdmin = currentMember?.role === 'admin';

  // Load members immediately (not in effect)
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const m = await api.getMembers(conversationId);
      setMembers(m);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load on mount via ref
  const loadedRef = useRef<boolean | null>(null);
  if (loadedRef.current == null) {
    loadedRef.current = true;
    loadMembers();
  }

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const users = await api.searchUsers(q);
      setSearchResults(users.filter((u) => !members.some((m) => m.id === u.id)));
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (userId: number) => {
    try {
      await api.addMember(conversationId, userId);
      await loadMembers();
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      // ignore
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.removeMember(conversationId, userId);
      await loadMembers();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-bg-secondary rounded-xl shadow-2xl w-full max-w-sm mx-4 max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-label-primary">{conversationName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-bg-hover text-label-secondary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-label-secondary uppercase">
              Members — {members.length}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-xs font-medium text-brand hover:text-brand-hover"
              >
                + Add
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={member.display_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-label-primary truncate">
                      {member.display_name}
                      {member.id === user?.id && (
                        <span className="text-label-tertiary ml-1">(You)</span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-label-secondary">@{member.username}</p>
                </div>
                {member.role === 'admin' && (
                  <span className="text-[10px] font-medium text-brand bg-brand/10 px-1.5 py-0.5 rounded">Admin</span>
                )}
                {isAdmin && member.id !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 rounded-full hover:bg-danger/10 text-danger"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add member overlay */}
        {showAddMember && (
          <div className="absolute inset-0 bg-bg-secondary flex flex-col z-10">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <button onClick={() => { setShowAddMember(false); setSearchQuery(''); setSearchResults([]); }} className="p-1 rounded-full hover:bg-bg-hover text-label-secondary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-base font-semibold text-label-primary">Add member</p>
            </div>
            <div className="px-3 py-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for people"
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-label-primary placeholder:text-label-tertiary outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleAddMember(u.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left"
                >
                  <Avatar name={u.display_name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-label-primary">{u.display_name}</p>
                    <p className="text-xs text-label-secondary">@{u.username}</p>
                  </div>
                </button>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-label-secondary text-center py-4">No results found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
