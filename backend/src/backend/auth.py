import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException

from backend.database import get_db

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRY_DAYS = 7


def encode_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(
    authorization: str = Header(None),
    token: str | None = None,
) -> dict:
    if authorization and authorization.startswith("Bearer "):
        raw = authorization.split(" ", 1)[1]
    elif token:
        raw = token
    else:
        raise HTTPException(status_code=401, detail="Missing token")
    user_id = decode_token(raw)
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, display_name, phone, avatar_url, last_seen, created_at FROM users WHERE id = ?",
        [user_id],
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": user[0],
        "username": user[1],
        "display_name": user[2],
        "phone": user[3],
        "avatar_url": user[4],
        "last_seen": user[5],
        "created_at": user[6],
    }
