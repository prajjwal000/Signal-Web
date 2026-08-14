from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.database import get_db

router = APIRouter()


class AddContactRequest(BaseModel):
    contact_id: int


@router.get("")
def list_contacts(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        """SELECT u.id, u.username, u.display_name, u.phone, u.avatar_url
        FROM contacts c
        JOIN users u ON u.id = c.contact_id
        WHERE c.user_id = ?
        ORDER BY u.display_name""",
        [current_user["id"]],
    ).fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "username": r[1],
            "display_name": r[2],
            "phone": r[3],
            "avatar_url": r[4],
        }
        for r in rows
    ]


@router.post("")
def add_contact(req: AddContactRequest, current_user: dict = Depends(get_current_user)):
    if req.contact_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself as contact")

    conn = get_db()
    user = conn.execute("SELECT id FROM users WHERE id = ?", [req.contact_id]).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    existing = conn.execute(
        "SELECT 1 FROM contacts WHERE user_id = ? AND contact_id = ?",
        [current_user["id"], req.contact_id],
    ).fetchone()
    if existing:
        conn.close()
        return {"ok": True, "message": "Already in contacts"}

    conn.execute(
        "INSERT INTO contacts (user_id, contact_id) VALUES (?, ?)",
        [current_user["id"], req.contact_id],
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@router.get("/search")
def search_users(q: str = "", current_user: dict = Depends(get_current_user)):
    conn = get_db()
    pattern = f"%{q}%"
    rows = conn.execute(
        """SELECT id, username, display_name, phone, avatar_url
        FROM users
        WHERE id != ?
          AND (username LIKE ? OR display_name LIKE ? OR phone LIKE ?)
        ORDER BY display_name
        LIMIT 20""",
        [current_user["id"], pattern, pattern, pattern],
    ).fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "username": r[1],
            "display_name": r[2],
            "phone": r[3],
            "avatar_url": r[4],
        }
        for r in rows
    ]
