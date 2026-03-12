from typing import List, Optional

from pydantic import BaseModel


class CompanySearchRequest(BaseModel):
    company_type: str


class CompanyInfo(BaseModel):
    company_name: str
    website: str
    description: Optional[str] = None
    emails: List[str] = []
    status: str


class CompanySearchResponse(BaseModel):
    success: bool
    companies: List[CompanyInfo]
    total: int
    message: Optional[str] = None


class EmailTemplateRequest(BaseModel):
    company_name: str
    user_name: str
    user_email: str
    user_bio: Optional[str] = None
    user_skills: Optional[List[str]] = None


class EmailTemplateResponse(BaseModel):
    success: bool
    subject: str
    body: str
    message: Optional[str] = None


class SendEmailRequest(BaseModel):
    company_name: str
    company_email: str
    subject: str
    body: str
    smtp_email: str
    smtp_password: str
    resume_file: Optional[str] = None


class SendEmailResponse(BaseModel):
    success: bool
    message: str


class BulkSendRequest(BaseModel):
    companies: List[dict]
    subject: str
    body: str
    smtp_email: str
    smtp_password: str
    resume_file: Optional[str] = None


class BulkSendResponse(BaseModel):
    success: bool
    sent: int
    failed: int
    results: List[dict]

from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CompanySearchRequest(BaseModel):
    company_type: str


class CompanyInfo(BaseModel):
    company_name: str
    website: str
    description: Optional[str] = None
    emails: List[str] = []
    status: str  # "email_found", "no_email", "scraping_failed"


class CompanySearchResponse(BaseModel):
    success: bool
    companies: List[CompanyInfo]
    total: int
    message: Optional[str] = None


class EmailTemplateRequest(BaseModel):
    company_name: str
    user_name: str
    user_email: str
    user_bio: Optional[str] = None
    user_skills: Optional[List[str]] = None


class EmailTemplateResponse(BaseModel):
    success: bool
    subject: str
    body: str
    message: Optional[str] = None


class SendEmailRequest(BaseModel):
    company_name: str
    company_email: str
    subject: str
    body: str
    smtp_email: str
    smtp_password: str
    resume_file: Optional[str] = None  # Base64 encoded resume


class SendEmailResponse(BaseModel):
    success: bool
    message: str


class BulkSendRequest(BaseModel):
    companies: List[Dict[str, Any]]  # List of {company_name, company_email, company_website}
    subject: str
    body: str
    smtp_email: str
    smtp_password: str
    resume_file: Optional[str] = None


class BulkSendResponse(BaseModel):
    success: bool
    sent: int
    failed: int
    results: List[Dict[str, Any]]  # List of {company_name, status, message}

