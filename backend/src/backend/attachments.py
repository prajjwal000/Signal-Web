import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response

from backend.auth import get_current_user
from backend.database import get_db

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    mime = file.content_type or "application/octet-stream"

    conn = get_db()
    conn.execute(
        "INSERT INTO attachments (sender_id, filename, mime_type, size, data) VALUES (?, ?, ?, ?, ?)",
        [current_user["id"], file.filename, mime, len(data), data],
    )
    att_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit()
    conn.close()

    return {
        "id": att_id,
        "filename": file.filename,
        "mime_type": mime,
        "size": len(data),
    }


@router.get("/{att_id}")
def get_attachment(att_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT filename, mime_type, size, data FROM attachments WHERE id = ?",
        [att_id],
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")

    return Response(
        content=row[3],
        media_type=row[1],
        headers={
            "Content-Disposition": f'inline; filename="{row[0]}"',
            "Content-Length": str(row[2]),
        },
    )


@router.get("/{att_id}/info")
def get_attachment_info(att_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute(
        "SELECT id, filename, mime_type, size, sender_id, created_at FROM attachments WHERE id = ?",
        [att_id],
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")

    return {
        "id": row[0],
        "filename": row[1],
        "mime_type": row[2],
        "size": row[3],
        "sender_id": row[4],
        "created_at": row[5],
    }
