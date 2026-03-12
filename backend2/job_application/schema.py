from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from ai_resume_builder.schema import AIResumeData


class CoverLetterSection(BaseModel):
    heading: str
    content: str


class CoverLetter(BaseModel):
    greeting: str
    opening_paragraph: str
    body_paragraphs: List[str]
    closing_paragraph: str
    signature: str


class ApplicationRequest(BaseModel):
    job_id: str
    job_title: str
    company: str
    job_description: str


class ApplicationGenerateResponse(BaseModel):
    success: bool
    tailored_resume: Optional[AIResumeData] = None
    cover_letter: Optional[CoverLetter] = None
    message: str


class SaveApplicationRequest(BaseModel):
    job_id: str
    job_title: str
    company: str
    job_description: str
    tailored_resume: AIResumeData
    cover_letter: CoverLetter


class Application(BaseModel):
    user_id: str
    job_id: str
    job_title: str
    company: str
    job_description: str
    tailored_resume: Optional[AIResumeData] = None
    cover_letter: Optional[CoverLetter] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
    status: str = "draft"
    application_source: Optional[str] = None
    company_email: Optional[str] = None
    subject: Optional[str] = None


class ApplicationResponse(BaseModel):
    success: bool
    application: Optional[Application] = None
    message: str


class ApplicationsListResponse(BaseModel):
    success: bool
    applications: List[Application]
    total: int
    message: str

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from .ai_resume_schema import AIResumeData


class CoverLetter(BaseModel):
    """Well-structured cover letter in JSON format"""

    greeting: str  # e.g., "Dear Hiring Manager,"
    opening_paragraph: str  # Hook and position interest
    body_paragraphs: List[str]  # 2-3 paragraphs about qualifications, experiences
    closing_paragraph: str  # Call to action and availability
    signature: str  # e.g., "Sincerely, [Name]"


class ApplicationRequest(BaseModel):
    """Request to generate application materials"""

    job_id: str
    job_title: str
    company: str
    job_description: str


class ApplicationGenerateResponse(BaseModel):
    """Response with generated resume and cover letter"""

    success: bool
    tailored_resume: Optional[AIResumeData] = None
    cover_letter: Optional[CoverLetter] = None
    message: str


class SaveApplicationRequest(BaseModel):
    """Request to save an application"""

    job_id: str
    job_title: str
    company: str
    job_description: str
    tailored_resume: AIResumeData
    cover_letter: CoverLetter


class Application(BaseModel):
    """Saved application model"""

    user_id: str
    job_id: str
    job_title: str
    company: str
    job_description: str
    tailored_resume: Optional[AIResumeData] = None  # Optional for cold mail
    cover_letter: Optional[CoverLetter] = None  # Optional for cold mail
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
    status: str = "draft"  # draft, submitted, archived
    application_source: Optional[str] = None  # "job_application" or "cold_mail"
    company_email: Optional[str] = None  # For cold mail applications
    subject: Optional[str] = None  # For cold mail applications


class ApplicationResponse(BaseModel):
    """Response with single application"""

    success: bool
    application: Optional[Application] = None
    message: str


class ApplicationsListResponse(BaseModel):
    """Response with list of user applications"""

    success: bool
    applications: List[Application]
    total: int
    message: str

