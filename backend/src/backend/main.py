import os

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth import get_current_user
from backend.auth_router import router as auth_router
from backend.contacts import router as contacts_router
from backend.conversations import router as conversations_router
from backend.database import get_db, test_connection
from backend.models import init_schema
from backend.seed import seed as run_seed
from backend.ws import router as ws_router

app = FastAPI(title="Signal Clone API")

users_router = APIRouter()

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(contacts_router, prefix="/contacts", tags=["contacts"])
app.include_router(conversations_router, prefix="/conversations", tags=["conversations"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(ws_router)


@app.on_event("startup")
def startup():
    conn = get_db()
    init_schema(conn)
    conn.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/test-db")
def test_db():
    return test_connection()


@app.post("/seed")
def seed():
    run_seed()
    return {"status": "seeded"}


@users_router.get("/search")
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
