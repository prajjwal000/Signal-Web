export interface User {
  id: number;
  username: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  last_seen?: string;
  created_at: string;
}

export interface Contact {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface Conversation {
  id: number;
  is_group: boolean;
  name?: string;
  last_message?: string;
  last_sender?: string;
  updated_at: string;
  unread_count: number;
  // For DMs: the other user's info
  other_user?: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  // For groups: member count
  member_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  created_at: string;
  receipts: Receipt[];
  // Client-side status for optimistic updates
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface Receipt {
  message_id: number;
  user_id: number;
  status: 'sent' | 'delivered' | 'read';
  updated_at: string;
}

// WebSocket event types
export type WSEvent =
  | WSMessageEvent
  | WSReceiptEvent
  | WSTypingEvent
  | WSPresenceEvent;

export interface WSMessageEvent {
  type: 'message';
  message: Message;
}

export interface WSReceiptEvent {
  type: 'receipt';
  message_id: number;
  user_id: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface WSTypingEvent {
  type: 'typing';
  conversation_id: number;
  user_id: number;
  is_typing: boolean;
}

export interface WSPresenceEvent {
  type: 'presence';
  user_id: number;
  status: 'online' | 'offline';
}

// WebSocket outbound events
export type WSOutbound =
  | { type: 'message'; conversation_id: number; content: string }
  | { type: 'receipt'; message_id: number; status: 'delivered' | 'read' }
  | { type: 'read_all'; conversation_id: number }
  | { type: 'typing'; conversation_id: number; is_typing: boolean };
