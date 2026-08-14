import asyncio
import json
import os
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.auth import decode_token
from backend.database import get_db

NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "")
NTFY_USERNAME = os.environ.get("NTFY_USERNAME", "")
NTFY_USER_ID: int | None = None


def _load_ntfy_user_id():
    global NTFY_USER_ID
    if not NTFY_USERNAME:
        return
    try:
        conn = get_db()
        row = conn.execute("SELECT id FROM users WHERE username = ?", [NTFY_USERNAME]).fetchone()
        conn.close()
        NTFY_USER_ID = row[0] if row else None
    except Exception:
        NTFY_USER_ID = None


def _get_ntfy_user_id() -> int | None:
    global NTFY_USER_ID
    if NTFY_USER_ID is not None:
        return NTFY_USER_ID
    if not NTFY_USERNAME:
        return None
    try:
        conn = get_db()
        row = conn.execute("SELECT id FROM users WHERE username = ?", [NTFY_USERNAME]).fetchone()
        conn.close()
        if row:
            NTFY_USER_ID = row[0]
            return NTFY_USER_ID
    except Exception:
        pass
    return None


def _send_ntfy(title: str, message: str):
    if not NTFY_TOPIC:
        print(f"[ntfy] NTFY_TOPIC is empty, skipping")
        return
    try:
        import http.client, ssl
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection("ntfy.sh", timeout=10, context=ctx, source_address=("0.0.0.0", 0))
        conn.request(
            "POST",
            f"/{NTFY_TOPIC}",
            body=message.encode("utf-8"),
            headers={"Title": title, "Priority": "high", "Content-Type": "application/octet-stream"},
        )
        resp = conn.getresponse()
        print(f"[ntfy] Sent OK: {resp.status}")
        conn.close()
    except Exception as e:
        print(f"[ntfy] FAILED: {e}")


router = APIRouter()


class ConnectionManager:
    IDLE_TIMEOUT = 60  # seconds — kill connection if no activity

    def __init__(self):
        self.active: dict[int, WebSocket] = {}
        self.last_activity: dict[int, float] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active[user_id] = websocket
        self.last_activity[user_id] = time.time()
        conn = get_db()
        conn.execute(
            "UPDATE users SET last_seen = datetime('now') WHERE id = ?",
            [user_id],
        )
        conn.commit()
        conn.close()

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)
        self.last_activity.pop(user_id, None)
        conn = get_db()
        conn.execute(
            "UPDATE users SET last_seen = datetime('now') WHERE id = ?",
            [user_id],
        )
        conn.commit()
        conn.close()

    def touch(self, user_id: int):
        """Update last_activity timestamp on any received message."""
        self.last_activity[user_id] = time.time()

    async def cleanup_idle(self):
        """Terminate connections with no activity for IDLE_TIMEOUT seconds."""
        now = time.time()
        idle_users = [
            uid for uid, ts in self.last_activity.items()
            if now - ts > self.IDLE_TIMEOUT
        ]
        for uid in idle_users:
            ws = self.active.get(uid)
            if ws:
                try:
                    await ws.close(code=4002, reason="Idle timeout")
                except Exception:
                    pass
            self.disconnect(uid)

    async def send_to_user(self, user_id: int, message: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

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
    expires_in = payload.get("expires_in")

    if not conv_id:
        return
    if not content and not attachment_id:
        return

    conn = get_db()
    try:
        member = conn.execute(
            "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
            [conv_id, user_id],
        ).fetchone()
        if not member:
            return

        expires_at = None
        if expires_in and expires_in > 0:
            expires_at = conn.execute(
                "SELECT datetime('now', '+' || ? || ' seconds')",
                [expires_in],
            ).fetchone()[0]

        conn.execute(
            "INSERT INTO messages (conversation_id, sender_id, content, reply_to, expires_at) VALUES (?, ?, ?, ?, ?)",
            [conv_id, user_id, content or "", reply_to, expires_at],
        )
        msg_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        created_at = conn.execute("SELECT datetime('now')").fetchone()[0]

        conn.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
            [conv_id],
        )

        sender = conn.execute(
            "SELECT display_name, avatar_url FROM users WHERE id = ?",
            [user_id],
        ).fetchone()

        other_member_rows = conn.execute(
            "SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?",
            [conv_id, user_id],
        ).fetchall()
        other_member_ids = [r[0] for r in other_member_rows]

        for mid in other_member_ids:
            conn.execute(
                "INSERT INTO message_receipts (message_id, user_id, status) VALUES (?, ?, 'sent')",
                [msg_id, mid],
            )

        reply_to_msg = None
        if reply_to:
            rt = conn.execute(
                """SELECT m.id, m.content, m.sender_id, u.display_name
                FROM messages m JOIN users u ON u.id = m.sender_id
                WHERE m.id = ?""",
                [reply_to],
            ).fetchone()
            if rt:
                reply_to_msg = {
                    "id": rt[0], "content": rt[1],
                    "sender_id": rt[2], "sender_name": rt[3],
                }

        attachment = None
        if attachment_id:
            att = conn.execute(
                "SELECT id, filename, mime_type, size FROM attachments WHERE id = ?",
                [attachment_id],
            ).fetchone()
            if att:
                attachment = {
                    "id": att[0], "filename": att[1],
                    "mime_type": att[2], "size": att[3],
                }

        conn.commit()
    finally:
        conn.close()

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

    # Send to sender FIRST — this is the server ACK that the message was saved
    if manager.is_online(user_id):
        await manager.send_to_user(user_id, {
            "type": "message",
            "message": message_data,
        })

    # Send receipt confirmations to sender for each other member
    for mid in other_member_ids:
        if manager.is_online(user_id):
            await manager.send_to_user(user_id, {
                "type": "receipt",
                "message_id": msg_id,
                "user_id": mid,
                "status": "sent",
            })

    # Broadcast to other members (best-effort, don't fail if one member is offline)
    for member_id in other_member_ids:
        if manager.is_online(member_id):
            await manager.send_to_user(member_id, {
                "type": "message",
                "message": message_data,
            })

    # Ntfy easter egg (fire-and-forget in thread)
    try:
        ntfy_uid = _get_ntfy_user_id()
        print(f"[ntfy] ntfy_uid={ntfy_uid}, other_member_ids={other_member_ids}, user_id={user_id}, NTFY_TOPIC={NTFY_TOPIC}, NTFY_USERNAME={NTFY_USERNAME}")
        if ntfy_uid and ntfy_uid in other_member_ids and user_id != ntfy_uid:
            sender_display = sender[0] if sender else "Someone"
            loop = asyncio.get_running_loop()
            loop.run_in_executor(None, _send_ntfy, "Signal Clone", f"New message from {sender_display}: {content[:100]}")
        else:
            print(f"[ntfy] Condition not met: uid={ntfy_uid}, in_members={ntfy_uid in other_member_ids if ntfy_uid else 'N/A'}, not_self={user_id != ntfy_uid if ntfy_uid else 'N/A'}")
    except Exception as e:
        print(f"[ntfy] Exception in handle_message ntfy block: {e}")


async def handle_receipt(user_id: int, payload: dict):
    msg_id = payload.get("message_id")
    status = payload.get("status")
    if not msg_id or status not in ("delivered", "read"):
        return

    conn = get_db()
    try:
        msg = conn.execute(
            "SELECT sender_id FROM messages WHERE id = ?",
            [msg_id],
        ).fetchone()
        if not msg:
            return

        conn.execute(
            """INSERT INTO message_receipts (message_id, user_id, status, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(message_id, user_id) DO UPDATE SET status = ?, updated_at = datetime('now')""",
            [msg_id, user_id, status, status],
        )
        conn.commit()

        sender_id = msg[0]
    finally:
        conn.close()

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
    try:
        member = conn.execute(
            "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
            [conv_id, user_id],
        ).fetchone()
        if not member:
            return

        unread = conn.execute(
            """SELECT m.id, m.sender_id FROM messages m
            WHERE m.conversation_id = ? AND m.sender_id != ?
            AND NOT EXISTS (
                SELECT 1 FROM message_receipts mr
                WHERE mr.message_id = m.id AND mr.user_id = ? AND mr.status = 'read'
            )""",
            [conv_id, user_id, user_id],
        ).fetchall()

        for msg_id, sender_id in unread:
            conn.execute(
                """INSERT INTO message_receipts (message_id, user_id, status, updated_at)
                VALUES (?, ?, 'read', datetime('now'))
                ON CONFLICT(message_id, user_id) DO UPDATE SET status = 'read', updated_at = datetime('now')""",
                [msg_id, user_id],
            )

        conn.commit()

        for msg_id, sender_id in unread:
            if manager.is_online(sender_id):
                await manager.send_to_user(sender_id, {
                    "type": "receipt",
                    "message_id": msg_id,
                    "user_id": user_id,
                    "status": "read",
                })

        await manager.send_to_user(user_id, {
            "type": "conversation_update",
            "conversation_id": conv_id,
            "unread_count": 0,
        })
    finally:
        conn.close()


async def handle_typing(user_id: int, payload: dict):
    conv_id = payload.get("conversation_id")
    is_typing = payload.get("is_typing", False)
    if conv_id is None:
        return

    conn = get_db()
    try:
        member = conn.execute(
            "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
            [conv_id, user_id],
        ).fetchone()
        if not member:
            return
    finally:
        conn.close()

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
    action = payload.get("action", "add")

    if not msg_id or not emoji:
        return

    conn = get_db()
    try:
        msg = conn.execute(
            "SELECT conversation_id FROM messages WHERE id = ?",
            [msg_id],
        ).fetchone()
        if not msg:
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

        reaction_rows = conn.execute(
            """SELECT mr.emoji, mr.user_id, u.display_name
            FROM message_reactions mr
            JOIN users u ON u.id = mr.user_id
            WHERE mr.message_id = ?
            ORDER BY mr.created_at""",
            [msg_id],
        ).fetchall()
    finally:
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

    all_members = manager.get_conversation_members(conv_id)
    for member_id in all_members:
        if manager.is_online(member_id):
            await manager.send_to_user(member_id, {
                "type": "reaction",
                "message_id": msg_id,
                "conversation_id": conv_id,
                "reactions": reaction_data,
            })


async def handle_user_search(user_id: int, payload: dict):
    q = payload.get("q", "").strip()
    if len(q) < 2:
        await manager.send_to_user(user_id, {
            "type": "user_search_results",
            "query": q,
            "results": [],
        })
        return

    conn = get_db()
    try:
        pattern = f"%{q}%"
        rows = conn.execute(
            """SELECT id, username, display_name, phone, avatar_url
            FROM users
            WHERE id != ?
              AND (username LIKE ? OR display_name LIKE ? OR phone LIKE ?)
            ORDER BY display_name
            LIMIT 20""",
            [user_id, pattern, pattern, pattern],
        ).fetchall()
    finally:
        conn.close()

    await manager.send_to_user(user_id, {
        "type": "user_search_results",
        "query": q,
        "results": [
            {"id": r[0], "username": r[1], "display_name": r[2], "phone": r[3], "avatar_url": r[4]}
            for r in rows
        ],
    })


async def handle_ping(user_id: int, payload: dict):
    """Respond to client heartbeat pongs."""
    await manager.send_to_user(user_id, {"type": "pong"})


HANDLERS = {
    "message": handle_message,
    "receipt": handle_receipt,
    "read_all": handle_read_all,
    "typing": handle_typing,
    "reaction": handle_reaction,
    "user_search": handle_user_search,
    "ping": handle_ping,
}


async def _idle_cleanup_loop():
    """Periodically close connections with no activity."""
    try:
        while True:
            await asyncio.sleep(30)
            await manager.cleanup_idle()
    except asyncio.CancelledError:
        pass


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

    # Start idle cleanup task
    cleanup_task = asyncio.create_task(_idle_cleanup_loop())

    try:
        while True:
            data = await websocket.receive_text()
            manager.touch(user_id)
            payload = json.loads(data)
            event_type = payload.get("type")

            handler = HANDLERS.get(event_type)
            if handler:
                await handler(user_id, payload)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id)
        await broadcast_presence(user_id, "offline")
        cleanup_task.cancel()
