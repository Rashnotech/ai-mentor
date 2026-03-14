#!/usr/bin/python3
"""Rubber Duck AI chat endpoint — guides learners without giving full solutions."""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, AsyncGenerator
from groq import Groq
from core.config import settings
from auth.dependencies import get_currrent_user
import json

router = APIRouter(prefix="/ai", tags=["AI"])

RUBBER_DUCK_SYSTEM_PROMPT = """You are a Rubber Duck — a patient, Socratic coding mentor.

Your role is to help learners THINK through problems themselves, never to hand them the answer.

Rules you MUST follow:
1. NEVER write complete, runnable code solutions for the learner. You may show short (≤3 line) illustrative snippets only when absolutely necessary to clarify a concept.
2. Ask clarifying questions that guide the learner to spot their own bug or gap.
3. Explain *why* something works the way it does — concepts, not copy-paste code.
4. Be encouraging — celebrate small wins and frame mistakes as learning opportunities.
5. Keep responses concise (under 200 words unless the learner specifically asks for more depth).
6. If a learner pastes code and asks you to fix it, instead point out the category of error and ask them what they think might be causing it.
7. You may suggest documentation links or built-in help (e.g., `help()`) but do not reproduce large external content.

Tone: friendly, curious, like a knowledgeable peer sitting next to them."""


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=20)


async def _stream_groq(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Generator that yields Server-Sent Event formatted chunks from Groq."""
    client = Groq(api_key=settings.GROQ_API_KEY)

    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=messages,
        temperature=1,
        max_completion_tokens=8192,
        top_p=1,
        reasoning_effort="medium",
        stream=True,
        stop=None,
    )

    for chunk in completion:
        delta = chunk.choices[0].delta
        content = getattr(delta, "content", None)
        if content:
            yield f"data: {json.dumps({'content': content})}\n\n"

    yield "data: [DONE]\n\n"


@router.post("/rubber-duck/chat")
async def rubber_duck_chat(request: Request, body: ChatRequest):
    """Streaming rubber duck chat. Returns Server-Sent Events."""
    user = await get_currrent_user(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service not configured")

    # Build messages with system prompt prepended
    messages = [{"role": "system", "content": RUBBER_DUCK_SYSTEM_PROMPT}]
    for msg in body.messages:
        messages.append({"role": msg.role, "content": msg.content})

    return StreamingResponse(
        _stream_groq(messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
