#!/usr/bin/python3
"""Rubber Duck AI chat endpoint — guides learners without giving full solutions."""
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import List, AsyncGenerator, Optional
from groq import Groq, RateLimitError, APIStatusError
from core.config import settings
from auth.dependencies import get_currrent_user
from domains.ai.services.groq_client import generate_text
import asyncio
import hashlib
import io
import json
import re
import time
import wave

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
MAX_TTS_CHUNKS = 2
_TTS_AUDIO_CACHE: dict[str, bytes] = {}

OVERVIEW_NARRATION_SYSTEM_PROMPT = (
    "You are an engaging technical instructor narrating a concise spoken audio summary of a lesson. "
    "Summarize the core takeaways of the provided lesson into 2 natural, clear spoken sentences "
    "under 185 characters total. Use plain spoken English only (no markdown, no bullet points, no code). "
    "If the lesson contains code examples, simply mention 'See the code sample in the lesson.'"
)


class LessonOverviewSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    voice: Optional[str] = Field(default="autumn")


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


def _split_into_tts_chunks(text: str, max_chars: int = 190) -> List[str]:
    """Split spoken text into <=190-character sentence chunks for Orpheus V1, capped at MAX_TTS_CHUNKS."""
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

    return chunks[:MAX_TTS_CHUNKS]


def _synthesize_wav_chunks_sync(chunks: List[str], voice: str) -> bytes:
    """Call Groq SDK client.audio.speech.create for each chunk and merge WAV frames."""
    client = Groq(api_key=settings.GROQ_API_KEY)
    wav_payloads: List[bytes] = []

    for chunk in chunks:
        audio_bytes: Optional[bytes] = None
        for attempt in range(3):
            try:
                response = client.audio.speech.create(
                    model=TTS_MODEL,
                    voice=voice,
                    response_format="wav",
                    input=chunk,
                )
                audio_bytes = response.read()
                break
            except RateLimitError as exc:
                err_msg = str(exc)
                # If daily token quota (TPD) or long wait is hit, fail immediately with a clear message
                if "tokens per day (TPD)" in err_msg or "m" in re.findall(r"try again in ([^\s.]+)", err_msg):
                    raise RuntimeError(f"Groq TTS rate limit reached (429): {err_msg[:320]}") from exc
                if attempt < 2:
                    wait_seconds = 6.5
                    match = re.search(r"try again in (\d+(?:\.\d+)?)s", err_msg)
                    if match:
                        wait_seconds = min(float(match.group(1)) + 0.5, 10.0)
                    time.sleep(wait_seconds)
                    continue
                raise RuntimeError(f"Groq TTS rate limit reached (429): {err_msg[:320]}") from exc
            except APIStatusError as exc:
                raise RuntimeError(f"Groq TTS error ({exc.status_code}): {str(exc)[:300]}") from exc

        if not audio_bytes:
            raise RuntimeError("Groq TTS returned empty audio")
        wav_payloads.append(audio_bytes)

    if len(wav_payloads) == 1:
        return wav_payloads[0]

    # Concatenate WAV PCM frames into a single WAV file
    output_buffer = io.BytesIO()
    params = None
    frames: List[bytes] = []

    for wav_bytes in wav_payloads:
        with wave.open(io.BytesIO(wav_bytes), "rb") as reader:
            if params is None:
                params = reader.getparams()
            frames.append(reader.readframes(reader.getnframes()))

    if params is None:
        return wav_payloads[0]

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

    voice = (body.voice or "autumn").lower()
    if voice not in ALLOWED_TTS_VOICES:
        voice = "autumn"

    cache_key = hashlib.sha256(f"{voice}:{cleaned_text}".encode("utf-8")).hexdigest()
    cached_wav = _TTS_AUDIO_CACHE.get(cache_key)
    if cached_wav:
        return Response(
            content=cached_wav,
            media_type="audio/wav",
            headers={"Cache-Control": "private, max-age=3600"},
        )

    # Condense long lesson markdown into a natural spoken overview via Groq LLM
    # so Orpheus TTS fits inside 1 single request (<= 190 chars) and preserves TPD/RPM quota.
    spoken_script = cleaned_text
    if len(cleaned_text) > 190:
        summarized = await generate_text(
            OVERVIEW_NARRATION_SYSTEM_PROMPT,
            cleaned_text[:4000],
            max_tokens=90,
            temperature=0.5,
        )
        if summarized:
            spoken_script = _strip_markdown_for_speech(summarized) or cleaned_text[:190]
        else:
            spoken_script = _strip_markdown_for_speech(cleaned_text[:190])
    else:
        spoken_script = _strip_markdown_for_speech(spoken_script)

    chunks = _split_into_tts_chunks(spoken_script)
    if not chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No readable overview text provided")

    try:
        wav_bytes = await asyncio.to_thread(_synthesize_wav_chunks_sync, chunks, voice)
    except Exception as exc:
        err_str = str(exc)
        status_code = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if "429" in err_str or "rate limit" in err_str.lower()
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(
            status_code=status_code,
            detail=f"Failed to generate lesson audio with Groq: {err_str}",
        )

    if len(_TTS_AUDIO_CACHE) >= 128:
        _TTS_AUDIO_CACHE.clear()
    _TTS_AUDIO_CACHE[cache_key] = wav_bytes

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Cache-Control": "private, max-age=3600"},
    )

