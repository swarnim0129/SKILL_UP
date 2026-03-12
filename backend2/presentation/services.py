from __future__ import annotations
"""
Business logic services for presentation generation.
Ported from ML_Mumbai and adapted to use ProjectMorpheus GeminiService.
"""
import json
import re
from typing import List, Dict, Any

from fastapi import HTTPException

from logger import get_logger
from gemini_service import gemini_service
from presentation.prompts import get_outline_prompt, get_presentation_prompt

logger = get_logger(__name__)


async def _generate_text_with_gemini(prompt: str, context: str) -> str:
    """
    Call Gemini via the shared HTTP service and return the primary text output.
    """
    logger.info(f"[{context}] Sending prompt to Gemini (length={len(prompt)})")

    try:
        response_json = await gemini_service.generate(prompt)

        # Extract text from Gemini HTTP response
        candidates = response_json.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates in Gemini response")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise ValueError("No content parts in Gemini response")

        response_text = parts[0].get("text", "").strip()
        logger.info(
            f"[{context}] Received response from Gemini (length={len(response_text)})"
        )
        return response_text
    except Exception as exc:
        logger.error(f"[{context}] Gemini generation failed: {exc}")
        raise HTTPException(
            status_code=500, detail=f"AI generation failed: {exc}"
        ) from exc


def parse_outline_response(response_text: str) -> Dict[str, Any]:
    """
    Parse outline response to extract title and outline items.
    """
    logger.info("[PRESENTATION OUTLINE] Parsing outline response")

    # Extract title from XML tags
    title_match = re.search(r"<TITLE>(.*?)</TITLE>", response_text, re.DOTALL)
    if not title_match:
        logger.warning(
            "[PRESENTATION OUTLINE] No title found in XML tags, using default"
        )
        title = "Untitled Presentation"
    else:
        title = title_match.group(1).strip()

    # Remove title XML tags from text
    outline_text = re.sub(
        r"<TITLE>.*?</TITLE>", "", response_text, flags=re.DOTALL
    ).strip()

    # Split by markdown headers (# Topic)
    outline_items: List[str] = []
    current_topic: str | None = None
    current_bullets: List[str] = []

    for line in outline_text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Header
        if line.startswith("# "):
            if current_topic:
                topic_content = f"{current_topic}\n" + "\n".join(current_bullets)
                outline_items.append(topic_content)

            current_topic = line
            current_bullets = []
        elif line.startswith("- "):
            current_bullets.append(line)

    # Last topic
    if current_topic:
        topic_content = f"{current_topic}\n" + "\n".join(current_bullets)
        outline_items.append(topic_content)

    logger.info(f"[PRESENTATION OUTLINE] Extracted title: {title}")
    logger.info(f"[PRESENTATION OUTLINE] Extracted {len(outline_items)} outline items")

    return {
        "title": title,
        "outline": outline_items,
    }


def parse_json_response(response: str, context: str | None = None) -> Any:
    """
    Parse JSON from Gemini response, handling markdown code blocks.
    Ported from ML_Mumbai `core.gemini_client.parse_json_response`.
    """
    ctx = context or "PARSE"
    logger.info(f"[{ctx}] Parsing JSON response")

    cleaned = response.strip()

    # Remove markdown code blocks if present
    if cleaned.startswith("```json"):
        logger.info(f"[{ctx}] Removing ```json markdown wrapper")
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        logger.info(f"[{ctx}] Removing ``` markdown wrapper")
        cleaned = cleaned[3:]

    if cleaned.endswith("```"):
        logger.info(f"[{ctx}] Removing trailing ```")
        cleaned = cleaned[:-3]

    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
        logger.info(f"[{ctx}] JSON parsed successfully")
        return parsed
    except json.JSONDecodeError as e:
        logger.error(f"[{ctx} ERROR] JSON decode failed: {str(e)}")
        logger.error(f"[{ctx} ERROR] Response preview: {cleaned[:500]}")
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}"
        ) from e


async def generate_outline(
    topic: str,
    num_slides: int,
    language: str = "en-US",
) -> Dict[str, Any]:
    """
    Generate presentation outline from topic.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION OUTLINE] Starting outline generation")
    logger.info(f"[PRESENTATION OUTLINE] Topic: {topic}")
    logger.info(f"[PRESENTATION OUTLINE] Number of slides: {num_slides}")
    logger.info(f"[PRESENTATION OUTLINE] Language: {language}")

    prompt = get_outline_prompt(topic, num_slides, language)

    try:
        response_text = await _generate_text_with_gemini(
            prompt, context="PRESENTATION OUTLINE"
        )

        result = parse_outline_response(response_text)

        logger.info("[PRESENTATION OUTLINE] Outline generation completed successfully")
        logger.info("=" * 80)

        return {
            "success": True,
            "title": result["title"],
            "outline": result["outline"],
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION OUTLINE ERROR] {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate outline: {error_msg}",
        ) from e


async def generate_presentation(
    title: str,
    prompt: str,
    outline: List[str],
    language: str = "en-US",
    tone: str = "professional",
    theme: str = "default",
) -> Dict[str, Any]:
    """
    Generate full presentation with slides.
    """
    logger.info("=" * 80)
    logger.info("[PRESENTATION GENERATE] Starting presentation generation")
    logger.info(f"[PRESENTATION GENERATE] Title: {title}")
    logger.info(f"[PRESENTATION GENERATE] Number of outline items: {len(outline)}")
    logger.info(f"[PRESENTATION GENERATE] Language: {language}")
    logger.info(f"[PRESENTATION GENERATE] Tone: {tone}")
    logger.info(f"[PRESENTATION GENERATE] Theme: {theme}")

    presentation_prompt = get_presentation_prompt(
        title, prompt, outline, language, tone
    )

    try:
        response_text = await _generate_text_with_gemini(
            presentation_prompt, context="PRESENTATION GENERATE"
        )

        slides_data = parse_json_response(
            response_text, context="PRESENTATION GENERATE"
        )

        if not isinstance(slides_data, list):
            raise ValueError("AI response is not a list of slides")

        logger.info(
            f"[PRESENTATION GENERATE] Number of slides generated: {len(slides_data)}"
        )

        for idx, slide in enumerate(slides_data):
            layout = slide.get("layout", "N/A")
            section_layout = slide.get("section_layout", "N/A")
            logger.info(
                f"[PRESENTATION GENERATE] Slide {idx + 1}: Layout={layout}, Position={section_layout}"
            )

        logger.info("[PRESENTATION GENERATE] Presentation generation completed")
        logger.info("=" * 80)

        return {
            "success": True,
            "title": title,
            "slides": slides_data,
            "theme": theme,
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[PRESENTATION GENERATE ERROR] {error_msg}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate presentation: {error_msg}",
        ) from e

