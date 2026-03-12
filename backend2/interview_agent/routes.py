from __future__ import annotations
from datetime import datetime, timedelta
import json
import uuid
from typing import Any, Dict

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from logger import get_logger
from .pdf_service import extract_text_from_pdf_bytes
from .ai_service import generate_interview_questions_fast, evaluate_interview_transcript
from .vapi_service import (
    create_vapi_assistant,
    get_latest_call_transcript_by_assistant_id,
)
from .store import (
    create_interview_record,
    find_by_assistant_id,
    find_by_interview_id,
    mark_completed_by_assistant_id,
)
from .models import VapiCallbackPayload
from .utils import log_json_report

logger = get_logger(__name__)

router = APIRouter()


def _extract_assistant_id_from_payload(message: Any) -> str | None:
    call = getattr(message, "call", None)
    if call and hasattr(call, "assistantId"):
        return getattr(call, "assistantId")
    if call and isinstance(call, dict):
        return call.get("assistantId")
    return None


@router.post("/interview/start")
async def start_interview(
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    job_description: str = Form(...),
    resume: UploadFile = File(...),
):
    """
    Start a new mock interview session.
    This endpoint closely mirrors `/start-interview` from the Interview Agent project.
    """
    request_id = str(uuid.uuid4())
    logger.info("[%s] Start Interview for %s", request_id, candidate_name)

    try:
        pdf_bytes = await resume.read()
        resume_text = extract_text_from_pdf_bytes(pdf_bytes)

        questions = generate_interview_questions_fast(resume_text, job_description)

        # Build numbered question list for the system prompt
        questions_text = "\n".join(
            f"Q{i+1} [{q.get('difficulty','medium').upper()}] "
            f"({q.get('category','technical')}): {q.get('question','')}"
            for i, q in enumerate(questions)
        )

        system_prompt = f"""You are a professional technical interviewer conducting a structured job interview with {candidate_name}.

Your behaviour rules:
1. At the very start, greet the candidate and inform them there will be exactly 10 questions — 3 easy, 3 medium, and 4 hard.
2. Ask for their confirmation and readiness before starting (e.g. "Are you ready to begin?").
3. Ask questions ONE AT A TIME strictly in the order listed below.
4. After the candidate answers each question, simply ask: "Thank you for that answer! Is there anything you'd like to add?" — wait for their response, then move to the next question.
5. Do NOT skip questions. Do NOT reveal all questions at once.
6. Keep your tone professional, calm, and encouraging.
7. Do NOT give hints, corrections, or feedback during the interview.
8. After all 10 questions are answered, thank the candidate and close the interview warmly.
9. Never mention how difficult the questions are or comment on the candidate's performance.


Here are the 10 questions you must ask in order:
{questions_text}

Remember: Always wait for the candidate to confirm they are done with each answer before moving to the next question."""

        first_message = (
            f"Hello {candidate_name}! Welcome to your technical interview. "
            "I'm your AI interviewer today. This session will consist of exactly 10 questions — "
            "starting with easier questions and gradually moving to more complex ones. "
            "Before we begin, are you ready to start?"
        )

        vapi_result: Dict[str, Any] = await create_vapi_assistant(
            candidate_name,
            questions,
            system_prompt,
            first_message,
        )

        assistant_id = vapi_result.get("assistant_id")
        if not assistant_id:
            raise HTTPException(status_code=500, detail="Assistant ID missing")

        vapi_response = vapi_result.get("vapi_response") or {}
        assistant_name = vapi_response.get("name", "Vapi Assistant")

        created_at = datetime.utcnow()
        expires_at = created_at + timedelta(days=7)
        interview_id = f"int_{created_at.timestamp()}_{request_id[:6]}"

        create_interview_record(
            interview_id=interview_id,
            assistant_id=assistant_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
        )

        return {
            "success": True,
            "data": {
                "interviewId": interview_id,
                "candidateName": candidate_name,
                "candidateEmail": candidate_email,
                "totalQuestions": len(questions),
                "questionBreakdown": {
                    "easy": len(
                        [q for q in questions if q.get("difficulty") == "easy"]
                    ),
                    "medium": len(
                        [q for q in questions if q.get("difficulty") == "medium"]
                    ),
                    "hard": len(
                        [q for q in questions if q.get("difficulty") == "hard"]
                    ),
                },
                "questions": questions,
                "assistantId": assistant_id,
                "assistantName": assistant_name,
                "vapiAssistantId": assistant_id,
                "vapiAssistantName": assistant_name,
                "expiresAt": expires_at.isoformat(),
            },
        }

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        logger.exception("[%s] Error starting interview: %s", request_id, exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/interview/vapi-callback")
async def vapi_callback_webhook(payload: VapiCallbackPayload):
    """
    Webhook endpoint for Vapi "end-of-call-report" callbacks.
    Vapi should be configured to POST here.
    """
    message = payload.message

    if message.type != "end-of-call-report":
        return {"status": "ignored"}

    if not message.artifact or not message.artifact.transcript:
        return {"status": "error", "reason": "No transcript"}

    transcript = message.artifact.transcript
    assistant_id = _extract_assistant_id_from_payload(message)

    candidate_name = "Unknown Candidate"
    candidate_email = "unknown@example.com"

    if assistant_id:
        record = find_by_assistant_id(assistant_id)
        if record:
            candidate_name = record.get("candidateName", candidate_name)
            candidate_email = record.get("candidateEmail", candidate_email)

    report_data = evaluate_interview_transcript(
        transcript,
        candidate_name,
        candidate_email,
    )

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"report_{timestamp}.json"

    log_json_report(filename, json.dumps(report_data, indent=2))

    if assistant_id:
        mark_completed_by_assistant_id(
            assistant_id=assistant_id,
            report_file=filename,
            report_data=report_data,
        )

    return {
        "success": True,
        "reportFile": filename,
        "data": report_data,
    }


@router.get("/interview/{interview_id}/status")
async def get_interview_status(interview_id: str):
    interview = find_by_interview_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return {
        "success": True,
        "data": interview,
    }


@router.get("/interview/{interview_id}/report")
async def get_interview_report(interview_id: str):
    interview = find_by_interview_id(interview_id)
    if not interview or interview.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Report not ready")

    return {
        "success": True,
        "data": interview.get("reportData"),
    }


@router.post("/interview/{interview_id}/generate-report")
async def generate_report_for_interview(interview_id: str):
    """
    Manually trigger report generation for an interview from the latest Vapi call
    (useful if webhooks are not configured).
    """
    interview = find_by_interview_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    assistant_id = interview.get("assistantId")
    if not assistant_id:
        raise HTTPException(status_code=400, detail="Missing assistantId")

    latest_call = await get_latest_call_transcript_by_assistant_id(assistant_id)

    if not latest_call or not latest_call.get("transcript"):
        logger.error(
            "Transcript not found for assistant %s after all retries.", assistant_id
        )
        raise HTTPException(
            status_code=404,
            detail=(
                "Transcript not found. The call may not have ended yet "
                "or Vapi hasn't processed it."
            ),
        )

    transcript = latest_call["transcript"]
    call_id = latest_call.get("call_id", "unknown")
    logger.info(
        "Transcript fetched successfully. Call ID: %s. Length: %d chars.",
        call_id,
        len(transcript),
    )
    logger.info("Sending transcript to GPT-4o-mini for evaluation...")

    report_data = evaluate_interview_transcript(
        transcript,
        interview.get("candidateName"),
        interview.get("candidateEmail"),
    )

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"report_{timestamp}.json"

    log_json_report(filename, json.dumps(report_data, indent=2))

    mark_completed_by_assistant_id(
        assistant_id=assistant_id,
        report_file=filename,
        report_data=report_data,
    )

    return {
        "success": True,
        "data": report_data,
    }

