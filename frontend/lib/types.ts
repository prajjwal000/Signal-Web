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
  other_user?: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  member_count?: number;
}

export interface Attachment {
  id: number;
  filename: string;
  mime_type: string;
  size: number;
}

export interface ReplyToMsg {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: { user_id: number; display_name: string }[];
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  created_at: string;
  reply_to?: number | null;
  reply_to_msg?: ReplyToMsg | null;
  expires_at?: string | null;
  attachment?: Attachment | null;
  reactions?: ReactionGroup[];
  receipts: Receipt[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface Receipt {
  message_id: number;
  user_id: number;
  status: 'sent' | 'delivered' | 'read';
  updated_at: string;
}

export interface GroupMember {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
}

// WebSocket event types
export type WSEvent =
  | WSMessageEvent
  | WSReceiptEvent
  | WSTypingEvent
  | WSPresenceEvent
  | WSReactionEvent;

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

export interface WSReactionEvent {
  type: 'reaction';
  message_id: number;
  conversation_id: number;
  reactions: ReactionGroup[];
}

// WebSocket outbound events
export type WSOutbound =
  | { type: 'message'; conversation_id: number; content: string; reply_to?: number; attachment_id?: number; expires_in?: number }
  | { type: 'receipt'; message_id: number; status: 'delivered' | 'read' }
  | { type: 'read_all'; conversation_id: number }
  | { type: 'typing'; conversation_id: number; is_typing: boolean }
  | { type: 'reaction'; message_id: number; emoji: string; action: 'add' | 'remove' };
