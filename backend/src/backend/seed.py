import random

from backend.database import get_db
from backend.models import init_schema

SEED_USERS = [
    ("alice_wonder", "Alice Johnson", "+14155550101", "https://i.pravatar.cc/150?u=alice"),
    ("bob_builder", "Bob Smith", "+14155550102", "https://i.pravatar.cc/150?u=bob"),
    ("charlie_dev", "Charlie Brown", "+14155550103", "https://i.pravatar.cc/150?u=charlie"),
    ("diana_prince", "Diana Prince", "+14155550104", "https://i.pravatar.cc/150?u=diana"),
    ("evan_wright", "Evan Wright", "+14155550105", "https://i.pravatar.cc/150?u=evan"),
    ("fiona_green", "Fiona Green", "+14155550106", "https://i.pravatar.cc/150?u=fiona"),
    ("george_hall", "George Hall", "+14155550107", "https://i.pravatar.cc/150?u=george"),
    ("hannah_lee", "Hannah Lee", "+14155550108", "https://i.pravatar.cc/150?u=hannah"),
    ("ivan_petrov", "Ivan Petrov", "+14155550109", "https://i.pravatar.cc/150?u=ivan"),
    ("julia_chen", "Julia Chen", "+14155550110", "https://i.pravatar.cc/150?u=julia"),
    ("kevin_ross", "Kevin Ross", "+14155550111", "https://i.pravatar.cc/150?u=kevin"),
    ("laura_kim", "Laura Kim", "+14155550112", "https://i.pravatar.cc/150?u=laura"),
    ("prajjwal", "Prajjwal Verma", "+919876543210", "https://i.pravatar.cc/150?u=prajjwal"),
]

DIRECT_MESSAGES = [
    [
        ("Hey! How's it going?", 1),
        ("Pretty good, just working on some stuff", 0),
        ("Nice, what are you building?", 1),
        ("A Signal clone actually", 0),
    ],
    [
        ("Did you see the new update?", 1),
        ("Yeah, looks great!", 0),
        ("The dark mode is so clean", 1),
    ],
    [
        ("Want to grab coffee later?", 0),
        ("Sure, 3pm works for me", 1),
        ("See you at the usual spot", 0),
    ],
]

GROUP_MESSAGES = [
    ("Welcome to the group everyone!", 0),
    ("Hey, glad to be here", 1),
    ("Let's get this project done!", 2),
]


def seed():
    conn = get_db()
    init_schema(conn)

    for username, display_name, phone, avatar_url in SEED_USERS:
        conn.execute(
            "INSERT OR IGNORE INTO users (username, display_name, phone, avatar_url) VALUES (?, ?, ?, ?)",
            [username, display_name, phone, avatar_url],
        )
    conn.commit()
    conn.close()
    print("Seed complete: 12 users created.")


def seed_user_data(user_id: int):
    """Seed contacts, conversations, and messages for a newly registered user.
    Called after registration to give the examiner an immediately populated app.
    """
    conn = get_db()

    # Pick 4 random contacts from seeded pool
    all_users = conn.execute(
        "SELECT id, username FROM users WHERE id != ?", [user_id]
    ).fetchall()
    contact_ids = [u[0] for u in random.sample(all_users, min(4, len(all_users)))]

    for cid in contact_ids:
        conn.execute(
            "INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)",
            [user_id, cid],
        )
    conn.commit()

    # Create 2 direct conversations
    for i in range(2):
        other_id = contact_ids[i]
        conn.execute(
            "INSERT INTO conversations (is_group) VALUES (0)"
        )
        conv_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
            [conv_id, user_id],
        )
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
            [conv_id, other_id],
        )
        messages = DIRECT_MESSAGES[i % len(DIRECT_MESSAGES)]
        for content, is_other in messages:
            sender = other_id if is_other else user_id
            conn.execute(
                "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
                [conv_id, sender, content],
            )
        conn.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
            [conv_id],
        )
    conn.commit()

    # Create 1 group conversation with 2 seeded users
    group_members = random.sample(
        [u[0] for u in all_users if u[0] not in contact_ids[:2]],
        min(2, len([u[0] for u in all_users if u[0] not in contact_ids[:2]])),
    )
    if not group_members:
        group_members = [contact_ids[2]]

    conn.execute(
        "INSERT INTO conversations (is_group, name) VALUES (1, 'Friends')"
    )
    group_conv_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.execute(
        "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'admin')",
        [group_conv_id, user_id],
    )
    for mid in group_members:
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
            [group_conv_id, mid],
        )
    for content, sender_idx in GROUP_MESSAGES:
        if sender_idx == 0:
            sender = user_id
        else:
            sender = group_members[sender_idx - 1] if sender_idx - 1 < len(group_members) else user_id
        conn.execute(
            "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
            [group_conv_id, sender, content],
        )
    conn.execute(
        "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
        [group_conv_id],
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    seed()
