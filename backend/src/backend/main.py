from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import test_connection
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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/test-db")
def test_db():
    return test_connection()
