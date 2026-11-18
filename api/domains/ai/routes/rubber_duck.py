#!/usr/bin/python3
"""Rubber Duck AI chat endpoint — guides learners without giving full solutions."""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import List, AsyncGenerator, Optional
from groq import Groq
from core.config import settings
from auth.dependencies import get_currrent_user
import asyncio
import io
import json
import re
import wave
import httpx

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


TTS_MODEL = "canopylabs/orpheus-v1-english"
ALLOWED_TTS_VOICES = {"troy", "autumn", "diana", "hannah", "austin", "daniel"}


class LessonOverviewSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    voice: Optional[str] = Field(default="troy")


def _strip_markdown_for_speech(raw: str) -> str:
    """Convert lesson markdown into clean spoken text for Groq TTS."""
    text = raw
    # Replace fenced code blocks with a brief spoken note
    text = re.sub(r"```[\s\S]*?```", " Code example omitted. ", text)
    # Remove inline backticks
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Convert markdown links [label](url) -> label
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Strip images ![alt](url)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    # Strip headings, blockquotes, list markers, bold/italic markers, table pipes
    text = re.sub(r"^[#>\-*+]+\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_~|]+", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _split_into_tts_chunks(text: str, max_chars: int = 190) -> List[str]:
    """Split spoken text into <=190-character sentence chunks for Orpheus V1."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: List[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            words = sentence.split(" ")
            part = ""
            for word in words:
                if len(word) > max_chars:
                    word = word[:max_chars]
                if not part:
                    part = word
                elif len(part) + 1 + len(word) <= max_chars:
                    part = f"{part} {word}"
                else:
                    chunks.append(part)
                    part = word
            if part:
                chunks.append(part)
        elif not current:
            current = sentence
        elif len(current) + 1 + len(sentence) <= max_chars:
            current = f"{current} {sentence}"
        else:
            chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    return chunks[:20]  # Cap at 20 chunks (~3,800 chars) to keep response fast


def _synthesize_wav_chunks_sync(chunks: List[str], voice: str) -> bytes:
    """Call Groq Orpheus TTS for each chunk and merge the WAV frames."""
    url = "https://api.groq.com/openai/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    wav_Payloads: List[bytes] = []
    with httpx.Client(timeout=30.0) as client:
        for chunk in chunks:
            resp = client.post(
                url,
                headers=headers,
                json={
                    "model": TTS_MODEL,
                    "voice": voice,
                    "input": chunk,
                    "response_format": "wav",
                },
            )
            if resp.status_code != 200:
                detail = resp.text[:300]
                raise RuntimeError(f"Groq TTS error ({resp.status_code}): {detail}")
            wav_Payloads.append(resp.content)

    if len(wav_Payloads) == 1:
        return wav_Payloads[0]

    # Concatenate WAV PCM frames into a single WAV file
    output_buffer = io.BytesIO()
    params = None
    frames: List[bytes] = []

    for wav_bytes in wav_Payloads:
        with wave.open(io.BytesIO(wav_bytes), "rb") as reader:
            if params is None:
                params = reader.getparams()
            frames.append(reader.readframes(reader.getnframes()))

    if params is None:
        return wav_Payloads[0]

    with wave.open(output_buffer, "wb") as writer:
        writer.setparams(params)
        for frame_chunk in frames:
            writer.writeframes(frame_chunk)

    return output_buffer.getvalue()


@router.post("/lesson-overview/speech")
async def lesson_overview_speech(request: Request, body: LessonOverviewSpeechRequest):
    """Synthesize spoken audio for a lesson overview using Groq TTS."""
    user = await get_currrent_user(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Groq AI service not configured")

    cleaned_text = _strip_markdown_for_speech(body.text)
    if not cleaned_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No readable overview text provided")

    voice = (body.voice or "troy").lower()
    if voice not in ALLOWED_TTS_VOICES:
        voice = "troy"

    chunks = _split_into_tts_chunks(cleaned_text)
    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No readable overview text provided")

    try:
        wav_bytes = await asyncio.to_thread(_synthesize_wav_chunks_sync, chunks, voice)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate lesson audio with Groq: {str(exc)}",
        )

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Cache-Control": "private, max-age=3600"},
    )

