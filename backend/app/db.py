import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "tos_analyzer.db"


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    target = Path(db_path) if db_path else DEFAULT_DB_PATH
    conn = sqlite3.connect(target)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str | None = None) -> None:
    with get_connection(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                source TEXT NOT NULL,
                rating TEXT,
                risk_summary TEXT NOT NULL,
                key_points_json TEXT NOT NULL,
                risks TEXT NOT NULL,
                data_usage TEXT NOT NULL,
                hidden_costs TEXT NOT NULL,
                user_rights TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_analysis(analysis: dict[str, Any], db_path: str | None = None) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()

    with get_connection(db_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO analyses (
                domain, source, rating, risk_summary, key_points_json,
                risks, data_usage, hidden_costs, user_rights, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                analysis["domain"],
                analysis["source"],
                analysis.get("rating"),
                analysis["risk_summary"],
                json.dumps(analysis["key_points"]),
                analysis["risks"],
                analysis["data_usage"],
                analysis["hidden_costs"],
                analysis["user_rights"],
                created_at,
            ),
        )
        conn.commit()
        row_id = cursor.lastrowid

    return {
        **analysis,
        "id": int(row_id),
        "created_at": created_at,
    }


def list_history(limit: int = 50, db_path: str | None = None) -> list[dict[str, Any]]:
    with get_connection(db_path) as conn:
        rows = conn.execute(
            """
            SELECT id, domain, source, rating, risk_summary, key_points_json,
                   risks, data_usage, hidden_costs, user_rights, created_at
            FROM analyses
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items: list[dict[str, Any]] = []
    for row in rows:
        items.append(
            {
                "id": int(row["id"]),
                "domain": row["domain"],
                "source": row["source"],
                "rating": row["rating"],
                "risk_summary": row["risk_summary"],
                "key_points": json.loads(row["key_points_json"]),
                "risks": row["risks"],
                "data_usage": row["data_usage"],
                "hidden_costs": row["hidden_costs"],
                "user_rights": row["user_rights"],
                "created_at": row["created_at"],
            }
        )

    return items
