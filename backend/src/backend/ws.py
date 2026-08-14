import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.auth import decode_token
from backend.database import get_db

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active[user_id] = websocket
        conn = get_db()
        conn.execute(
            "UPDATE users SET last_seen = datetime('now') WHERE id = ?",
            [user_id],
        )
        conn.commit()
        conn.close()

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)
        conn = get_db()
        conn.execute(
            "UPDATE users SET last_seen = datetime('now') WHERE id = ?",
            [user_id],
        )
        conn.commit()
        conn.close()

    async def send_to_user(self, user_id: int, message: dict):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_json(message)

    async def broadcast(self, message: dict):
        for ws in self.active.values():
            await ws.send_json(message)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active

    def get_conversation_peers(self, user_id: int) -> list[int]:
        conn = get_db()
        rows = conn.execute(
            """SELECT DISTINCT cm2.user_id
            FROM conversation_members cm1
            JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
            WHERE cm1.user_id = ? AND cm2.user_id != ?""",
            [user_id, user_id],
        ).fetchall()
        conn.close()
        return [r[0] for r in rows]

    def get_conversation_members(self, conv_id: int) -> list[int]:
        conn = get_db()
        rows = conn.execute(
            "SELECT user_id FROM conversation_members WHERE conversation_id = ?",
            [conv_id],
        ).fetchall()
        conn.close()
        return [r[0] for r in rows]


manager = ConnectionManager()


async def broadcast_presence(user_id: int, status: str):
    peers = manager.get_conversation_peers(user_id)
    for peer_id in peers:
        if manager.is_online(peer_id):
            await manager.send_to_user(peer_id, {
                "type": "presence",
                "user_id": user_id,
                "status": status,
            })


async def handle_message(user_id: int, payload: dict):
    conv_id = payload.get("conversation_id")
    content = payload.get("content")
    reply_to = payload.get("reply_to")
    attachment_id = payload.get("attachment_id")
    expires_in = payload.get("expires_in")  # seconds

    if not conv_id:
        return
    if not content and not attachment_id:
        return

    # Verify membership
    conn = get_db()
    member = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, user_id],
    ).fetchone()
    if not member:
        conn.close()
        return

    # Calculate expires_at
    expires_at = None
    if expires_in and expires_in > 0:
        expires_at = conn.execute(
            "SELECT datetime('now', '+' || ? || ' seconds')",
            [expires_in],
        ).fetchone()[0]

    # Insert message
    conn.execute(
        "INSERT INTO messages (conversation_id, sender_id, content, reply_to, expires_at) VALUES (?, ?, ?, ?, ?)",
        [conv_id, user_id, content or "", reply_to, expires_at],
    )
    msg_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    created_at = conn.execute("SELECT datetime('now')").fetchone()[0]

    # Update conversation timestamp
    conn.execute(
        "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
        [conv_id],
    )

    # Get sender info
    sender = conn.execute(
        "SELECT display_name, avatar_url FROM users WHERE id = ?",
        [user_id],
    ).fetchone()

    # Create receipt entries for all other members
    members = conn.execute(
        "SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?",
        [conv_id, user_id],
    ).fetchall()
    for (member_id,) in members:
        conn.execute(
            "INSERT INTO message_receipts (message_id, user_id, status) VALUES (?, ?, 'sent')",
            [msg_id, member_id],
        )
    conn.commit()
    conn.close()

    # Get reply_to message info
    reply_to_msg = None
    if reply_to:
        conn2 = get_db()
        rt = conn2.execute(
            """SELECT m.id, m.content, m.sender_id, u.display_name
            FROM messages m JOIN users u ON u.id = m.sender_id
            WHERE m.id = ?""",
            [reply_to],
        ).fetchone()
        conn2.close()
        if rt:
            reply_to_msg = {
                "id": rt[0], "content": rt[1],
                "sender_id": rt[2], "sender_name": rt[3],
            }

    # Get attachment info
    attachment = None
    if attachment_id:
        conn3 = get_db()
        att = conn3.execute(
            "SELECT id, filename, mime_type, size FROM attachments WHERE id = ?",
            [attachment_id],
        ).fetchone()
        conn3.close()
        if att:
            attachment = {
                "id": att[0], "filename": att[1],
                "mime_type": att[2], "size": att[3],
            }

    message_data = {
        "id": msg_id,
        "conversation_id": conv_id,
        "sender_id": user_id,
        "content": content or "",
        "created_at": created_at,
        "reply_to": reply_to,
        "reply_to_msg": reply_to_msg,
        "expires_at": expires_at,
        "attachment": attachment,
        "sender_name": sender[0] if sender else None,
        "sender_avatar": sender[1] if sender else None,
        "reactions": [],
    }

    # Fan out to all online conversation members
    all_members = manager.get_conversation_members(conv_id)
    for member_id in all_members:
        if manager.is_online(member_id):
            await manager.send_to_user(member_id, {
                "type": "message",
                "message": message_data,
            })

    # Send receipt status back to sender for each recipient
    for (member_id,) in members:
        await manager.send_to_user(user_id, {
            "type": "receipt",
            "message_id": msg_id,
            "user_id": member_id,
            "status": "sent",
        })


async def handle_receipt(user_id: int, payload: dict):
    msg_id = payload.get("message_id")
    status = payload.get("status")
    if not msg_id or status not in ("delivered", "read"):
        return

    conn = get_db()
    msg = conn.execute(
        "SELECT sender_id, conversation_id FROM messages WHERE id = ?",
        [msg_id],
    ).fetchone()
    if not msg:
        conn.close()
        return

    conn.execute(
        """INSERT INTO message_receipts (message_id, user_id, status, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(message_id, user_id) DO UPDATE SET status = ?, updated_at = datetime('now')""",
        [msg_id, user_id, status, status],
    )
    conn.commit()
    conn.close()

    sender_id = msg[0]
    if manager.is_online(sender_id):
        await manager.send_to_user(sender_id, {
            "type": "receipt",
            "message_id": msg_id,
            "user_id": user_id,
            "status": status,
        })


async def handle_read_all(user_id: int, payload: dict):
    conv_id = payload.get("conversation_id")
    if not conv_id:
        return

    conn = get_db()
    member = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, user_id],
    ).fetchone()
    if not member:
        conn.close()
        return

    unread = conn.execute(
        """SELECT m.id FROM messages m
        WHERE m.conversation_id = ? AND m.sender_id != ?
        AND NOT EXISTS (
            SELECT 1 FROM message_receipts mr
            WHERE mr.message_id = m.id AND mr.user_id = ? AND mr.status = 'read'
        )""",
        [conv_id, user_id, user_id],
    ).fetchall()

    for (msg_id,) in unread:
        conn.execute(
            """INSERT INTO message_receipts (message_id, user_id, status, updated_at)
            VALUES (?, ?, 'read', datetime('now'))
            ON CONFLICT(message_id, user_id) DO UPDATE SET status = 'read', updated_at = datetime('now')""",
            [msg_id, user_id],
        )
        msg = conn.execute("SELECT sender_id FROM messages WHERE id = ?", [msg_id]).fetchone()
        if msg and manager.is_online(msg[0]):
            await manager.send_to_user(msg[0], {
                "type": "receipt",
                "message_id": msg_id,
                "user_id": user_id,
                "status": "read",
            })

    conn.commit()
    conn.close()


async def handle_typing(user_id: int, payload: dict):
    conv_id = payload.get("conversation_id")
    is_typing = payload.get("is_typing", False)
    if conv_id is None:
        return

    conn = get_db()
    member = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, user_id],
    ).fetchone()
    conn.close()
    if not member:
        return

    members = manager.get_conversation_members(conv_id)
    for member_id in members:
        if member_id != user_id and manager.is_online(member_id):
            await manager.send_to_user(member_id, {
                "type": "typing",
                "conversation_id": conv_id,
                "user_id": user_id,
                "is_typing": is_typing,
            })


async def handle_reaction(user_id: int, payload: dict):
    msg_id = payload.get("message_id")
    emoji = payload.get("emoji")
    action = payload.get("action", "add")  # add or remove

    if not msg_id or not emoji:
        return

    conn = get_db()
    msg = conn.execute(
        "SELECT conversation_id FROM messages WHERE id = ?",
        [msg_id],
    ).fetchone()
    if not msg:
        conn.close()
        return

    conv_id = msg[0]

    if action == "add":
        conn.execute(
            "INSERT OR IGNORE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
            [msg_id, user_id, emoji],
        )
    else:
        conn.execute(
            "DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
            [msg_id, user_id, emoji],
        )
    conn.commit()

    # Get updated reactions
    reaction_rows = conn.execute(
        """SELECT mr.emoji, mr.user_id, u.display_name
        FROM message_reactions mr
        JOIN users u ON u.id = mr.user_id
        WHERE mr.message_id = ?
        ORDER BY mr.created_at""",
        [msg_id],
    ).fetchall()
    conn.close()

    reactions: dict[str, list[dict]] = {}
    for emoji_key, uid, display_name in reaction_rows:
        if emoji_key not in reactions:
            reactions[emoji_key] = []
        reactions[emoji_key].append({"user_id": uid, "display_name": display_name})

    reaction_data = [
        {"emoji": e, "count": len(u), "users": u}
        for e, u in reactions.items()
    ]

    # Broadcast to all members
    all_members = manager.get_conversation_members(conv_id)
    for member_id in all_members:
        if manager.is_online(member_id):
            await manager.send_to_user(member_id, {
                "type": "reaction",
                "message_id": msg_id,
                "conversation_id": conv_id,
                "reactions": reaction_data,
            })


HANDLERS = {
    "message": handle_message,
    "receipt": handle_receipt,
    "read_all": handle_read_all,
    "typing": handle_typing,
    "reaction": handle_reaction,
}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        user_id = decode_token(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(websocket, user_id)

    await broadcast_presence(user_id, "online")

    peers = manager.get_conversation_peers(user_id)
    for peer_id in peers:
        if manager.is_online(peer_id):
            await manager.send_to_user(user_id, {
                "type": "presence",
                "user_id": peer_id,
                "status": "online",
            })

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            event_type = payload.get("type")

            handler = HANDLERS.get(event_type)
            if handler:
                await handler(user_id, payload)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        await broadcast_presence(user_id, "offline")
