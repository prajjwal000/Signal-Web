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
        # Update last_seen
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
        """Get all user IDs who share a conversation with user_id."""
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
        """Get all member IDs of a conversation."""
        conn = get_db()
        rows = conn.execute(
            "SELECT user_id FROM conversation_members WHERE conversation_id = ?",
            [conv_id],
        ).fetchall()
        conn.close()
        return [r[0] for r in rows]


manager = ConnectionManager()


async def broadcast_presence(user_id: int, status: str):
    """Broadcast presence to all conversation peers who are online."""
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
    if not conv_id or not content:
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

    # Insert message
    conn.execute(
        "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
        [conv_id, user_id, content],
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

    message_data = {
        "id": msg_id,
        "conversation_id": conv_id,
        "sender_id": user_id,
        "content": content,
        "created_at": created_at,
        "sender_name": sender[0] if sender else None,
        "sender_avatar": sender[1] if sender else None,
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
    # Verify the message exists, get its sender, and check user membership
    msg = conn.execute(
        "SELECT sender_id, conversation_id FROM messages WHERE id = ?",
        [msg_id],
    ).fetchone()
    if not msg:
        conn.close()
        return

    # Update receipt
    conn.execute(
        """INSERT INTO message_receipts (message_id, user_id, status, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(message_id, user_id) DO UPDATE SET status = ?, updated_at = datetime('now')""",
        [msg_id, user_id, status, status],
    )
    conn.commit()
    conn.close()

    # Notify the original sender
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
    # Verify membership
    member = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, user_id],
    ).fetchone()
    if not member:
        conn.close()
        return

    # Get all messages in this conversation that don't have a read receipt from this user
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
        # Notify each message's sender
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

    # Verify membership
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


HANDLERS = {
    "message": handle_message,
    "receipt": handle_receipt,
    "read_all": handle_read_all,
    "typing": handle_typing,
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

    # Send initial presence to peers
    await broadcast_presence(user_id, "online")

    # Send online status of peers to this user
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
