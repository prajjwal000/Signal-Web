import type { User, Contact, Conversation, Message, GroupMember } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || body.message || 'Request failed');
  }

  return res.json();
}

// Auth
export async function register(data: {
  username: string;
  display_name: string;
  phone?: string;
}): Promise<{ otp: string }> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function verify(data: {
  username: string;
  otp: string;
  is_new?: boolean;
}): Promise<{ token: string; user: User }> {
  return request('/auth/verify', { method: 'POST', body: JSON.stringify(data) });
}

export async function login(data: {
  username: string;
  otp: string;
}): Promise<{ token: string; user: User }> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMe(): Promise<{ user: User }> {
  return request('/auth/me');
}

// Contacts
export async function getContacts(): Promise<Contact[]> {
  return request('/contacts');
}

export async function addContact(contactId: number): Promise<{ ok: boolean }> {
  return request('/contacts', { method: 'POST', body: JSON.stringify({ contact_id: contactId }) });
}

export async function searchUsers(q: string): Promise<Contact[]> {
  return request(`/users/search?q=${encodeURIComponent(q)}`);
}

// Conversations
export async function getConversations(): Promise<Conversation[]> {
  return request('/conversations');
}

export async function createConversation(data: {
  participant_id?: number;
  name?: string;
  member_ids?: number[];
}): Promise<Conversation> {
  return request('/conversations', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMessages(
  convId: number,
  limit = 50,
  before?: number
): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', String(before));
  return request(`/conversations/${convId}/messages?${params}`);
}

export async function getMembers(convId: number): Promise<GroupMember[]> {
  return request(`/conversations/${convId}/members`);
}

export async function addMember(convId: number, userId: number): Promise<{ ok: boolean }> {
  return request(`/conversations/${convId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function removeMember(convId: number, userId: number): Promise<{ ok: boolean }> {
  return request(`/conversations/${convId}/members/${userId}`, { method: 'DELETE' });
}

// Attachments
export async function uploadAttachment(file: File): Promise<{ id: number; filename: string; mime_type: string; size: number }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || 'Upload failed');
  }

  return res.json();
}

export function getAttachmentUrl(attId: number): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null;
  return `${API_URL}/attachments/${attId}?token=${token}`;
}

// Reactions
export async function addReaction(msgId: number, emoji: string): Promise<{ ok: boolean }> {
  return request(`/reactions/${msgId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
}

export async function removeReaction(msgId: number, emoji: string): Promise<{ ok: boolean }> {
  return request(`/reactions/${msgId}/reactions/${encodeURIComponent(emoji)}`, {
    method: 'DELETE',
  });
}

export async function getReactions(msgId: number): Promise<{ emoji: string; count: number; users: { user_id: number; display_name: string }[] }[]> {
  return request(`/reactions/${msgId}/reactions`);
}
