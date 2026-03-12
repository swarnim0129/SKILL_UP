"""
Schemas for explainer agent
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ExplainerChatRequest(BaseModel):
    explainer_content: str
    chat_history: List[Dict[str, str]]
    question: str


class ExplainerChatResponse(BaseModel):
    answer: str
    relevant_section: Optional[str] = None


class SaveExplainerRequest(BaseModel):
    explanation: Dict[str, Any]
    original_content: str
    content_source: str
    complexity: str
