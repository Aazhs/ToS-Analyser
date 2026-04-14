from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .ai import analyze_text_with_gemini
from .db import init_db, list_history, save_analysis
from .schemas import AnalyzeRequest, AnalyzeResponse, HistoryResponse
from .tosdr import lookup_tosdr, normalize_domain


load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def extract_domain(domain: str | None, url: str | None) -> str:
    if domain:
        return normalize_domain(domain)
    if url:
        parsed = urlparse(url)
        host = parsed.netloc or parsed.path
        return normalize_domain(host)
    return ""


app = FastAPI(title="AI ToS Analyzer API", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db(os.getenv("DATABASE_PATH"))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest) -> dict:
    domain = extract_domain(payload.domain, payload.url)
    if not domain:
        raise HTTPException(status_code=400, detail="Provide either domain or url.")

    tosdr_result = None
    try:
        tosdr_result = await lookup_tosdr(domain)
    except Exception:
        tosdr_result = None

    if tosdr_result:
        data = {
            "domain": tosdr_result.domain,
            "source": tosdr_result.source,
            "rating": tosdr_result.rating,
            "risk_summary": tosdr_result.risk_summary,
            "key_points": tosdr_result.key_points,
            "risks": tosdr_result.risks,
            "data_usage": tosdr_result.data_usage,
            "hidden_costs": tosdr_result.hidden_costs,
            "user_rights": tosdr_result.user_rights,
        }
    else:
        if not payload.text or not payload.text.strip():
            raise HTTPException(
                status_code=400,
                detail="No ToS;DR record found. Provide extracted text for AI analysis.",
            )
        data = analyze_text_with_gemini(domain, payload.text)

    stored = save_analysis(data, os.getenv("DATABASE_PATH"))
    stored.pop("id", None)
    return stored


@app.get("/history", response_model=HistoryResponse)
def history(limit: int = Query(default=50, ge=1, le=200)) -> dict:
    items = list_history(limit=limit, db_path=os.getenv("DATABASE_PATH"))
    return {"items": items}
