# Signal Clone — Secure Messaging Platform

A functional clone of the Signal messaging application that replicates Signal's design, user experience, and core messaging workflows — including real-time 1:1 and group messaging, delivery/read receipts, typing indicators, and a pixel-perfect Signal-faithful UI.

Built as a full-stack assignment with deliberate architectural decisions, clean separation of concerns, and UI fidelity to Signal's actual design system.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (TypeScript) + React 19 | UI layer — components, routing, state |
| Styling | Tailwind CSS v4 | Utility-first CSS with CSS custom properties for theming |
| State | Zustand | Lightweight client-side stores (conversations, messages, auth, UI) |
| Backend | Python 3.13 + FastAPI | REST API, WebSocket server, all business logic |
| Database | Turso (libSQL) | Hosted SQLite — persistent storage via `libsql` over HTTP |
| Real-time | WebSockets (native) | Live messages, typing, receipts, presence, reactions |
| Deploy | Vercel (frontend) + Railway (backend) | Edge hosting + persistent backend |
| Auth | PyJWT | Mocked OTP (`0000`), JWT session tokens (7-day expiry) |

---

## Setup Instructions

### Prerequisites
- Node.js 18+ and pnpm (for frontend)
- Python 3.13+ and uv (for backend)
- A Turso account (free tier works)

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Set environment variables (create .env or export)
export TURSO_DATABASE_URL="libsql://your-db-url.turso.io"
export TURSO_AUTH_TOKEN="your-turso-auth-token"
export JWT_SECRET="any-random-secret-string"
export NTFY_TOPIC="your-ntfy-topic"      # optional: for easter egg push notifications
export NTFY_USERNAME="your-ntfy-username"  # optional: username that triggers notifications

# Run the server
uv run uvicorn src.backend.main:app --reload --port 8000
```

The schema is auto-created on startup via `CREATE TABLE IF NOT EXISTS`. Seed data is loaded automatically — 13 pre-seeded users with conversations and messages.

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Set environment variable
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and register with any username (OTP is always `0000`).

---

## Architecture Overview

```
Signal-Web/
├── frontend/                    # Next.js 16 (App Router)
│   ├── app/                     # Routes: /, /auth, /chat/[convId], /settings
│   ├── components/              # UI components organized by domain
│   │   ├── chat/                # ChatPane, MessageList, MessageBubble, CompositionArea, etc.
│   │   ├── layout/              # AppLayout, Sidebar
│   │   ├── sidebar/             # SidebarHeader, ConversationItem
│   │   └── ui/                  # Reusable: Avatar, Skeleton, Toast, ShortcutsModal
│   ├── contexts/                # WebSocketContext, ThemeContext
│   ├── hooks/                   # useToast
│   ├── stores/                  # Zustand: auth, conversation, message, contact, UI stores
│   └── lib/                     # api.ts (REST client), types.ts (TypeScript types)
│
├── backend/                     # FastAPI
│   └── src/backend/
│       ├── main.py              # App init, router registration, startup seed
│       ├── models.py            # Schema SQL (CREATE TABLE statements)
│       ├── db.py                # Turso/libSQL connection
│       ├── auth.py              # JWT encode/decode, get_current_user dependency
│       ├── auth_router.py       # POST /auth/register, /auth/verify, /auth/login, GET /auth/me
│       ├── conversations.py     # CRUD conversations, messages, members
│       ├── contacts.py          # Contact list, add, search users
│       ├── attachments.py       # File upload/serve
│       ├── reactions.py         # Emoji reactions CRUD
│       └── ws.py                # WebSocket handler (all real-time events)
│
```

### Data Flow

1. **Auth**: Register → mock OTP verification → JWT issued → stored in `localStorage`
2. **Messaging**: User types → WebSocket `message` event → server persists → broadcasts to all conversation members
3. **Receipts**: Server auto-sends `delivered` on receive; client sends `read_all` when conversation opens
4. **Typing**: Client sends `typing_start`/`typing_stop` → server broadcasts to other members (never persisted)
5. **Presence**: Server tracks `last_seen` per user; broadcasts online status to conversation members

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    phone TEXT UNIQUE,
    avatar_url TEXT,
    last_seen TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Contacts (directional: user_id has contact_id in their address book)
CREATE TABLE contacts (
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, contact_id)
);

-- Conversations (1:1 or group)
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    is_group INTEGER NOT NULL DEFAULT 0,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Conversation membership with roles
CREATE TABLE conversation_members (
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, user_id)
);

-- Messages with reply-to and disappearing message support
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    reply_to INTEGER,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Delivery/read receipts per recipient
CREATE TABLE message_receipts (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id)
);

-- File attachments (stored as BLOB in DB for prototype)
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Emoji reactions (per message, per user, per emoji)
CREATE TABLE message_reactions (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id, emoji)
);
```

**Indexes:** `messages(conv_id, created_at)`, `conversation_members(user_id)`, `conversations(updated_at DESC)`, `message_receipts(message_id)`, `contacts(user_id)`, `users(phone)`, `messages(reply_to)`, `messages(expires_at)`, `message_reactions(message_id)`, `attachments(sender_id)`.

---

## API Overview

### Auth (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user (username, display_name, phone) → returns OTP |
| POST | `/auth/verify` | Verify OTP + set password → returns JWT |
| POST | `/auth/login` | Login with username + password → returns JWT |
| GET | `/auth/me` | Get current user profile (requires Bearer token) |

### Contacts (`/contacts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contacts` | List user's contacts |
| POST | `/contacts` | Add a contact by user ID |
| GET | `/contacts/search?q=` | Search users by username/display_name |

### Conversations (`/conversations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/conversations` | List all conversations (with last message, unread count) |
| POST | `/conversations` | Create conversation (1:1 by user_id or group with name + member_ids) |
| GET | `/conversations/{id}/messages` | Paginated message history |
| GET | `/conversations/{id}/members` | List group members with roles |
| POST | `/conversations/{id}/members` | Add member to group (admin only) |
| DELETE | `/conversations/{id}/members/{user_id}` | Remove member from group (admin only) |

### Attachments (`/attachments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attachments/{message_id}` | Upload file attachment (multipart/form-data) |
| GET | `/attachments/{id}` | Download attachment file |

### Reactions (`/reactions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reactions/{message_id}` | Add/toggle emoji reaction |
| DELETE | `/reactions/{message_id}/{emoji}` | Remove reaction |
| GET | `/reactions/{message_id}` | List reactions for a message |

### WebSocket (`/ws?token=<jwt>`)

All real-time events flow through a single WebSocket connection:

| Event | Direction | Description |
|-------|-----------|-------------|
| `message` | both | Send/receive messages |
| `typing_start` / `typing_stop` | both | Typing indicators |
| `receipt` | both | Delivery/read receipts |
| `presence` | both | Online/offline status |
| `read_all` | client→server | Mark all messages as read |
| `reaction` | both | Add/remove emoji reactions |
| `message_expiring` | server→client | Disappearing message timer started |

---

## Features Implemented

### Core Features
- **Authentication** — Register with phone/username, mock OTP (`0000`), JWT sessions, login/logout
- **Contacts** — Directional address book, search users, add contacts
- **1:1 Messaging** — Real-time send/receive, optimistic UI, message timestamps
- **Group Messaging** — Create groups, add/remove members (admin controls), sender names
- **Delivery Pipeline** — `sending → sent → delivered → read` with per-recipient granularity
- **Typing Indicators** — Real-time, ephemeral, never persisted
- **Online Presence** — Last-seen tracking, online/offline indicators
- **Signal-Faithful UI** — Asymmetric message bubbles, proper spacing, conversation list + chat pane layout

### Bonus Features
- **Attachments** — Upload and view images/files inline
- **Message Reactions** — Add/toggle/remove emoji reactions with reaction bar
- **Reply-to / Quoted Messages** — Reply to specific messages with preview
- **Disappearing Messages** — Configurable timer (off, 30s, 5m, 1h, 1d)
- **Dark/Light Mode** — Toggle with localStorage persistence, respects `prefers-color-scheme`
- **Responsive Design** — Mobile-first with sidebar/chat toggle, back button, deep links
- **Keyboard Shortcuts** — `Ctrl+K` (new chat), `Ctrl+/` (shortcuts), `Esc` (back/close)
- **Settings Page** — Account, privacy, notifications, appearance, linked devices, help sections

### Mocked / Placeholder
- End-to-end encryption (simulated)
- Real phone verification
- Voice/video calls
- Stories
- Linked devices

---

## Seed Data

The database is seeded automatically on first startup with **13 pre-seeded users** and sample conversations/messages. After registration, the app is immediately usable — you can start messaging other users right away.

To re-seed: `POST /seed`

---

## Easter Egg

There is a pre-seeded user named **Prajjwal Verma** (username: `prajjwal`) in the app. If you send a message to this user, the developer will receive a real-time push notification on their phone via [ntfy.sh](https://ntfy.sh). This was implemented as a small fun addition to demonstrate external service integration with the messaging backend.

The notification is triggered server-side in the WebSocket message handler. When a message is sent to any conversation that includes `prajjwal` as a member, the backend makes an HTTP POST to ntfy.sh with the sender name and message preview. The topic is configured via the `NTFY_TOPIC` environment variable.

---

## Key Decisions

1. **No ORM** — Raw SQL via `libsql` for transparency and simplicity. The schema is simple enough that an ORM adds overhead without benefit.
2. **Turso over Railway SQLite** — Railway containers are ephemeral; a local SQLite file would die on redeploy. Turso provides persistent hosted libSQL.
3. **Singleton WebSocket** — A single `WebSocketProvider` context owns the connection and distributes events to the entire component tree. Prevents duplicate connections.
4. **CSS Custom Properties for Theming** — Signal's color palette as CSS variables with `[data-theme="light"]` override. Registered in Tailwind 4's `@theme inline` for direct class usage.
5. **Key-based Remounting** — Conversation changes force full component remount via React `key`, eliminating stale state bugs without complex cleanup logic.
6. **Mock OTP** — Fixed `"0000"` for all users. Registration returns it in the response body for testing.

---

