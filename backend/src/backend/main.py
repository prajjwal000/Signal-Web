from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import get_db, test_connection
from backend.models import init_schema
from backend.seed import seed as run_seed
from backend.ws import router as ws_router

app = FastAPI(title="Signal Clone API")
app.include_router(ws_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/users")
def list_users():
    conn = get_db()
    users = conn.execute("SELECT id, username, display_name FROM users").fetchall()
    conn.close()
    return [{"id": u[0], "username": u[1], "display_name": u[2]} for u in users]


@app.post("/seed")
def seed():
    run_seed()
    return {"status": "seeded"}
