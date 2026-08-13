import os

import libsql


def get_db() -> libsql.Connection:
    url = os.environ.get("TURSO_DATABASE_URL", "file:local.db")
    auth_token = os.environ.get("TURSO_AUTH_TOKEN")

    kwargs: dict = {"database": url}
    if auth_token:
        kwargs["auth_token"] = auth_token

    return libsql.connect(**kwargs)


def test_connection() -> dict:
    conn = get_db()
    result = conn.execute("SELECT 1").fetchone()
    conn.close()
    return {"connected": result[0] == 1}
