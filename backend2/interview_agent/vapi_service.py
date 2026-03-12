import os
from typing import Any, Dict, Optional

import httpx

from logger import get_logger

logger = get_logger(__name__)


def _get_vapi_api_key() -> str:
    api_key = os.getenv("VAPI_API_KEY")
    if not api_key:
        logger.error("VAPI_API_KEY is not set in environment!")
        raise ValueError("Missing VAPI_API_KEY for Interview Agent feature")
    return api_key


async def create_vapi_assistant(
    candidate_name: str,
    questions: list,
    system_prompt: str,
    first_message: str,
) -> Dict[str, Any]:
    """
    Calls the Vapi API to spin up an assistant configured for this specific interview.
    Adapted from the standalone Interview Agent project.
    """
    logger.info("Building Vapi Assistant payload...")

    api_key = _get_vapi_api_key()

    # Limit to 40 characters for Vapi name limits
    assistant_name = candidate_name[:40] if candidate_name else "Candidate"

    vapi_params: Dict[str, Any] = {
        "name": assistant_name,
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                }
            ],
            "temperature": 0.7,
            "maxTokens": 500,
        },
        "voice": {
            "provider": "11labs",
            "voiceId": "21m00Tcm4TlvDq8ikWAM",
        },
        "firstMessage": first_message,
        "endCallMessage": "Thank you for completing the interview. We'll be in touch soon. Goodbye!",
        "recordingEnabled": True,
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en",
        },
        "silenceTimeoutSeconds": 30,
        "maxDurationSeconds": 1800,
        "backgroundSound": "office",
    }

    url = "https://api.vapi.ai/assistant"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    logger.info("Posting configuration to Vapi assistant endpoint...")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                url, headers=headers, json=vapi_params, timeout=15.0
            )
            response.raise_for_status()

            vapi_response_data: Any = response.json()

            # Unpack array if needed (Vapi sometimes returns arrays)
            if isinstance(vapi_response_data, list):
                vapi_response_data = vapi_response_data[0]

            assistant_id: Optional[str] = vapi_response_data.get("id")
            if not assistant_id:
                raise ValueError("Vapi response did not contain an 'id'.")

            logger.info("Vapi Assistant successfully created. ID: %s", assistant_id)
            return {
                "assistant_id": assistant_id,
                "vapi_response": vapi_response_data,
            }

        except httpx.HTTPStatusError as exc:  # pragma: no cover
            logger.error(
                "Vapi API error (status %s): %s",
                exc.response.status_code,
                exc.response.text,
            )
            raise ValueError(
                f"Failed to create Vapi Assistant: {exc.response.text}"
            ) from exc
        except Exception as exc:  # pragma: no cover
            logger.exception("Unexpected error calling Vapi: %s", exc)
            raise


async def get_latest_call_transcript_by_assistant_id(
    assistant_id: str, max_retries: int = 5, retry_delay: float = 4.0
) -> Optional[Dict[str, Any]]:
    """
    Fetch latest ended call for an assistant and return transcript payload.
    Retries up to max_retries times with retry_delay seconds between attempts,
    because Vapi takes a few seconds after call-end to process and store the transcript.
    """
    import asyncio

    api_key = _get_vapi_api_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for attempt in range(1, max_retries + 1):
        logger.info(
            "Fetching transcript from Vapi (attempt %d/%d)...",
            attempt,
            max_retries,
        )
        async with httpx.AsyncClient() as client:
            try:
                list_url = "https://api.vapi.ai/call"
                list_response = await client.get(
                    list_url,
                    headers=headers,
                    params={"assistantId": assistant_id, "limit": 10},
                    timeout=20.0,
                )
                list_response.raise_for_status()
                calls = list_response.json()

                if not isinstance(calls, list) or len(calls) == 0:
                    logger.warning(
                        "No calls found for assistant %s on attempt %d.",
                        assistant_id,
                        attempt,
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(retry_delay)
                    continue

                calls_sorted = sorted(
                    calls,
                    key=lambda item: item.get("endedAt")
                    or item.get("createdAt")
                    or "",
                    reverse=True,
                )

                latest_call = calls_sorted[0]
                call_id = latest_call.get("id")
                if not call_id:
                    if attempt < max_retries:
                        await asyncio.sleep(retry_delay)
                    continue

                call_url = f"https://api.vapi.ai/call/{call_id}"
                call_response = await client.get(
                    call_url, headers=headers, timeout=20.0
                )
                call_response.raise_for_status()
                call_data = call_response.json()

                artifact = call_data.get("artifact") or {}
                transcript = artifact.get("transcript")

                if not transcript:
                    logger.warning(
                        "Transcript not ready yet on attempt %d for call %s. Retrying...",
                        attempt,
                        call_id,
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(retry_delay)
                    continue

                logger.info(
                    "Transcript fetched successfully on attempt %d.", attempt
                )
                return {
                    "call_id": call_id,
                    "transcript": transcript,
                    "call_data": call_data,
                }

            except httpx.HTTPStatusError as exc:  # pragma: no cover
                logger.error(
                    "Vapi Call API error (status %s): %s",
                    exc.response.status_code,
                    exc.response.text,
                )
                raise ValueError(
                    f"Failed to fetch latest call transcript: {exc.response.text}"
                ) from exc
            except Exception as exc:  # pragma: no cover
                logger.exception(
                    "Unexpected error fetching latest call transcript: %s", exc
                )
                raise

    logger.error(
        "Transcript not available after %d attempts for assistant %s.",
        max_retries,
        assistant_id,
    )
    return None

