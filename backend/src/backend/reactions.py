from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.database import get_db

router = APIRouter()


class ReactionRequest(BaseModel):
    emoji: str


@router.post("/{msg_id}/reactions")
def add_reaction(msg_id: int, req: ReactionRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    # Verify message exists
    msg = conn.execute("SELECT id FROM messages WHERE id = ?", [msg_id]).fetchone()
    if not msg:
        conn.close()
        raise HTTPException(status_code=404, detail="Message not found")

    conn.execute(
        "INSERT OR IGNORE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
        [msg_id, uid, req.emoji],
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/{msg_id}/reactions/{emoji}")
def remove_reaction(msg_id: int, emoji: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = current_user["id"]

    conn.execute(
        "DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
        [msg_id, uid, emoji],
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/{msg_id}/reactions")
def get_reactions(msg_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        """SELECT mr.emoji, mr.user_id, u.display_name
        FROM message_reactions mr
        JOIN users u ON u.id = mr.user_id
        WHERE mr.message_id = ?
        ORDER BY mr.created_at""",
        [msg_id],
    ).fetchall()
    conn.close()

    # Group by emoji
    reactions: dict[str, list[dict]] = {}
    for emoji, user_id, display_name in rows:
        if emoji not in reactions:
            reactions[emoji] = []
        reactions[emoji].append({"user_id": user_id, "display_name": display_name})

    return [
        {"emoji": emoji, "count": len(users), "users": users}
        for emoji, users in reactions.items()
    ]
