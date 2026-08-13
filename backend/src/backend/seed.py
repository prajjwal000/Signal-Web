from backend.database import get_db
from backend.models import init_schema

SEED_USERS = [
    ("alice", "Alice"),
    ("bob", "Bob"),
    ("charlie", "Charlie"),
    ("diana", "Diana"),
    ("prajjwal", "Prajjwal"),
]


def seed():
    conn = get_db()
    init_schema(conn)

    for username, display_name in SEED_USERS:
        conn.execute(
            "INSERT OR IGNORE INTO users (username, display_name) VALUES (?, ?)",
            [username, display_name],
        )
    conn.commit()

    users = conn.execute("SELECT id, username FROM users").fetchall()
    uid = {username: user_id for user_id, username in users}

    conn.execute(
        "INSERT OR IGNORE INTO conversations (id, is_group) VALUES (1, 0)"
    )
    conn.execute(
        "INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (1, ?, 'member')",
        [uid["alice"]],
    )
    conn.execute(
        "INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (1, ?, 'member')",
        [uid["bob"]],
    )

    conn.execute(
        "INSERT OR IGNORE INTO conversations (id, is_group) VALUES (2, 1)"
    )
    conn.execute(
        "INSERT OR IGNORE INTO conversations (id, is_group, name) VALUES (3, 1, 'Dev Team')"
    )
    for cid in [2, 3]:
        for uname in ["alice", "bob", "charlie", "prajjwal"]:
            conn.execute(
                "INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
                [cid, uid[uname]],
            )

    messages = [
        (1, uid["alice"], "Hey Bob, you around?"),
        (1, uid["bob"], "Yeah, what's up?"),
        (1, uid["alice"], "Want to grab lunch?"),
        (1, uid["bob"], "Sure, give me 10 min"),
        (2, uid["prajjwal"], "Welcome to the group chat!"),
        (2, uid["alice"], "Thanks!"),
        (2, uid["charlie"], "Hello everyone"),
        (3, uid["prajjwal"], "Sprint planning at 3pm"),
        (3, uid["alice"], "Got it, I'll be there"),
        (3, uid["bob"], "Can we push to 3:30?"),
    ]
    for conv_id, sender_id, content in messages:
        conn.execute(
            "INSERT OR IGNORE INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
            [conv_id, sender_id, content],
        )
    conn.commit()
    conn.close()
    print("Seed complete.")


if __name__ == "__main__":
    seed()
