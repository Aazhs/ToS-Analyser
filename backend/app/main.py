from __future__ import annotations

import html
import os
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx
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


POLICY_HINTS = (
    "terms",
    "privacy",
    "policy",
    "agreement",
    "consent",
    "cookie",
    "legal",
    "data",
)


def _clean_text(raw: str) -> str:
    return " ".join(str(raw or "").split()).strip()


def _policy_hint_count(text: str) -> int:
    lower = _clean_text(text).lower()
    return sum(1 for hint in POLICY_HINTS if hint in lower)


def _looks_like_meaningful_policy_text(text: str) -> bool:
    cleaned = _clean_text(text)
    if not cleaned:
        return False
    if len(cleaned) >= 1800:
        return True
    return len(cleaned) >= 260 and _policy_hint_count(cleaned) >= 2


def _html_to_text(content: str) -> str:
    # Remove non-content tags before stripping remaining markup.
    stripped = re.sub(r"(?is)<(script|style|noscript|svg|canvas|iframe)[^>]*>.*?</\1>", " ", content)
    stripped = re.sub(r"(?is)<br\s*/?>", "\n", stripped)
    stripped = re.sub(r"(?is)</p\s*>", "\n", stripped)
    stripped = re.sub(r"(?is)<[^>]+>", " ", stripped)
    return _clean_text(html.unescape(stripped))


async def _fetch_policy_text_from_url(url: str | None) -> str:
    raw_url = str(url or "").strip()
    if not raw_url:
        return ""

    parsed = urlparse(raw_url)
    if parsed.scheme not in {"http", "https"}:
        return ""

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=12.0) as client:
            response = await client.get(
                raw_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; ToS-Analyzer/1.0)",
                    "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
                },
            )
    except Exception:
        return ""

    if response.status_code >= 400:
        return ""

    content_type = (response.headers.get("content-type") or "").lower()
    body = response.text or ""
    if not body.strip():
        return ""

    if "html" in content_type or body.lstrip().startswith("<"):
        return _html_to_text(body)[:20000]

    return _clean_text(body)[:20000]


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
        submitted_text = _clean_text(payload.text or "")

        if (not submitted_text or not _looks_like_meaningful_policy_text(submitted_text)) and payload.url:
            fetched_text = await _fetch_policy_text_from_url(payload.url)
            if _looks_like_meaningful_policy_text(fetched_text):
                submitted_text = fetched_text
            elif fetched_text:
                submitted_hints = _policy_hint_count(submitted_text)
                fetched_hints = _policy_hint_count(fetched_text)

                if fetched_hints > submitted_hints and len(fetched_text) > len(submitted_text) * 1.2:
                    submitted_text = fetched_text
                elif submitted_text:
                    combined = _clean_text(f"{submitted_text}\n\n{fetched_text}")
                    if _policy_hint_count(combined) >= max(submitted_hints, fetched_hints):
                        submitted_text = combined[:20000]
                else:
                    submitted_text = fetched_text

        if not submitted_text:
            raise HTTPException(
                status_code=400,
                detail="No ToS;DR record found. Provide extracted text for AI analysis.",
            )
        data = analyze_text_with_gemini(domain, submitted_text)

    stored = save_analysis(data, os.getenv("DATABASE_PATH"))
    stored.pop("id", None)
    return stored


@app.get("/history", response_model=HistoryResponse)
def history(limit: int = Query(default=50, ge=1, le=200)) -> dict:
    items = list_history(limit=limit, db_path=os.getenv("DATABASE_PATH"))
    return {"items": items}
