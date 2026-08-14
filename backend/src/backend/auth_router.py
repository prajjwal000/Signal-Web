from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth import encode_token, get_current_user
from backend.database import get_db
from backend.seed import seed_user_data

router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    display_name: str
    phone: str | None = None


class VerifyRequest(BaseModel):
    username: str
    otp: str


@router.post("/register")
def register(req: RegisterRequest):
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ?", [req.username]
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Username already taken")

    if req.phone:
        phone_taken = conn.execute(
            "SELECT id FROM users WHERE phone = ?", [req.phone]
        ).fetchone()
        if phone_taken:
            conn.close()
            raise HTTPException(status_code=409, detail="Phone number already registered")

    conn.execute(
        "INSERT INTO users (username, display_name, phone) VALUES (?, ?, ?)",
        [req.username, req.display_name, req.phone],
    )
    conn.commit()
    user = conn.execute(
        "SELECT id, username, display_name, phone, avatar_url, last_seen, created_at FROM users WHERE username = ?",
        [req.username],
    ).fetchone()
    conn.close()

    return {
        "otp": "0000",
        "message": "Use this OTP to verify: 0000",
    }


@router.post("/verify")
def verify(req: VerifyRequest):
    if req.otp != "0000":
        raise HTTPException(status_code=400, detail="Invalid OTP")

    conn = get_db()
    user = conn.execute(
        "SELECT id, username, display_name, phone, avatar_url, last_seen, created_at FROM users WHERE username = ?",
        [req.username],
    ).fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user[0]

    # Auto-seed contacts and conversations for this user
    seed_user_data(user_id)

    token = encode_token(user_id)
    return {
        "token": token,
        "user": {
            "id": user[0],
            "username": user[1],
            "display_name": user[2],
            "phone": user[3],
            "avatar_url": user[4],
            "last_seen": user[5],
            "created_at": user[6],
        },
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
