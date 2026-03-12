import json
import os
from datetime import datetime
from threading import Lock
from typing import Optional, Dict, Any

"""
Lightweight file-based store for interview metadata.

This is intentionally self-contained and only used by the Interview Agent
feature so we don't have to modify existing Mongo schemas.
"""

_STORE_LOCK = Lock()
_STORE_PATH = os.path.join("output", "interviews.json")


def _ensure_store_file() -> None:
    os.makedirs("output", exist_ok=True)
    if not os.path.exists(_STORE_PATH):
        with open(_STORE_PATH, "w", encoding="utf-8") as file:
            json.dump({"interviews": []}, file)


def _load_store() -> Dict[str, Any]:
    _ensure_store_file()
    with open(_STORE_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def _save_store(store: Dict[str, Any]) -> None:
    with open(_STORE_PATH, "w", encoding="utf-8") as file:
        json.dump(store, file, indent=2)


def create_interview_record(
    interview_id: str,
    assistant_id: str,
    candidate_name: str,
    candidate_email: str,
) -> None:
    with _STORE_LOCK:
        store = _load_store()
        store.setdefault("interviews", [])
        store["interviews"] = [
            item
            for item in store["interviews"]
            if item.get("interviewId") != interview_id
        ]
        store["interviews"].append(
            {
                "interviewId": interview_id,
                "assistantId": assistant_id,
                "candidateName": candidate_name,
                "candidateEmail": candidate_email,
                "status": "pending",
                "createdAt": datetime.utcnow().isoformat(),
                "completedAt": None,
                "reportFile": None,
                "reportData": None,
            }
        )
        _save_store(store)


def find_by_interview_id(interview_id: str) -> Optional[Dict[str, Any]]:
    with _STORE_LOCK:
        store = _load_store()
        for item in store.get("interviews", []):
            if item.get("interviewId") == interview_id:
                return item
    return None


def find_by_assistant_id(assistant_id: str) -> Optional[Dict[str, Any]]:
    if not assistant_id:
        return None
    with _STORE_LOCK:
        store = _load_store()
        for item in store.get("interviews", []):
            if item.get("assistantId") == assistant_id:
                return item
    return None


def mark_completed_by_assistant_id(
    assistant_id: str,
    report_file: str,
    report_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    if not assistant_id:
        return None

    with _STORE_LOCK:
        store = _load_store()
        for index, item in enumerate(store.get("interviews", [])):
            if item.get("assistantId") == assistant_id:
                item["status"] = "completed"
                item["completedAt"] = datetime.utcnow().isoformat()
                item["reportFile"] = report_file
                item["reportData"] = report_data
                store["interviews"][index] = item
                _save_store(store)
                return item
    return None

