#!/usr/bin/python3
"""Thin async wrapper around the Groq chat completions API.

Mirrors the model choice already used by domains/ai/routes/rubber_duck.py so
the whole app talks to one Groq model. Every call is best-effort: on any
failure (missing key, timeout, rate limit) this returns None instead of
raising, so callers can fall back to a deterministic template rather than
break a student-facing flow over a flaky LLM call.
"""
import asyncio
import logging
from typing import Optional

from groq import Groq
from core.config import settings

logger = logging.getLogger(__name__)

MODEL = "openai/gpt-oss-120b"


def _generate_sync(system_prompt: str, user_prompt: str, max_tokens: int, temperature: float) -> str:
    client = Groq(api_key=settings.GROQ_API_KEY)
    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_completion_tokens=max_tokens,
        top_p=1,
        stream=False,
    )
    return completion.choices[0].message.content.strip()


async def generate_text(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 220,
    temperature: float = 0.8,
) -> Optional[str]:
    """Generate a short piece of text with Groq. Returns None on any failure."""
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not configured, skipping AI mentor generation")
        return None

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_generate_sync, system_prompt, user_prompt, max_tokens, temperature),
            timeout=15.0,
        )
    except Exception as e:
        logger.error(f"Groq generation failed: {e}")
        return None
