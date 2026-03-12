from __future__ import annotations
from datetime import datetime
import json
import os
import time
import uuid
from typing import Any, Dict

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pymongo import MongoClient

from auth.router import get_current_user
from career_recommender.career_counselor import career_counselor
from career_recommender.schema import (
    CareerPath,
    CareerRecommendationRequest,
    CareerRecommendationResponse,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ConversationListResponse,
)
from config import MONGO_DB, MONGO_URI
from database import db as async_db
from logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/career", tags=["Career Recommender"])


# Synchronous Mongo client for conversations (matches original design)
mongo_client = MongoClient(MONGO_URI)
db_sync = mongo_client[MONGO_DB]
conversations_collection = db_sync["career_conversations"]

# Async client reused from global `db` for user profiles
user_profiles_collection = async_db["user_profiles"]


@router.post("/recommend", response_model=CareerRecommendationResponse)
async def get_career_recommendations(
    request: CareerRecommendationRequest,
) -> CareerRecommendationResponse:
    """
    AI Career Path Recommender - suggests suitable career paths based on user profile.
    Uses Tavily web scraping + Gemini AI to provide real-time career recommendations.
    """
    try:
        from career_recommender.tavily_service import tavily_service

        tavily_data = await tavily_service.search_career_trends(
            skills=request.skills,
            interests=request.interests,
        )

        prompt = f"""
Analyze the following web-scraped job market data and user profile, then provide 3-5 personalized career recommendations.

USER PROFILE:
- Skills: {', '.join(request.skills)}
- Interests: {', '.join(request.interests)}
- Education: {request.education}
- Experience: {request.experience_years} years

LATEST JOB MARKET DATA (2026):
{chr(10).join([f"- {result.get('title', '')}: {result.get('content', '')[:200]}" for result in tavily_data.get('results', [])[:8]])}

For each career recommendation, provide:
1. Career Title
2. Match Score (0-1, how well it fits the user)
3. Description (2-3 sentences)
4. Required Skills (list 4-6 key skills)
5. Trending Industries (list 3-4 industries)
6. Average Salary Range
7. Growth Outlook

Return ONLY valid JSON in this exact format:
{{
  "recommendations": [
    {{
      "career_title": "string",
      "match_score": 0.95,
      "description": "string",
      "required_skills": ["skill1", "skill2"],
      "trending_industries": ["industry1", "industry2"],
      "average_salary": "$XX,000 - $XX,000",
      "growth_outlook": "string"
    }}
  ]
}}"""

        if career_counselor:
            response_text = await career_counselor._generate_text(prompt)

            import re

            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                parsed_data = json.loads(json_match.group())
                recommendations = [
                    CareerPath(**rec)
                    for rec in parsed_data.get("recommendations", [])
                ]
            else:
                raise ValueError("Failed to parse AI response")
        else:
            recommendations: list[CareerPath] = []
            for idx, result in enumerate(tavily_data.get("results", [])[:3], 1):
                recommendations.append(
                    CareerPath(
                        career_title=result.get("title", f"Career Option {idx}"),
                        match_score=0.8,
                        description=result.get("content", "No description available")[
                            :150
                        ],
                        required_skills=request.skills[:4],
                        trending_industries=["Technology", "Innovation"],
                        average_salary="Market Rate",
                        growth_outlook="Based on current trends",
                    )
                )

        return CareerRecommendationResponse(
            recommendations=recommendations,
            timestamp=datetime.utcnow(),
        )
    except Exception as exc:
        print(f"Error in career recommendations: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/trends")
async def get_career_trends() -> Dict[str, Any]:
    """
    Get current career trends and in-demand skills.
    """
    return {
        "trending_careers": [
            "AI/ML Engineer",
            "Cloud Architect",
            "Cybersecurity Analyst",
        ],
        "hot_skills": ["Python", "AWS", "React", "Machine Learning", "Docker"],
        "growing_industries": [
            "AI/ML",
            "Cybersecurity",
            "Cloud Computing",
            "Data Science",
        ],
    }


@router.post("/chat", response_model=ChatResponse)
async def chat_message(request: ChatRequest) -> ChatResponse:
    """
    Send a message and get AI counseling response.
    """
    try:
        # Get or create conversation
        if request.conversation_id:
            conversation_doc = conversations_collection.find_one(
                {"conversation_id": request.conversation_id}
            )
            if not conversation_doc:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            conversation_id = str(uuid.uuid4())
            conversation_doc = {
                "conversation_id": conversation_id,
                "user_id": request.user_id,
                "title": (
                    request.message[:50] + "..."
                    if len(request.message) > 50
                    else request.message
                ),
                "messages": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            conversations_collection.insert_one(conversation_doc)

        # Load user profile for context
        user_profile_doc = await user_profiles_collection.find_one(
            {"user_id": request.user_id}
        )

        user_profile: Dict[str, Any] | None = None
        if user_profile_doc:
            skills = [
                s.get("name") if isinstance(s, dict) else s
                for s in user_profile_doc.get("skills", [])
            ]
            interests = [
                i.get("name") if isinstance(i, dict) else i
                for i in user_profile_doc.get("interests", [])
            ]
            user_profile = {
                "skills": skills,
                "interests": interests,
                "education": user_profile_doc.get("education", []),
                "experience_years": len(user_profile_doc.get("experiences", [])),
                "experiences": user_profile_doc.get("experiences", []),
                "projects": user_profile_doc.get("projects", []),
            }

        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat(),
            "attachments": [
                att.model_dump() for att in (request.attachments or [])
            ],
        }

        conversations_collection.update_one(
            {"conversation_id": conversation_doc["conversation_id"]},
            {"$push": {"messages": user_message}, "$set": {"updated_at": datetime.utcnow()}},
        )

        ai_response_text, references = await career_counselor.generate_response(
            user_message=request.message,
            user_profile=user_profile,
            conversation_history=conversation_doc.get("messages", []),
            attachments=[
                att.model_dump() for att in (request.attachments or [])
            ],
        )

        ai_message = {
            "role": "assistant",
            "content": ai_response_text,
            "timestamp": datetime.utcnow().isoformat(),
            "references": references,
            "metadata": {},
        }

        conversations_collection.update_one(
            {"conversation_id": conversation_doc["conversation_id"]},
            {"$push": {"messages": ai_message}, "$set": {"updated_at": datetime.utcnow()}},
        )

        return ChatResponse(
            conversation_id=conversation_doc["conversation_id"],
            message=ChatMessage(**ai_message),
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chat/stream")
async def chat_message_stream(request: ChatRequest) -> StreamingResponse:
    """
    Send a message and get streaming AI response (Server-Sent Events).
    """

    async def event_generator():
        try:
            # Get or create conversation
            if request.conversation_id:
                conversation_doc = conversations_collection.find_one(
                    {"conversation_id": request.conversation_id}
                )
                if not conversation_doc:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Conversation not found'})}\n\n"
                    return
            else:
                conversation_id = str(uuid.uuid4())
                conversation_doc = {
                    "conversation_id": conversation_id,
                    "user_id": request.user_id,
                    "title": (
                        request.message[:50] + "..."
                        if len(request.message) > 50
                        else request.message
                    ),
                    "messages": [],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
                conversations_collection.insert_one(conversation_doc)

                # Send conversation ID first
                yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"

            # Load user profile
            user_profile_doc = await user_profiles_collection.find_one(
                {"user_id": request.user_id}
            )

            user_profile: Dict[str, Any] | None = None
            if user_profile_doc:
                skills = [
                    s.get("name") if isinstance(s, dict) else s
                    for s in user_profile_doc.get("skills", [])
                ]
                interests = [
                    i.get("name") if isinstance(i, dict) else i
                    for i in user_profile_doc.get("interests", [])
                ]
                user_profile = {
                    "skills": skills,
                    "interests": interests,
                    "education": user_profile_doc.get("education", []),
                    "experience_years": len(
                        user_profile_doc.get("experiences", [])
                    ),
                    "experiences": user_profile_doc.get("experiences", []),
                    "projects": user_profile_doc.get("projects", []),
                }

            user_message = {
                "role": "user",
                "content": request.message,
                "timestamp": datetime.utcnow().isoformat(),
                "attachments": [
                    att.model_dump() for att in (request.attachments or [])
                ],
            }

            conversations_collection.update_one(
                {"conversation_id": conversation_doc["conversation_id"]},
                {
                    "$push": {"messages": user_message},
                    "$set": {"updated_at": datetime.utcnow()},
                },
            )

            full_response = ""
            references_sent = False
            saved_references: list[Dict[str, Any]] = []

            async for chunk, references in career_counselor.generate_streaming_response(
                user_message=request.message,
                user_profile=user_profile,
                conversation_history=conversation_doc.get("messages", []),
                attachments=[
                    att.model_dump() for att in (request.attachments or [])
                ],
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"

                if references and not references_sent:
                    saved_references = references
                    yield f"data: {json.dumps({'type': 'references', 'references': references})}\n\n"
                    references_sent = True

            ai_message = {
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.utcnow().isoformat(),
                "references": saved_references,
                "metadata": {},
            }

            conversations_collection.update_one(
                {"conversation_id": conversation_doc["conversation_id"]},
                {
                    "$push": {"messages": ai_message},
                    "$set": {"updated_at": datetime.utcnow()},
                },
            )

            yield "data: {\"type\": \"done\"}\n\n"
        except Exception as exc:  # pragma: no cover - defensive
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Transcribe audio to text using Assembly AI (STT).
    Accepts audio file (e.g. webm, mp3, wav). Returns {"text": "..."}.
    """
    api_key = os.getenv("ASSEMBLYAI_API_KEY")
    if not api_key:
        logger.warning("Speech-to-text called but ASSEMBLYAI_API_KEY is not set")
        raise HTTPException(
            status_code=503,
            detail="Speech-to-text is not configured (missing ASSEMBLYAI_API_KEY)",
        )

    try:
        content = await audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio: {e}") from e

    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file")

    headers = {"authorization": api_key, "content-type": "application/octet-stream"}

    # Upload to Assembly AI (binary body, no Content-Type for body - httpx sends octet-stream when content=bytes)
    async with httpx.AsyncClient(timeout=60.0) as client:
        upload_resp = await client.post(
            "https://api.assemblyai.com/v2/upload",
            headers=headers,
            content=content,
        )
    if upload_resp.status_code != 200:
        err_msg = upload_resp.text or f"status {upload_resp.status_code}"
        logger.warning("Assembly AI upload failed: %s", err_msg)
        raise HTTPException(
            status_code=502,
            detail=f"Assembly AI upload failed: {err_msg}",
        )

    try:
        upload_url = upload_resp.json()["upload_url"]
    except (KeyError, ValueError):
        raise HTTPException(status_code=502, detail="Invalid upload response from Assembly AI")

    # Request transcription (speech_models required by Assembly AI API)
    async with httpx.AsyncClient(timeout=60.0) as client:
        transcript_resp = await client.post(
            "https://api.assemblyai.com/v2/transcript",
            headers=headers,
            json={
                "audio_url": upload_url,
                "speech_models": ["universal-2"],
            },
        )
    if transcript_resp.status_code not in (200, 201):
        err_msg = transcript_resp.text or f"status {transcript_resp.status_code}"
        logger.warning("Assembly AI transcript request failed: %s", err_msg)
        raise HTTPException(
            status_code=502,
            detail=f"Assembly AI transcript request failed: {err_msg}",
        )

    try:
        transcript_id = transcript_resp.json()["id"]
    except (KeyError, ValueError):
        raise HTTPException(status_code=502, detail="Invalid transcript response from Assembly AI")

    # Poll until completed (or error)
    poll_url = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
    for _ in range(60):
        async with httpx.AsyncClient(timeout=10.0) as client:
            poll_resp = await client.get(poll_url, headers=headers)
        if poll_resp.status_code != 200:
            logger.warning("Assembly AI polling failed: %s", poll_resp.text)
            raise HTTPException(status_code=502, detail="Assembly AI polling failed")
        data = poll_resp.json()
        status = data.get("status")
        if status == "completed":
            return {"text": (data.get("text") or "").strip() or "(no speech detected)"}
        if status == "error":
            raise HTTPException(
                status_code=502,
                detail=data.get("error", "Assembly AI transcription failed"),
            )
        time.sleep(1)

    raise HTTPException(status_code=504, detail="Transcription timed out")


@router.get("/conversations/", response_model=ConversationListResponse)
async def get_my_conversations(
    current_user: dict = Depends(get_current_user),
) -> ConversationListResponse:
    """
    Get all conversations for the authenticated user (for sidebar).
    """
    try:
        user_id = str(current_user["_id"])
        conversations = list(
            conversations_collection.find(
                {"user_id": user_id},
                {
                    "conversation_id": 1,
                    "title": 1,
                    "updated_at": 1,
                    "created_at": 1,
                    "_id": 0,
                },
            ).sort("updated_at", -1)
        )

        for conv in conversations:
            conv["updated_at"] = (
                conv.get("updated_at", datetime.utcnow()).isoformat()
            )
            conv["created_at"] = (
                conv.get("created_at", datetime.utcnow()).isoformat()
            )

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations),
        )
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Error fetching conversations: {exc}")
        return ConversationListResponse(conversations=[], total=0)


@router.get("/conversations/{user_id}", response_model=ConversationListResponse)
async def get_user_conversations(user_id: str) -> ConversationListResponse:
    """
    Get all conversations for a user (legacy endpoint used by frontend).
    """
    try:
        conversations = list(
            conversations_collection.find(
                {"user_id": user_id},
                {
                    "conversation_id": 1,
                    "title": 1,
                    "updated_at": 1,
                    "created_at": 1,
                    "_id": 0,
                },
            ).sort("updated_at", -1)
        )

        for conv in conversations:
            conv["updated_at"] = (
                conv.get("updated_at", datetime.utcnow()).isoformat()
            )
            conv["created_at"] = (
                conv.get("created_at", datetime.utcnow()).isoformat()
            )

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations),
        )
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Error fetching conversations: {exc}")
        return ConversationListResponse(conversations=[], total=0)


@router.get("/conversations/{user_id}/{conversation_id}")
async def get_conversation(user_id: str, conversation_id: str) -> Dict[str, Any]:
    """
    Get full conversation with all messages.
    """
    try:
        conversation = conversations_collection.find_one(
            {"conversation_id": conversation_id, "user_id": user_id},
            {"_id": 0},
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conversation.get("created_at"):
            conversation["created_at"] = conversation["created_at"].isoformat()
        if conversation.get("updated_at"):
            conversation["updated_at"] = conversation["updated_at"].isoformat()
        return conversation
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Error fetching conversation: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/conversations/{user_id}/{conversation_id}")
async def delete_conversation(user_id: str, conversation_id: str) -> Dict[str, str]:
    """
    Delete a conversation.
    """
    try:
        result = conversations_collection.delete_one(
            {"conversation_id": conversation_id, "user_id": user_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc

