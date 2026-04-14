from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx


TOSDR_API_BASE = "https://api.tosdr.org"
SEARCH_ENDPOINT = f"{TOSDR_API_BASE}/search/v5"
SERVICE_ENDPOINT = f"{TOSDR_API_BASE}/service/v3"


@dataclass
class TOSDRResult:
    domain: str
    source: str
    rating: str | None
    risk_summary: str
    key_points: list[str]
    risks: str
    data_usage: str
    hidden_costs: str
    user_rights: str


def normalize_domain(value: str) -> str:
    raw = value.strip().lower()
    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        host = parsed.netloc
    else:
        host = raw

    host = host.split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host


def _domain_from_url_like(url_value: str) -> str:
    value = url_value.strip().lower()
    if not value:
        return ""

    if value.startswith("http://") or value.startswith("https://"):
        host = urlparse(value).netloc
    else:
        host = urlparse(f"https://{value}").netloc

    host = host.split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host


def _pick_service(services: list[dict[str, Any]], domain: str) -> dict[str, Any] | None:
    if not services:
        return None

    target = normalize_domain(domain)

    for service in services:
        urls = service.get("urls") or []
        for url_value in urls:
            host = _domain_from_url_like(url_value)
            if host == target or host.endswith(f".{target}") or target.endswith(f".{host}"):
                return service

    return services[0]


def _summarize_points(points: list[dict[str, Any]]) -> dict[str, str | list[str]]:
    approved = [p for p in points if p.get("status") == "approved"]
    if not approved:
        approved = points

    key_points: list[str] = []
    bad_titles: list[str] = []
    data_usage: list[str] = []
    hidden_costs: list[str] = []
    user_rights: list[str] = []

    for point in approved[:12]:
        title = (point.get("title") or "").strip()
        analysis = (point.get("analysis") or "").strip()
        case = point.get("case") or {}
        classification = (case.get("classification") or "neutral").lower()

        if title:
            label = classification.capitalize()
            key_points.append(f"[{label}] {title}")

        lowered = f"{title} {analysis}".lower()
        if classification in {"bad", "blocker"} and title:
            bad_titles.append(title)

        if any(token in lowered for token in ["data", "track", "ads", "privacy", "share"]):
            data_usage.append(title or analysis)

        if any(token in lowered for token in ["fee", "cost", "charge", "subscription", "renew"]):
            hidden_costs.append(title or analysis)

        if any(token in lowered for token in ["delete", "access", "export", "cancel", "appeal", "arbitration", "rights"]):
            user_rights.append(title or analysis)

    risk_summary = "No major risks were highlighted by ToS;DR points."
    if bad_titles:
        risk_summary = f"Potential concerns include: {', '.join(bad_titles[:3])}."

    return {
        "key_points": key_points[:6],
        "risk_summary": risk_summary,
        "risks": "; ".join(bad_titles[:4]) or "No clear high-risk clauses surfaced by ToS;DR.",
        "data_usage": "; ".join([x for x in data_usage if x][:3])
        or "No specific data-usage highlights surfaced.",
        "hidden_costs": "; ".join([x for x in hidden_costs if x][:3])
        or "No hidden-cost clauses were highlighted.",
        "user_rights": "; ".join([x for x in user_rights if x][:3])
        or "No explicit user-rights clauses were highlighted.",
    }


async def lookup_tosdr(domain: str) -> TOSDRResult | None:
    normalized = normalize_domain(domain)
    if not normalized:
        return None

    async with httpx.AsyncClient(timeout=15.0) as client:
        search_resp = await client.get(SEARCH_ENDPOINT, params={"query": normalized})
        search_resp.raise_for_status()
        services = search_resp.json().get("services") or []
        service = _pick_service(services, normalized)
        if not service:
            return None

        service_id = service.get("id")
        if not service_id:
            return None

        detail_resp = await client.get(
            SERVICE_ENDPOINT,
            params={"id": service_id, "lang": "en", "show_all": "false"},
        )
        detail_resp.raise_for_status()
        details = detail_resp.json()

    points = details.get("points") or []
    pieces = _summarize_points(points)

    return TOSDRResult(
        domain=normalized,
        source="ToS;DR",
        rating=details.get("rating") or service.get("rating"),
        risk_summary=str(pieces["risk_summary"]),
        key_points=list(pieces["key_points"]),
        risks=str(pieces["risks"]),
        data_usage=str(pieces["data_usage"]),
        hidden_costs=str(pieces["hidden_costs"]),
        user_rights=str(pieces["user_rights"]),
    )
