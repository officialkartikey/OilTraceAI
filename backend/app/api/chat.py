from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Any

from app.services.chat_service import handle_chat

router = APIRouter()


class ChatHistoryTurn(BaseModel):
    role: str  # "user" | "bot"
    text: str
    type: Optional[str] = None
    data: Optional[dict] = None


class ChatRequest(BaseModel):
    message: str
    investigation_id: Optional[str] = None
    history: Optional[List[ChatHistoryTurn]] = None


@router.post("")
@router.post("/")
async def chat(req: ChatRequest):
    """
    Chatbot endpoint -- no LLM API key required. Explains investigation
    results and methodology in plain language using the investigation's
    actual data, reasons about likely environmental impact (ocean vs land,
    via free reverse-geocoding), compares against historical spills, gives
    actionable recommendations, drafts a copy-ready incident summary, and
    surfaces live oil-spill news headlines (via a free public RSS feed).

    `history` (optional): the last few turns of the conversation, so the
    bot can resolve short follow-ups like "why?" or "tell me more" without
    the user having to repeat context.
    """
    history = [turn.model_dump() for turn in req.history] if req.history else None
    result = await handle_chat(req.investigation_id, req.message, history)
    return result
