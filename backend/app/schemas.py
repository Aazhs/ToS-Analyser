from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    domain: str | None = Field(default=None, description="Target domain (e.g. example.com)")
    url: str | None = Field(default=None, description="Page URL where text was detected")
    text: str | None = Field(default=None, description="Visible policy/popup text")


class AnalyzeResponse(BaseModel):
    domain: str
    source: Literal["ToS;DR", "AI"]
    rating: str | None = None
    risk_summary: str
    key_points: list[str]
    risks: str
    data_usage: str
    hidden_costs: str
    user_rights: str
    created_at: datetime


class HistoryItem(AnalyzeResponse):
    id: int


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
