SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, contact_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (contact_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    is_group INTEGER NOT NULL DEFAULT 0,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS message_receipts (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""


def init_schema(conn):
    conn.executescript(SCHEMA_SQL)
