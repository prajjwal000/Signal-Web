# Signal Clone — Secure Messaging Platform

A functional clone of the Signal messaging application replicating Signal's design, UX, and core messaging workflows — real-time 1:1 and group messaging, delivery/read receipts, typing indicators, and a Signal-faithful UI.

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (TypeScript) + React 19 | UI — components, routing, state |
| Styling | Tailwind CSS v4 | CSS custom properties for Signal's theme |
| State | Zustand | Client-side stores (auth, conversations, messages, contacts, UI) |
| Backend | Python 3.13 + FastAPI | REST API + WebSocket server |
| Database | Turso (libSQL) | Hosted SQLite — persistent storage |
| Real-time | WebSockets (native) | Messages, typing, receipts, presence, reactions |
| Auth | PyJWT | Mocked OTP (`0000`), JWT sessions (7-day expiry) |
| Deploy | Vercel (frontend) + Railway (backend) | |

---

## Setup

### Backend

```bash
cd backend
uv sync

export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"
export JWT_SECRET="any-secret"

uv run uvicorn src.backend.main:app --reload --port 8000
```

Schema auto-creates on startup. 13 users seeded automatically.

### Frontend

```bash
cd frontend
pnpm install
export NEXT_PUBLIC_API_URL="http://localhost:8000"
pnapp dev
```

Open [localhost:3000](http://localhost:3000), register with any username (OTP is always `0000`).

---

## Architecture

```
Signal-Web/
├── frontend/                    # Next.js 16 (App Router)
│   ├── app/                     # Routes: /, /auth, /chat/[convId], /settings
│   ├── components/              # UI by domain
│   │   ├── chat/                # ChatPane, MessageList, MessageBubble, CompositionArea
│   │   ├── layout/              # AppLayout, Sidebar
│   │   └── ui/                  # Avatar, Skeleton, Toast, ShortcutsModal
│   ├── contexts/                # WebSocketContext, ThemeContext
│   ├── stores/                  # Zustand stores
│   └── lib/                     # api.ts (REST), types.ts
│
├── backend/                     # FastAPI
│   └── src/backend/
│       ├── main.py              # App init, startup seed
│       ├── models.py            # Schema SQL
│       ├── db.py                # Turso/libSQL connection
│       ├── auth.py              # JWT + get_current_user
│       ├── auth_router.py       # Register, verify, login, me
│       ├── conversations.py     # Conversations, messages, members
│       ├── contacts.py          # Contact list, search
│       ├── attachments.py       # File upload/serve
│       ├── reactions.py         # Emoji reactions
│       └── ws.py                # WebSocket handler (all real-time)
```

### Data Flow

1. **Auth** → Register → mock OTP (`0000`) → JWT → `localStorage`
2. **Messaging** → Client sends `message` via WS → server persists → broadcasts to members
3. **Receipts** → Server auto-sends `delivered` on receive; client sends `read_all` when conversation opens
4. **Typing** → `typing_start`/`typing_stop` → server broadcasts (never persisted)
5. **Presence** → Server tracks `last_seen`; broadcasts online/offline to conversation members

### Easter Egg

A pre-seeded user **Prajjwal Verma** (`prajjwal`) triggers real push notifications. When any message is sent to a conversation containing this user, the backend POSTs to [ntfy.sh](https://ntfy.sh) with the sender name and message preview — configured via `NTFY_TOPIC` and `NTFY_USERNAME` env vars. creator would then get notification and connect using his id to chat with examiner.

---

## Database Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    phone TEXT UNIQUE,
    avatar_url TEXT,
    last_seen TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE contacts (
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, contact_id)
);

CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    is_group INTEGER NOT NULL DEFAULT 0,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE conversation_members (
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    reply_to INTEGER,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE message_receipts (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

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

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register → returns OTP |
| POST | `/auth/verify` | Verify OTP + set password → JWT |
| POST | `/auth/login` | Login → JWT |
| GET | `/auth/me` | Current user profile |

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contacts` | List contacts |
| POST | `/contacts` | Add contact by user ID |
| GET | `/contacts/search?q=` | Search users |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/conversations` | List conversations (last message, unread count) |
| POST | `/conversations` | Create 1:1 or group conversation |
| GET | `/conversations/{id}/messages` | Paginated message history |
| GET | `/conversations/{id}/members` | List group members |
| POST | `/conversations/{id}/members` | Add member (admin) |
| DELETE | `/conversations/{id}/members/{user_id}` | Remove member (admin) |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/attachments/{message_id}` | Upload (multipart) |
| GET | `/attachments/{id}` | Download |

### Reactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reactions/{message_id}` | Add/toggle reaction |
| DELETE | `/reactions/{message_id}/{emoji}` | Remove reaction |
| GET | `/reactions/{message_id}` | List reactions |

### WebSocket (`/ws?token=<jwt>`)

| Event | Direction | Description |
|-------|-----------|-------------|
| `message` | both | Send/receive messages |
| `typing_start` / `typing_stop` | both | Typing indicators |
| `receipt` | both | Delivery/read receipts |
| `presence` | both | Online/offline status |
| `read_all` | client→server | Mark all messages read |
| `reaction` | both | Emoji reactions |
| `message_expiring` | server→client | Disappearing message timer |

---

## Features

**Core:** Auth (mock OTP, JWT) · Contacts · 1:1 & group messaging · Delivery/read receipts (sending → sent → delivered → read) · Typing indicators · Online presence · Signal-faithful UI

**Bonus:** Attachments (images/files) · Emoji reactions · Reply-to/quoted messages · Disappearing messages (30s/5m/1h/1d) · Dark/light mode · Responsive design · Keyboard shortcuts (`Ctrl+K`, `Ctrl+/`, `Esc`) · Settings page

**Mocked:** E2E encryption, phone verification, voice/video calls, stories, linked devices

---

## Key Decisions

1. **No ORM** — Raw SQL via `libsql` for transparency; schema is simple enough.
2. **Turso over Railway SQLite** — Ephemeral containers lose local files on redeploy.
3. **Singleton WebSocket** — One `WebSocketProvider` prevents duplicate connections across the component tree.
4. **CSS Custom Properties** — Signal's palette as CSS variables; `[data-theme]` override for dark/light.
5. **Key-based Remounting** — React `key` on conversation ID forces clean state on switch.
