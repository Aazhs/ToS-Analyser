from __future__ import annotations

import json
import os
import re
from typing import Any

from google import genai


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z0-9_-]*\n", "", stripped)
        stripped = re.sub(r"\n```$", "", stripped)
    return stripped.strip()


def _safe_json_parse(raw_text: str) -> dict[str, Any]:
    cleaned = _strip_code_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise
        return json.loads(match.group(0))


def _fallback_summary(domain: str) -> dict[str, Any]:
    return {
        "domain": domain,
        "source": "AI",
        "rating": None,
        "risk_summary": "Automated AI fallback is unavailable because GEMINI_API_KEY is not configured.",
        "key_points": [
            "Set GEMINI_API_KEY in backend/.env to enable detailed AI summaries.",
            "ToS;DR data will still be used whenever available.",
        ],
        "risks": "Unknown without AI analysis.",
        "data_usage": "Unknown without AI analysis.",
        "hidden_costs": "Unknown without AI analysis.",
        "user_rights": "Unknown without AI analysis.",
    }


def analyze_text_with_gemini(domain: str, text: str) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

    if not api_key:
        return _fallback_summary(domain)

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are analyzing Terms of Service / Privacy text for: {domain}

Return strict JSON only with this schema:
{{
  "risk_summary": "string",
  "key_points": ["string", "string", "... up to 6 items"],
  "risks": "string",
  "data_usage": "string",
  "hidden_costs": "string",
  "user_rights": "string"
}}

Rules:
- Be concise and practical for end users.
- Mention potentially harmful clauses when present.
- If details are missing, explicitly say "Not clearly specified".
- Keep each section under 60 words.

Text:
{text[:16000]}
"""

    response = client.models.generate_content(model=model, contents=prompt)
    raw = response.text or "{}"
    parsed = _safe_json_parse(raw)

    key_points = parsed.get("key_points")
    if not isinstance(key_points, list):
        key_points = ["Unable to parse structured key points from model output."]

    return {
        "domain": domain,
        "source": "AI",
        "rating": None,
        "risk_summary": str(parsed.get("risk_summary") or "Not clearly specified."),
        "key_points": [str(x) for x in key_points][:6],
        "risks": str(parsed.get("risks") or "Not clearly specified."),
        "data_usage": str(parsed.get("data_usage") or "Not clearly specified."),
        "hidden_costs": str(parsed.get("hidden_costs") or "Not clearly specified."),
        "user_rights": str(parsed.get("user_rights") or "Not clearly specified."),
    }
