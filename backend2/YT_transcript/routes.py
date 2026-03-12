from __future__ import annotations

import json
import os
import re
import subprocess
import shutil
import tempfile
import time
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import certifi
import requests
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from groq import Groq
from pymongo import MongoClient
from pydantic import BaseModel, ConfigDict, Field
from pydantic import BaseModel

os.environ["SSL_CERT_FILE"] = certifi.where()

load_dotenv()

ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2"
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

router = APIRouter()


class TranscribeRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")
    cookies_file: str | None = Field(
        default=None,
        description="Optional cookies file path for YouTube auth",
    )
    poll_interval_seconds: float = Field(
        default=3.0,
        ge=1.0,
        le=30.0,
        description="Polling interval while waiting for AssemblyAI",
    )
    max_wait_seconds: int = Field(
        default=1800,
        ge=30,
        le=7200,
        description="Maximum wait time for transcription completion",
    )


class TopicSectionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    start_sentence_index: int
    end_sentence_index: int
    summary: str
    keywords: list[str]


class TopicBreakdownPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_title: str
    overall_summary: str
    sections: list[TopicSectionPlan] = Field(min_length=1)


class TopicSectionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    start_ms: int
    end_ms: int
    summary: str
    keywords: list[str]


class OverallSummaryPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_title: str
    overall_summary: str


class TranscriptTopicResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_title: str
    overall_summary: str
    sections: list[TopicSectionRecord]


class TranscribeResponse(BaseModel):
    record_id: str
    transcript_id: str
    source_url: str
    status: str
    overall_title: str
    overall_summary: str
    topic_count: int
    audio_duration_seconds: float | None = None
    topics: list[TopicSectionRecord]


class AssemblyAIClient:
    def __init__(self, api_key: str) -> None:
        self.session = requests.Session()
        self.session.headers.update({"authorization": api_key})

    @staticmethod
    def _raise_for_error(response: requests.Response, fallback_message: str) -> None:
        if response.ok:
            return
        detail = response.text
        try:
            payload = response.json()
            if isinstance(payload, dict):
                detail = payload.get("error") or payload.get("message") or detail
        except ValueError:
            pass
        raise RuntimeError(f"{fallback_message}: {detail}")

    def upload_media(self, media_file: Path) -> str:
        with media_file.open("rb") as source:
            response = self.session.post(
                f"{ASSEMBLYAI_BASE_URL}/upload",
                data=source,
                timeout=600,
            )
        self._raise_for_error(response, "Failed to upload media to AssemblyAI")
        upload_url = response.json().get("upload_url")
        if not upload_url:
            raise RuntimeError("AssemblyAI upload response did not include upload_url")
        return upload_url

    def create_transcript(self, audio_url: str) -> str:
        response = self.session.post(
            f"{ASSEMBLYAI_BASE_URL}/transcript",
            json={"audio_url": audio_url, "speech_model": "nano"},
            timeout=30,
        )
        self._raise_for_error(response, "Failed to create transcription")
        transcript_id = response.json().get("id")
        if not transcript_id:
            raise RuntimeError("AssemblyAI transcript response did not include id")
        return transcript_id

    def wait_for_completion(
        self,
        transcript_id: str,
        poll_interval_seconds: float,
        max_wait_seconds: int,
    ) -> dict[str, Any]:
        deadline = time.monotonic() + max_wait_seconds
        url = f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}"

        while time.monotonic() < deadline:
            response = self.session.get(url, timeout=30)
            self._raise_for_error(response, "Failed while polling transcription")
            payload = response.json()
            status = payload.get("status")

            if status == "completed":
                return payload
            if status == "error":
                raise RuntimeError(
                    payload.get("error") or "AssemblyAI returned an error"
                )

            time.sleep(poll_interval_seconds)

        raise TimeoutError(
            f"Transcription did not finish within {max_wait_seconds} seconds"
        )

    def get_sentences(self, transcript_id: str) -> list[dict[str, Any]]:
        response = self.session.get(
            f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}/sentences",
            timeout=60,
        )
        self._raise_for_error(response, "Failed to fetch transcript sentences")
        payload = response.json()
        raw_sentences = payload.get("sentences") or []

        sentences: list[dict[str, Any]] = []
        for index, sentence in enumerate(raw_sentences):
            start_ms = int(sentence.get("start") or 0)
            end_ms = int(sentence.get("end") or start_ms)
            text = str(sentence.get("text") or "").strip()
            if not text:
                continue
            sentences.append(
                {
                    "index": index,
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "text": text,
                }
            )

        return sentences

    def get_transcript_text(self, transcript_id: str) -> str:
        response = self.session.get(
            f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}",
            timeout=60,
        )
        self._raise_for_error(response, "Failed to fetch transcript text")
        payload = response.json()
        return str(payload.get("text") or "").strip()


class MongoTranscriptStore:
    def __init__(self, uri: str, database_name: str, collection_name: str) -> None:
        self.collection = _get_mongo_collection(uri, database_name, collection_name)

    def insert(self, document: dict[str, Any]) -> ObjectId:
        return self.collection.insert_one(document).inserted_id

    def find_by_id(self, record_id: str) -> dict[str, Any] | None:
        try:
            object_id = ObjectId(record_id)
        except Exception as exc:
            raise ValueError("Invalid record id") from exc
        return self.collection.find_one({"_id": object_id})

    def find_by_video_id(self, video_id: str) -> dict[str, Any] | None:
        """Look up a cached transcript by YouTube video ID."""
        return self.collection.find_one(
            {"youtube_video_id": video_id},
            sort=[("created_at", -1)],
        )


@lru_cache(maxsize=8)
def _get_mongo_collection(uri: str, database_name: str, collection_name: str):
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client[database_name][collection_name]


def _env_any(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def _require_env(*names: str) -> str:
    value = _env_any(*names)
    if not value:
        joined = ", ".join(names)
        raise RuntimeError(f"Missing environment variable: {joined}")
    return value


def _normalize_mongo_uri(uri: str) -> str:
    uri = uri.strip()
    if uri.startswith("mmongodb://"):
        return "mongodb://" + uri[len("mmongodb://") :]
    if uri.startswith("mmongodb+srv://"):
        return "mongodb+srv://" + uri[len("mmongodb+srv://") :]
    return uri


def _is_youtube_url(url: str) -> bool:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    return "youtube.com" in hostname or "youtu.be" in hostname


def _extract_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    if "youtu.be" in hostname:
        video_id = parsed.path.lstrip("/")
        return video_id or None

    query_params = parse_qs(parsed.query)
    candidates = query_params.get("v")
    if candidates:
        return candidates[0]

    return None


def _safe_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", Path(value).stem).strip("._-")
    return cleaned or f"yt_{uuid.uuid4().hex[:8]}"


def _download_media(url: str, cookies_file: str | None = None) -> Path:
    temp_dir = tempfile.mkdtemp(prefix="yt_transcript_")
    output_dir = Path(temp_dir)
    basename = f"yt_{_safe_name(_extract_video_id(url) or uuid.uuid4().hex[:8])}"
    output_template = output_dir / f"{basename}.%(ext)s"

    format_attempts = ["18", "best[ext=mp4]", "best"]
    last_error: str | None = None

    for format_selector in format_attempts:
        shutil.rmtree(output_dir, ignore_errors=True)
        output_dir.mkdir(parents=True, exist_ok=True)

        command = [
            "yt-dlp",
            "--no-playlist",
            "--no-check-formats",
            "--no-check-certificate",
            "--add-header",
            "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "-f",
            format_selector,
            "-o",
            str(output_template),
            url,
        ]

        if cookies_file and Path(cookies_file).exists():
            command[1:1] = ["--cookies", cookies_file]

        try:
            env = os.environ.copy()
            env["SSL_CERT_FILE"] = certifi.where()
            subprocess.run(command, check=True, capture_output=True, text=True, env=env)
        except FileNotFoundError as exc:
            raise RuntimeError("yt-dlp is not installed in this environment") from exc
        except subprocess.CalledProcessError as exc:
            details = (exc.stderr or exc.stdout or "").strip()
            last_error = details or str(exc)
            continue

        candidates = sorted(
            [
                p
                for p in output_dir.glob(f"{basename}*")
                if p.is_file()
                and p.stat().st_size > 0
                and p.suffix.lower()
                in {".mp4", ".m4a", ".webm", ".mkv", ".mov", ".mp3"}
            ],
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if candidates:
            for candidate in candidates:
                if candidate.suffix.lower() == ".mp3":
                    return candidate
            return candidates[0]

    raise RuntimeError(f"yt-dlp failed: {last_error or 'no usable format found'}")


def _segment_transcript_with_groq(transcript_text: str) -> OverallSummaryPlan:
    if not transcript_text.strip():
        raise RuntimeError("No transcript text was returned by AssemblyAI")

    groq_api_key = _require_env("GROQ_API_KEY")
    model_name = (
        _env_any("GROQ_MODEL", default=DEFAULT_GROQ_MODEL) or DEFAULT_GROQ_MODEL
    )
    client = Groq(api_key=groq_api_key)

    text_payload = transcript_text[:20000]

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": (
                    "Give a concise overall title (3-6 words) and short summary for the YouTube video. "
                    "Title should be like a YouTube video title - short and descriptive. "
                    "Return only structured JSON."
                ),
            },
            {"role": "user", "content": text_payload},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "youtube_overall_summary",
                "strict": True,
                "schema": OverallSummaryPlan.model_json_schema(),
            },
        },
        temperature=0.2,
        max_completion_tokens=512,
    )

    raw_content = response.choices[0].message.content or "{}"
    return OverallSummaryPlan.model_validate(json.loads(raw_content))


def _generate_topic_plan_from_sentences(
    sentences: list[dict[str, Any]],
) -> TopicBreakdownPlan:
    if not sentences:
        raise RuntimeError("No transcript sentences were returned by AssemblyAI")

    groq_api_key = _require_env("GROQ_API_KEY")
    model_name = (
        _env_any("GROQ_MODEL", default=DEFAULT_GROQ_MODEL) or DEFAULT_GROQ_MODEL
    )
    client = Groq(api_key=groq_api_key)

    payload = {
        "sentences": [
            {
                "index": s["index"],
                "start_ms": s["start_ms"],
                "end_ms": s["end_ms"],
                "text": s["text"],
            }
            for s in sentences[:200]
        ]
    }

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": (
                    "Segment this YouTube transcript into topic-based chapters like YouTube video chapters. "
                    "Each section should be 2-5 minutes of content covering ONE specific topic. "
                    "Topic names should be SHORT (1-4 words) like 'Introduction', 'Linear Regression', 'Neural Networks', 'Conclusion', etc. "
                    "Use actual topic names from the video content, not generic 'Part 1', 'Section 1'. "
                    "Cover the ENTIRE transcript - don't skip any content. "
                    "Return only structured JSON."
                ),
            },
            {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "youtube_topic_breakdown",
                "strict": True,
                "schema": TopicBreakdownPlan.model_json_schema(),
            },
        },
        temperature=0.2,
        max_completion_tokens=2048,
    )

    raw_content = response.choices[0].message.content or "{}"
    return _normalize_topic_plan(
        TopicBreakdownPlan.model_validate(json.loads(raw_content)), sentences
    )


def _normalize_topic_plan(
    plan: TopicBreakdownPlan,
    sentences: list[dict[str, Any]],
) -> TopicBreakdownPlan:
    last_index = len(sentences) - 1
    normalized_sections: list[TopicSectionPlan] = []

    for section in sorted(
        plan.sections,
        key=lambda item: (item.start_sentence_index, item.end_sentence_index),
    ):
        start_idx = max(0, min(section.start_sentence_index, last_index))
        end_idx = max(start_idx, min(section.end_sentence_index, last_index))

        if not normalized_sections:
            start_idx = 0
        else:
            previous = normalized_sections[-1]
            if start_idx > previous.end_sentence_index + 1:
                previous = previous.model_copy(
                    update={"end_sentence_index": start_idx - 1}
                )
                normalized_sections[-1] = previous
            start_idx = max(start_idx, previous.end_sentence_index + 1)

        if end_idx < start_idx:
            end_idx = start_idx

        normalized_sections.append(
            TopicSectionPlan(
                title=section.title.strip(),
                start_sentence_index=start_idx,
                end_sentence_index=end_idx,
                summary=section.summary.strip(),
                keywords=[
                    keyword.strip() for keyword in section.keywords if keyword.strip()
                ],
            )
        )

    if normalized_sections:
        normalized_sections[0] = normalized_sections[0].model_copy(
            update={"start_sentence_index": 0}
        )
        normalized_sections[-1] = normalized_sections[-1].model_copy(
            update={"end_sentence_index": last_index}
        )

    return TopicBreakdownPlan(
        overall_title=plan.overall_title.strip(),
        overall_summary=plan.overall_summary.strip(),
        sections=normalized_sections,
    )


def _fallback_topic_plan(
    sentences: list[dict[str, Any]], overall_title: str, overall_summary: str
) -> TopicBreakdownPlan:
    if not sentences:
        raise RuntimeError("No transcript sentences were returned by AssemblyAI")

    chunk_size = max(1, min(10, len(sentences) // 5 or 1))
    sections: list[TopicSectionPlan] = []
    start = 0

    while start < len(sentences):
        end = min(len(sentences) - 1, start + chunk_size - 1)
        section_text = " ".join(
            sentence["text"] for sentence in sentences[start : end + 1]
        )
        keyword_source = section_text.split()
        keywords = []
        for word in keyword_source:
            word = re.sub(r"[^A-Za-z0-9]+", "", word).strip()
            if len(word) > 3 and word.lower() not in {k.lower() for k in keywords}:
                keywords.append(word)
            if len(keywords) >= 4:
                break

        sections.append(
            TopicSectionPlan(
                title=f"Section {len(sections) + 1}",
                start_sentence_index=start,
                end_sentence_index=end,
                summary=section_text[:240].strip(),
                keywords=keywords,
            )
        )
        start = end + 1

    return TopicBreakdownPlan(
        overall_title=overall_title,
        overall_summary=overall_summary,
        sections=sections,
    )


def _topic_records_from_plan(
    plan: TopicBreakdownPlan,
    sentences: list[dict[str, Any]],
) -> list[TopicSectionRecord]:
    records: list[TopicSectionRecord] = []
    last_index = len(sentences) - 1

    for section in plan.sections:
        start_idx = max(0, min(section.start_sentence_index, last_index))
        end_idx = max(start_idx, min(section.end_sentence_index, last_index))
        start_ms = int(sentences[start_idx]["start_ms"])
        end_ms = int(sentences[end_idx]["end_ms"])
        records.append(
            TopicSectionRecord(
                title=section.title,
                start_ms=start_ms,
                end_ms=end_ms,
                summary=section.summary,
                keywords=section.keywords,
            )
        )

    return records


def _fetch_transcript_via_youtube_api(video_id: str) -> list[dict[str, Any]] | None:
    """Try to get transcript directly from YouTube captions (no download needed)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript = YouTubeTranscriptApi().fetch(video_id)
        sentences = []
        for i, snippet in enumerate(transcript.snippets):
            start_ms = int(snippet.start * 1000)
            duration_ms = int(snippet.duration * 1000)
            text = str(snippet.text or "").strip()
            if not text:
                continue
            sentences.append({
                "index": i,
                "start_ms": start_ms,
                "end_ms": start_ms + duration_ms,
                "text": text,
            })
        return sentences if sentences else None
    except Exception as exc:
        print(f"youtube-transcript-api failed for {video_id}: {exc}")
        return None


def transcribe_youtube_to_mongo(
    url: str,
    cookies_file: str | None = None,
    poll_interval_seconds: float = 3.0,
    max_wait_seconds: int = 1800,
) -> dict[str, Any]:
    if not _is_youtube_url(url):
        raise ValueError("Only YouTube URLs are supported")

    mongo_uri = _normalize_mongo_uri(
        _require_env("MONGODB_URI", "MONGO_URI", "MONGO_URL")
    )
    mongo_db_name = (
        _env_any("MONGODB_DB_NAME", "MONGO_DB_NAME", default="SkillUP") or "SkillUP"
    )
    mongo_collection = (
        _env_any("MONGODB_COLLECTION", "MONGO_COLLECTION", default="transcripts")
        or "transcripts"
    )

    # ── Cache check: return existing transcript if already processed ──
    video_id = _extract_video_id(url)
    if video_id:
        store = MongoTranscriptStore(mongo_uri, mongo_db_name, mongo_collection)
        cached = store.find_by_video_id(video_id)
        if cached:
            cached_topics = cached.get("topics") or []
            return {
                "record_id": str(cached["_id"]),
                "transcript_id": cached.get("assemblyai", {}).get("transcript_id", ""),
                "source_url": cached.get("source_url", url),
                "status": "cached",
                "overall_title": cached.get("overall_title", ""),
                "overall_summary": cached.get("overall_summary", ""),
                "topic_count": cached.get("topic_count", len(cached_topics)),
                "audio_duration_seconds": cached.get("assemblyai", {}).get("audio_duration_seconds"),
                "topics": [
                    TopicSectionRecord(**t) if isinstance(t, dict) else t
                    for t in cached_topics
                ],
            }

    # ── Strategy 1: YouTube captions API (fast, no download) ──
    sentences = None
    transcript_id = f"yt-captions-{video_id or uuid.uuid4().hex[:8]}"
    used_assemblyai = False

    if video_id:
        sentences = _fetch_transcript_via_youtube_api(video_id)

    # ── Strategy 2: yt-dlp + AssemblyAI fallback ──
    transcript_payload = {}
    if not sentences:
        try:
            assemblyai_api_key = _require_env("ASSEMBLYAI_API_KEY")
            downloaded_file = _download_media(url, cookies_file=cookies_file)

            audio_file = downloaded_file.with_suffix(".m4a")
            if downloaded_file.suffix.lower() != ".m4a":
                result = subprocess.run(
                    ["ffmpeg", "-y", "-i", str(downloaded_file), "-vn", "-c:a", "aac", "-b:a", "192k", str(audio_file)],
                    capture_output=True, text=True,
                )
                if result.returncode == 0 and audio_file.exists():
                    downloaded_file = audio_file

            try:
                assemblyai = AssemblyAIClient(assemblyai_api_key)
                upload_url = assemblyai.upload_media(downloaded_file)
                transcript_id = assemblyai.create_transcript(upload_url)
                transcript_payload = assemblyai.wait_for_completion(
                    transcript_id=transcript_id,
                    poll_interval_seconds=poll_interval_seconds,
                    max_wait_seconds=max_wait_seconds,
                )
                sentences = assemblyai.get_sentences(transcript_id)
                used_assemblyai = True
            finally:
                try:
                    downloaded_file.unlink(missing_ok=True)
                except Exception:
                    pass
                try:
                    shutil.rmtree(downloaded_file.parent, ignore_errors=True)
                except Exception:
                    pass
        except Exception as exc:
            raise RuntimeError(f"All transcript methods failed: {exc}") from exc

    if not sentences:
        raise RuntimeError("No transcript could be obtained")

    # ── Generate topic segmentation via Groq ──
    transcript_text = " ".join(s["text"] for s in sentences)

    try:
        topic_plan = _generate_topic_plan_from_sentences(sentences)
    except Exception:
        try:
            overall = _segment_transcript_with_groq(transcript_text)
            topic_plan = _fallback_topic_plan(sentences, overall.overall_title, overall.overall_summary)
        except Exception:
            topic_plan = _fallback_topic_plan(
                sentences,
                overall_title=f"YouTube transcript {video_id or ''}",
                overall_summary=transcript_text[:300],
            )

    topic_records = _topic_records_from_plan(topic_plan, sentences)

    now = datetime.now(timezone.utc)
    document = {
        "source_url": url,
        "youtube_video_id": video_id,
        "assemblyai": {
            "transcript_id": transcript_id,
            "status": transcript_payload.get("status", "completed") if used_assemblyai else "youtube-captions",
            "confidence": transcript_payload.get("confidence") if used_assemblyai else None,
            "audio_duration_seconds": transcript_payload.get("audio_duration") if used_assemblyai else None,
        },
        "overall_title": topic_plan.overall_title,
        "overall_summary": topic_plan.overall_summary,
        "topics": [topic.model_dump() for topic in topic_records],
        "topic_count": len(topic_records),
        "sentence_count": len(sentences),
        "created_at": now,
        "updated_at": now,
    }

    store = MongoTranscriptStore(mongo_uri, mongo_db_name, mongo_collection)
    inserted_id = store.insert(document)

    return {
        "record_id": str(inserted_id),
        "transcript_id": transcript_id,
        "source_url": url,
        "status": "completed",
        "overall_title": topic_plan.overall_title,
        "overall_summary": topic_plan.overall_summary,
        "topic_count": len(topic_records),
        "audio_duration_seconds": transcript_payload.get("audio_duration") if used_assemblyai else None,
        "topics": topic_records,
    }


def _run_transcription(request: TranscribeRequest) -> TranscribeResponse:
    try:
        result = transcribe_youtube_to_mongo(
            url=request.url,
            cookies_file=request.cookies_file,
            poll_interval_seconds=request.poll_interval_seconds,
            max_wait_seconds=request.max_wait_seconds,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Network error: {exc}") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return TranscribeResponse(**result)


def _json_safe(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    return value


def _db_to_public_record(document: dict[str, Any]) -> dict[str, Any]:
    topics = document.get("topics") or []
    return {
        "record_id": _json_safe(document.get("_id")),
        "source_url": document.get("source_url"),
        "youtube_video_id": document.get("youtube_video_id"),
        "assemblyai": _json_safe(document.get("assemblyai")),
        "overall_title": document.get("overall_title"),
        "overall_summary": document.get("overall_summary"),
        "topic_count": document.get("topic_count", len(topics)),
        "sentence_count": document.get("sentence_count"),
        "topics": _json_safe(topics),
        "created_at": document.get("created_at"),
        "updated_at": document.get("updated_at"),
    }


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_post(request: TranscribeRequest) -> TranscribeResponse:
    return _run_transcription(request)


@router.get("/transcribe", response_model=TranscribeResponse)
def transcribe_get(
    url: str = Query(..., description="YouTube URL"),
    cookies_file: str | None = Query(default=None, description="Path to cookies file"),
    poll_interval_seconds: float = Query(default=3.0, ge=1.0, le=30.0),
    max_wait_seconds: int = Query(default=1800, ge=30, le=7200),
) -> TranscribeResponse:
    request = TranscribeRequest(
        url=url,
        cookies_file=cookies_file,
        poll_interval_seconds=poll_interval_seconds,
        max_wait_seconds=max_wait_seconds,
    )
    return _run_transcription(request)


@router.get("/transcripts/{record_id}")
def get_record(record_id: str) -> dict[str, Any]:
    mongo_uri = _normalize_mongo_uri(
        _require_env("MONGODB_URI", "MONGO_URI", "MONGO_URL")
    )
    mongo_db_name = (
        _env_any("MONGODB_DB_NAME", "MONGO_DB_NAME", default="SkillUP") or "SkillUP"
    )
    mongo_collection = (
        _env_any("MONGODB_COLLECTION", "MONGO_COLLECTION", default="transcripts")
        or "transcripts"
    )

    try:
        store = MongoTranscriptStore(mongo_uri, mongo_db_name, mongo_collection)
        document = store.find_by_id(record_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not document:
        raise HTTPException(status_code=404, detail="Record not found")

    return jsonable_encoder(_json_safe(_db_to_public_record(document)))


@router.get("/lookup")
def lookup_by_video_id(
    video_id: str = Query(..., description="YouTube video ID (11-char)"),
) -> dict[str, Any]:
    """Check if a transcript already exists for a YouTube video."""
    mongo_uri = _normalize_mongo_uri(
        _require_env("MONGODB_URI", "MONGO_URI", "MONGO_URL")
    )
    mongo_db_name = (
        _env_any("MONGODB_DB_NAME", "MONGO_DB_NAME", default="SkillUP") or "SkillUP"
    )
    mongo_collection = (
        _env_any("MONGODB_COLLECTION", "MONGO_COLLECTION", default="transcripts")
        or "transcripts"
    )

    try:
        store = MongoTranscriptStore(mongo_uri, mongo_db_name, mongo_collection)
        document = store.find_by_video_id(video_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not document:
        return {"found": False}

    record = _db_to_public_record(document)
    record["found"] = True
    return jsonable_encoder(_json_safe(record))
