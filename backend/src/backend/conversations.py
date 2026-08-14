from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.database import get_db

router = APIRouter()


class CreateConversationRequest(BaseModel):
    participant_id: int | None = None
    name: str | None = None
    member_ids: list[int] | None = None


class AddMemberRequest(BaseModel):
    user_id: int


@router.get("")
def list_conversations(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    rows = conn.execute(
        """SELECT
            c.id, c.is_group, c.name, c.updated_at,
            m.id AS msg_id, m.content AS last_content, m.created_at AS last_time,
            u.id AS sender_id, u.display_name AS sender_name, u.avatar_url AS sender_avatar,
            (SELECT COUNT(*) FROM messages msg
             LEFT JOIN message_receipts mr ON mr.message_id = msg.id AND mr.user_id = ?
             WHERE msg.conversation_id = c.id AND mr.message_id IS NULL
            ) AS unread_count
        FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id = c.id
        LEFT JOIN messages m ON m.conversation_id = c.id
            AND m.created_at = (SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id)
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE cm.user_id = ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC""",
        [uid, uid],
    ).fetchall()
    conn.close()

    result = []
    for r in rows:
        conv = {
            "id": r[0],
            "is_group": bool(r[1]),
            "name": r[2],
            "updated_at": r[3],
            "unread_count": r[10],
        }
        if r[4] is not None:
            conv["last_message"] = {
                "id": r[4],
                "content": r[5],
                "created_at": r[6],
                "sender_id": r[7],
                "sender_name": r[8],
                "sender_avatar": r[9] if not r[1] else None,
            }
        else:
            conv["last_message"] = None

        result.append(conv)

    # For direct conversations, fetch the other member's info
    conn2 = get_db()
    for conv in result:
        if not conv["is_group"]:
            other = conn2.execute(
                """SELECT u.id, u.display_name, u.avatar_url FROM conversation_members cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.conversation_id = ? AND cm.user_id != ?""",
                [conv["id"], uid],
            ).fetchone()
            if other:
                conv["other_user"] = {
                    "id": other[0],
                    "display_name": other[1],
                    "avatar_url": other[2],
                }
        else:
            count = conn2.execute(
                "SELECT COUNT(*) FROM conversation_members WHERE conversation_id = ?",
                [conv["id"]],
            ).fetchone()
            conv["member_count"] = count[0] if count else 0
    conn2.close()

    return result


@router.post("")
def create_conversation(req: CreateConversationRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    # Direct conversation
    if req.participant_id:
        other = conn.execute("SELECT id FROM users WHERE id = ?", [req.participant_id]).fetchone()
        if not other:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")

        # Check if direct conversation already exists
        existing = conn.execute(
            """SELECT c.id FROM conversations c
            JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
            JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
            WHERE c.is_group = 0""",
            [uid, req.participant_id],
        ).fetchone()
        if existing:
            conn.close()
            return {"id": existing[0], "is_group": False}

        conn.execute("INSERT INTO conversations (is_group) VALUES (0)")
        conv_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
            [conv_id, uid],
        )
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
            [conv_id, req.participant_id],
        )
        conn.commit()
        conn.close()
        return {"id": conv_id, "is_group": False}

    # Group conversation
    if req.name and req.member_ids:
        conn.execute(
            "INSERT INTO conversations (is_group, name) VALUES (1, ?)",
            [req.name],
        )
        conv_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'admin')",
            [conv_id, uid],
        )
        for mid in req.member_ids:
            if mid != uid:
                conn.execute(
                    "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
                    [conv_id, mid],
                )
        conn.commit()
        conn.close()
        return {"id": conv_id, "is_group": True}

    conn.close()
    raise HTTPException(status_code=400, detail="Provide participant_id for direct or name+member_ids for group")


@router.get("/{conv_id}/members")
def get_members(conv_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    # Verify membership
    member = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, uid],
    ).fetchone()
    if not member:
        conn.close()
        raise HTTPException(status_code=403, detail="Not a member")

    rows = conn.execute(
        """SELECT u.id, u.username, u.display_name, u.avatar_url, cm.role, cm.joined_at
        FROM conversation_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id = ?
        ORDER BY cm.role DESC, u.display_name""",
        [conv_id],
    ).fetchall()
    conn.close()

    return [
        {
            "id": r[0],
            "username": r[1],
            "display_name": r[2],
            "avatar_url": r[3],
            "role": r[4],
            "joined_at": r[5],
        }
        for r in rows
    ]


@router.get("/{conv_id}/messages")
def get_messages(
    conv_id: int,
    limit: int = Query(default=50, le=100),
    before: int | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    conn = get_db()
    uid = current_user["id"]

    # Verify membership
    member = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, uid],
    ).fetchone()
    if not member:
        conn.close()
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    if before:
        rows = conn.execute(
            """SELECT m.id, m.sender_id, m.content, m.created_at,
                      m.reply_to, m.expires_at,
                      u.display_name, u.avatar_url
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_id = ? AND m.id < ?
            ORDER BY m.created_at DESC
            LIMIT ?""",
            [conv_id, before, limit],
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT m.id, m.sender_id, m.content, m.created_at,
                      m.reply_to, m.expires_at,
                      u.display_name, u.avatar_url
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?""",
            [conv_id, limit],
        ).fetchall()

    messages = []
    for r in rows:
        msg_id = r[0]

        # Receipts
        receipts = conn.execute(
            """SELECT mr.user_id, mr.status, u.display_name
            FROM message_receipts mr
            JOIN users u ON u.id = mr.user_id
            WHERE mr.message_id = ?""",
            [msg_id],
        ).fetchall()

        # Reactions
        reaction_rows = conn.execute(
            """SELECT mr.emoji, mr.user_id, u.display_name
            FROM message_reactions mr
            JOIN users u ON u.id = mr.user_id
            WHERE mr.message_id = ?
            ORDER BY mr.created_at""",
            [msg_id],
        ).fetchall()
        reactions: dict[str, list[dict]] = {}
        for emoji, user_id, display_name in reaction_rows:
            if emoji not in reactions:
                reactions[emoji] = []
            reactions[emoji].append({"user_id": user_id, "display_name": display_name})

        # Attachment
        attachment = None
        att_row = conn.execute(
            """SELECT a.id, a.filename, a.mime_type, a.size
            FROM attachments a
            WHERE a.id = (SELECT MAX(a2.id) FROM attachments a2 WHERE a2.sender_id = ? AND a2.created_at <= ?)
            LIMIT 1""",
            [r[1], r[3]],
        ).fetchone()

        # Reply-to message
        reply_to_msg = None
        if r[4]:
            rt = conn.execute(
                """SELECT m.id, m.content, m.sender_id, u.display_name
                FROM messages m JOIN users u ON u.id = m.sender_id
                WHERE m.id = ?""",
                [r[4]],
            ).fetchone()
            if rt:
                reply_to_msg = {
                    "id": rt[0],
                    "content": rt[1],
                    "sender_id": rt[2],
                    "sender_name": rt[3],
                }

        messages.append({
            "id": msg_id,
            "sender_id": r[1],
            "content": r[2],
            "created_at": r[3],
            "reply_to": r[4],
            "expires_at": r[5],
            "sender_name": r[6],
            "sender_avatar": r[7],
            "attachment": attachment,
            "reply_to_msg": reply_to_msg,
            "reactions": [
                {"emoji": emoji, "count": len(users), "users": users}
                for emoji, users in reactions.items()
            ],
            "receipts": [
                {"user_id": rc[0], "status": rc[1], "user_name": rc[2]}
                for rc in receipts
            ],
        })

    conn.close()
    messages.reverse()
    return messages


@router.post("/{conv_id}/members")
def add_member(conv_id: int, req: AddMemberRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    conv = conn.execute("SELECT is_group FROM conversations WHERE id = ?", [conv_id]).fetchone()
    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conv[0]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot add members to direct conversation")

    membership = conn.execute(
        "SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, uid],
    ).fetchone()
    if not membership:
        conn.close()
        raise HTTPException(status_code=403, detail="Not a member")

    user = conn.execute("SELECT id FROM users WHERE id = ?", [req.user_id]).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    existing = conn.execute(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, req.user_id],
    ).fetchone()
    if existing:
        conn.close()
        return {"ok": True, "message": "Already a member"}

    conn.execute(
        "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member')",
        [conv_id, req.user_id],
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/{conv_id}/members/{user_id}")
def remove_member(conv_id: int, user_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    conv = conn.execute("SELECT is_group FROM conversations WHERE id = ?", [conv_id]).fetchone()
    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conv[0]:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot remove members from direct conversation")

    caller_role = conn.execute(
        "SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, uid],
    ).fetchone()
    if not caller_role or caller_role[0] != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    # Prevent removing the last admin
    if user_id == uid:
        admin_count = conn.execute(
            "SELECT COUNT(*) FROM conversation_members WHERE conversation_id = ? AND role = 'admin'",
            [conv_id],
        ).fetchone()[0]
        if admin_count <= 1:
            conn.close()
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")

    conn.execute(
        "DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
        [conv_id, user_id],
    )
    conn.commit()
    conn.close()
    return {"ok": True}
