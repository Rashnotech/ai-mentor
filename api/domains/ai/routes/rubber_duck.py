#!/usr/bin/python3
"""Rubber Duck AI chat endpoint — guides learners without giving full solutions."""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import List, AsyncGenerator, Optional
from groq import Groq
from core.config import settings
from auth.dependencies import get_currrent_user
import edge_tts
import hashlib
import json
import re

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


DEFAULT_EDGE_TTS_VOICE = "en-US-AriaNeural"
EDGE_TTS_VOICE_MAP: dict[str, str] = {
    # Named / Orpheus aliases -> Edge Neural Voices
    "autumn": "en-US-AriaNeural",
    "diana": "en-US-JennyNeural",
    "hannah": "en-GB-SoniaNeural",
    "troy": "en-US-ChristopherNeural",
    "austin": "en-US-GuyNeural",
    "daniel": "en-GB-RyanNeural",
    "ezinne": "en-NG-EzinneNeural",
    "abeo": "en-NG-AbeoNeural",
    # Direct Edge Neural Voice IDs
    "en-us-arianeural": "en-US-AriaNeural",
    "en-us-jennyneural": "en-US-JennyNeural",
    "en-us-guyneural": "en-US-GuyNeural",
    "en-us-christopherneural": "en-US-ChristopherNeural",
    "en-gb-sonianeural": "en-GB-SoniaNeural",
    "en-gb-ryanneural": "en-GB-RyanNeural",
    "en-ng-ezinneneural": "en-NG-EzinneNeural",
    "en-ng-abeoneural": "en-NG-AbeoNeural",
}
_TTS_AUDIO_CACHE: dict[str, bytes] = {}


class LessonOverviewSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=30000)
    voice: Optional[str] = Field(default="en-US-AriaNeural")


def _strip_markdown_for_speech(raw: str) -> str:
    """Convert lesson markdown into clean spoken English without markdown tokens, escape chars, or code."""
    text = raw
    # 1. Normalize literal escaped newlines/tabs/returns (e.g. "\\n", "\\r", "\\t") into real newlines/spaces
    text = text.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\n").replace("\\t", " ")
    # Also remove any stray backslash-letter escape sequences like \n or \t if double-escaped
    text = re.sub(r"\\[nrt]", "\n", text)

    # 2. Replace fenced code blocks (```...``` or ~~~...~~~) with "See code sample."
    text = re.sub(r"```[\s\S]*?```", " See code sample. ", text)
    text = re.sub(r"~~~[\s\S]*?~~~", " See code sample. ", text)
    # Also handle unclosed fenced code blocks at the end of a string
    text = re.sub(r"```[\s\S]*$", " See code sample. ", text)

    # 3. Replace HTML <pre>/<code> blocks and strip remaining HTML tags
    text = re.sub(r"<(pre|code)\b[^>]*>[\s\S]*?</\1>", " See code sample. ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)

    # 4. Replace inline code (`...`) with "see code sample" if it contains code symbols/operators or multiple tokens,
    #    or keep simple plain-word terms without backticks.
    def _replace_inline_code(match: re.Match) -> str:
        inner = match.group(1).strip()
        if not inner:
            return ""
        if len(inner) > 20 or re.search(r"[{}()\[\]=+;<>\\/$#@!%^&*|~.:_-]", inner) or " " in inner:
            return " see code sample "
        return f" {inner} "

    text = re.sub(r"`([^`]+)`", _replace_inline_code, text)
    text = text.replace("`", " ")

    # 5. Strip images ![alt](url) and convert markdown links [label](url) -> label
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r" \1 ", text)
    # Replace bare URLs with a short spoken reference
    text = re.sub(r"https?://\S+", " link ", text)

    # 6. Strip markdown table separator lines (e.g. |---|---|) and table pipes
    text = re.sub(r"^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$", " ", text, flags=re.MULTILINE)
    text = text.replace("|", ", ")

    # 7. Strip heading hashes (#, ##, ###) anywhere they appear
    text = re.sub(r"(?:^|\s)#+\s*", ". ", text, flags=re.MULTILINE)
    text = text.replace("#", " ")

    # 8. Strip blockquotes, horizontal rules, and bullet/numbered list markers at line starts
    text = re.sub(r"^\s*(?:[-*_]{3,})\s*$", " ", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*(?:>+|\*|-|\+|\d+\.)\s+", ". ", text, flags=re.MULTILINE)

    # 9. Strip remaining markdown formatting symbols (*, _, ~, \, >, <, =, braces, brackets)
    text = re.sub(r"[*_~\\><={}\[\]]+", " ", text)

    # 10. Turn newlines into sentence pauses and clean up repeated punctuation/spaces
    text = re.sub(r"\n+", ". ", text)
    text = re.sub(r"(?:\.\s*){2,}", ". ", text)
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)
    text = re.sub(r"^\s*[.,;:]+\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Deduplicate consecutive "See code sample." phrases
    text = re.sub(r"(?:[Ss]ee code sample\.?\s*){2,}", "See code sample. ", text).strip()
    return text


async def _synthesize_edge_tts_audio(text: str, voice: str) -> bytes:
    """Synthesize the complete lesson overview audio stream using Microsoft Edge Neural TTS (edge_tts)."""
    communicate = edge_tts.Communicate(text=text, voice=voice)
    audio_chunks: List[bytes] = []
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            audio_chunks.append(chunk["data"])
    if not audio_chunks:
        raise RuntimeError("Edge TTS returned empty audio stream")
    return b"".join(audio_chunks)


@router.post("/lesson-overview/speech")
async def lesson_overview_speech(request: Request, body: LessonOverviewSpeechRequest):
    """Synthesize complete spoken audio for a lesson overview using Microsoft Edge Neural TTS (edge-tts)."""
    user = await get_currrent_user(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    cleaned_text = _strip_markdown_for_speech(body.text)
    if not cleaned_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No readable overview text provided")

    requested_voice = (body.voice or DEFAULT_EDGE_TTS_VOICE).strip().lower()
    resolved_voice = EDGE_TTS_VOICE_MAP.get(requested_voice, DEFAULT_EDGE_TTS_VOICE)

    cache_key = hashlib.sha256(f"{resolved_voice}:{cleaned_text}".encode("utf-8")).hexdigest()
    cached_mp3 = _TTS_AUDIO_CACHE.get(cache_key)
    if cached_mp3:
        return Response(
            content=cached_mp3,
            media_type="audio/mpeg",
            headers={"Cache-Control": "private, max-age=3600"},
        )

    try:
        mp3_bytes = await _synthesize_edge_tts_audio(cleaned_text, resolved_voice)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate lesson audio: {str(exc)}",
        )

    if len(_TTS_AUDIO_CACHE) >= 128:
        _TTS_AUDIO_CACHE.clear()
    _TTS_AUDIO_CACHE[cache_key] = mp3_bytes

    return Response(
        content=mp3_bytes,
        media_type="audio/mpeg",
        headers={"Cache-Control": "private, max-age=3600"},
    )