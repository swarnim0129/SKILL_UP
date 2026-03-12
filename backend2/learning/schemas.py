from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Resource(BaseModel):
    """
    Learning resource attached to a roadmap node.
    """

    title: str
    url: str
    platform: str  # "YouTube", "Udemy", "Coursera", etc.
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    is_free: bool = True
    rating: Optional[float] = None
    instructor: Optional[str] = None


class LearningNode(BaseModel):
    topic: str
    resources: List[Resource]
    fetched_at: Optional[str] = None


class GenerateRoadmapRequest(BaseModel):
    topic: str
    force_refresh: bool = False


class GenerateRoadmapResponse(BaseModel):
    success: bool
    mermaid_code: str
    nodes: List[LearningNode]
    message: str


class SavedRoadmap(BaseModel):
    user_id: str
    topic: str
    mermaid_code: str
    nodes: List[LearningNode]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    is_favorite: bool = False
    notes: Optional[str] = None


class SaveRoadmapRequest(BaseModel):
    topic: str
    mermaid_code: str
    nodes: List[LearningNode]
    notes: Optional[str] = None


class RoadmapMetadata(BaseModel):
    id: str
    user_id: str
    topic: str
    created_at: datetime
    node_count: int
    is_favorite: bool = False
    notes: Optional[str] = None


class RoadmapListResponse(BaseModel):
    success: bool
    roadmaps: List[RoadmapMetadata]
    message: str


class RoadmapDetailResponse(BaseModel):
    success: bool
    roadmap: Optional[SavedRoadmap]
    message: str

