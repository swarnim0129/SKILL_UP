from datetime import datetime
import html
import uuid

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pymongo import MongoClient

from logger import get_logger
from config import MONGO_URI, MONGO_DB
from career_recommender.career_counselor import career_counselor


logger = get_logger(__name__)
router = APIRouter(prefix="/twilio", tags=["Twilio WhatsApp"])

# Reuse the same conversations collection as the Career Recommender chat,
# so WhatsApp conversations share history and schema.
mongo_client = MongoClient(MONGO_URI)
db_sync = mongo_client[MONGO_DB]
conversations_collection = db_sync["career_conversations"]


@router.post("/whatsapp-career")
async def whatsapp_career_bot(request: Request) -> Response:
    """
    Twilio WhatsApp webhook that turns incoming messages into
    questions for the AI Career Counselor and replies with text,
    preserving conversation history per WhatsApp number.
    """
    form = await request.form()

    # Example "From": "whatsapp:+1234567890"
    from_number = (form.get("From") or "").strip()
    body = (form.get("Body") or "").strip()

    logger.info("📩 WhatsApp webhook from %s with body: %s", from_number, body)

    if not body:
        twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Send me a question about your career, and I’ll help you decide paths, skills, and next steps.</Message>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    user_id = from_number or "whatsapp-anonymous"

    # Fetch or create a dedicated WhatsApp conversation for this number
    conversation_doc = conversations_collection.find_one(
        {"user_id": user_id, "metadata.channel": "whatsapp"}
    )

    if not conversation_doc:
        conversation_id = str(uuid.uuid4())
        conversation_doc = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "title": "WhatsApp Career Counselor",
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "metadata": {"channel": "whatsapp"},
        }
        conversations_collection.insert_one(conversation_doc)
        logger.info("📝 Created new WhatsApp conversation %s for %s", conversation_id, user_id)

    # Add the latest user message to the conversation
    user_message = {
        "role": "user",
        "content": body,
        "timestamp": datetime.utcnow().isoformat(),
        "attachments": [],
    }

    conversations_collection.update_one(
        {"conversation_id": conversation_doc["conversation_id"]},
        {
            "$push": {"messages": user_message},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    # Use prior messages as conversation history for the AI
    conversation_history = conversation_doc.get("messages", [])

    try:
        response_text, _refs = await career_counselor.generate_response(
            user_message=body,
            user_profile=None,
            conversation_history=conversation_history,
            attachments=None,
        )
    except Exception as exc:  # pragma: no cover - defensive path
        logger.error("Error generating WhatsApp career response: %s", exc)
        response_text = (
            "Sorry, I ran into an error while generating advice. "
            "Please try again in a moment."
        )

    # Save AI message to the same conversation
    ai_message = {
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.utcnow().isoformat(),
        "references": [],
        "metadata": {},
    }

    conversations_collection.update_one(
        {"conversation_id": conversation_doc["conversation_id"]},
        {
            "$push": {"messages": ai_message},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    # Twilio requires XML; escape any special characters.
    safe_text = html.escape(response_text[:1500])

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>{safe_text}</Message>
</Response>"""

    return Response(content=twiml, media_type="application/xml")

