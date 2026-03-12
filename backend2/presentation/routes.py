"""
API routes for presentation (PPT) generation.
Ported from ML_Mumbai and adapted to async Mongo + GeminiService.
"""
from datetime import datetime
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from auth.router import get_current_user
from config import get_database
from database import get_next_sequence
from logger import get_logger
from presentation.schemas import (
    OutlineRequest,
    OutlineResponse,
    PresentationRequest,
    PresentationResponse,
)
from presentation.services import generate_outline, generate_presentation
from presentation.pptx_generator import create_pptx

logger = get_logger(__name__)

router = APIRouter(prefix="/presentation", tags=["Presentation"])


@router.post("/outline", response_model=OutlineResponse)
async def create_outline(request: OutlineRequest) -> Dict[str, Any]:
    """
    Generate presentation outline from a topic.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION API] Received outline request")
    logger.info(f"[PRESENTATION API] Topic: {request.prompt}")
    logger.info(f"[PRESENTATION API] Num Slides: {request.num_slides}")
    logger.info(f"[PRESENTATION API] Language: {request.language}")

    try:
        result = await generate_outline(
            topic=request.prompt,
            num_slides=request.num_slides,
            language=request.language,
        )

        logger.info("[PRESENTATION API] Successfully generated outline")
        logger.info("=" * 80)

        return result
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION API ERROR] Unexpected error: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {error_msg}"
        ) from e


@router.post("/generate", response_model=PresentationResponse)
async def create_presentation(
    request: PresentationRequest,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Generate full presentation with slides and save to MongoDB.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION API] Received presentation generation request")
    logger.info(
        f"[PRESENTATION API] User: {current_user.get('email')} "
        f"(user_id: {current_user.get('_id')})"
    )
    logger.info(f"[PRESENTATION API] Title: {request.title}")
    logger.info(f"[PRESENTATION API] Outline items: {len(request.outline)}")
    logger.info(f"[PRESENTATION API] Language: {request.language}")
    logger.info(f"[PRESENTATION API] Tone: {request.tone}")
    logger.info(f"[PRESENTATION API] Theme: {request.theme}")

    try:
        result = await generate_presentation(
            title=request.title,
            prompt=request.prompt,
            outline=request.outline,
            language=request.language,
            tone=request.tone,
            theme=request.theme,
        )

        # Save to MongoDB (best-effort)
        try:
            db = await get_database()
            ppt_id = await get_next_sequence("presentations")
            logger.info(f"[PRESENTATION API] Generated ppt_id: {ppt_id}")

            ppt_document = {
                "ppt_id": ppt_id,
                "user_id": str(current_user.get("_id")),
                "user_email": current_user.get("email"),
                "title": request.title,
                "topic": request.prompt[:1000],
                "slides": result["slides"],
                "num_slides": len(result["slides"]),
                "language": request.language,
                "tone": request.tone,
                "theme": request.theme,
                "outline": request.outline,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }

            db_result = await db["presentations"].insert_one(ppt_document)
            logger.info(
                "[PRESENTATION API] Saved to MongoDB with _id: %s",
                db_result.inserted_id,
            )

            result["ppt_id"] = ppt_id
        except Exception as db_error:  # noqa: BLE001
            logger.error(
                "[PRESENTATION API WARNING] Failed to save to MongoDB: %s", db_error
            )

        logger.info("[PRESENTATION API] Successfully generated presentation")
        logger.info("=" * 80)

        return result
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION API ERROR] Unexpected error: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {error_msg}"
        ) from e


class DownloadRequest(BaseModel):
    title: str
    slides: List[Dict[str, Any]]
    theme: str = "default"
    font: str = "Inter"


@router.post("/download")
async def download_presentation(request: DownloadRequest):
    """
    Download presentation as PPTX file.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION API] Received download request")
    logger.info(f"[PRESENTATION API] Title: {request.title}")
    logger.info(f"[PRESENTATION API] Slides: {len(request.slides)}")
    logger.info(f"[PRESENTATION API] Theme: {request.theme}")
    logger.info(f"[PRESENTATION API] Font: {request.font}")

    try:
        pptx_file = create_pptx(
            title=request.title,
            slides=request.slides,
            theme=request.theme,
            font=request.font,
        )

        filename = f"{request.title.replace(' ', '_')}.pptx"

        logger.info(f"[PRESENTATION API] Successfully generated PPTX: {filename}")
        logger.info("=" * 80)

        return StreamingResponse(
            pptx_file,
            media_type=(
                "application/vnd.openxmlformats-officedocument.presentationml."
                "presentation"
            ),
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:  # noqa: BLE001
        error_msg = str(e)
        logger.error(f"[PRESENTATION API ERROR] Download failed: {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate PPTX: {error_msg}"
        ) from e


@router.get("/history")
async def get_presentation_history(current_user: dict = Depends(get_current_user)):
    """
    Get presentation history for the current user.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION HISTORY] GET /history endpoint called")
    logger.info(
        "[PRESENTATION HISTORY] User: %s (user_id: %s)",
        current_user.get("email"),
        current_user.get("_id"),
    )

    try:
        db = await get_database()
        user_id = str(current_user.get("_id"))
        logger.info(
            "[PRESENTATION HISTORY] Querying presentations for user_id: %s", user_id
        )

        cursor = (
            db["presentations"]
            .find({"user_id": user_id})
            .sort("created_at", -1)
        )
        presentations = await cursor.to_list(length=None)

        logger.info(
            "[PRESENTATION HISTORY] Found %d presentations for user",
            len(presentations),
        )

        for ppt in presentations:
            ppt["_id"] = str(ppt["_id"])
            if "created_at" in ppt and isinstance(ppt["created_at"], datetime):
                ppt["created_at"] = ppt["created_at"].isoformat()
            if "updated_at" in ppt and isinstance(ppt["updated_at"], datetime):
                ppt["updated_at"] = ppt["updated_at"].isoformat()

        logger.info(
            "[PRESENTATION HISTORY] Returning %d presentations", len(presentations)
        )
        logger.info("=" * 80)

        return {
            "success": True,
            "presentations": presentations,
            "count": len(presentations),
        }
    except Exception as e:  # noqa: BLE001
        error_msg = str(e)
        logger.error("[PRESENTATION HISTORY ERROR] Failed to retrieve history")
        logger.error("[PRESENTATION HISTORY ERROR] Error: %s", error_msg)
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve presentation history: {error_msg}",
        ) from e


@router.get("/history/{ppt_id}")
async def get_presentation_by_id(
    ppt_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a specific presentation by ID.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION BY ID] GET /history/%s endpoint called", ppt_id)
    logger.info("[PRESENTATION BY ID] User: %s", current_user.get("email"))

    try:
        db = await get_database()
        user_id = str(current_user.get("_id"))

        presentation = await db["presentations"].find_one(
            {
                "ppt_id": ppt_id,
                "user_id": user_id,
            }
        )

        if not presentation:
            logger.error(
                "[PRESENTATION BY ID] Presentation %s not found for user", ppt_id
            )
            logger.error("=" * 80)
            raise HTTPException(status_code=404, detail="Presentation not found")

        presentation["_id"] = str(presentation["_id"])
        if "created_at" in presentation and isinstance(
            presentation["created_at"], datetime
        ):
            presentation["created_at"] = presentation["created_at"].isoformat()
        if "updated_at" in presentation and isinstance(
            presentation["updated_at"], datetime
        ):
            presentation["updated_at"] = presentation["updated_at"].isoformat()

        logger.info("[PRESENTATION BY ID] Found presentation %s", ppt_id)
        logger.info("=" * 80)

        return {
            "success": True,
            "presentation": presentation,
        }
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        error_msg = str(e)
        logger.error("[PRESENTATION BY ID ERROR] Error: %s", error_msg)
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve presentation: {error_msg}",
        ) from e

