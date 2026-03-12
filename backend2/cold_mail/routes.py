from datetime import datetime
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse

import asyncio
import base64
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException

from auth.router import get_current_user
from cold_mail.schema import (
    BulkSendRequest,
    BulkSendResponse,
    CompanyInfo,
    CompanySearchRequest,
    CompanySearchResponse,
    EmailTemplateRequest,
    EmailTemplateResponse,
    SendEmailRequest,
    SendEmailResponse,
)
from config import get_database
from gemini_service import gemini_service
from logger import get_logger


logger = get_logger(__name__)
router = APIRouter(prefix="/cold-mail", tags=["Cold Mail"])


async def _find_companies_with_emails(company_type: str) -> List[dict]:
    """
    Two-step system: company finder + email finder.
    Uses the original HACKSYNC scrapers.
    """
    try:
        from cold_mail.company_finder import company_finder
        from cold_mail.email_finder import email_finder

        companies = await company_finder.find_companies(
            company_type, target_count=100
        )
        if not companies:
            return []

        companies_with_emails: List[dict] = []
        batch_size = 10

        for i in range(0, len(companies), batch_size):
            batch = companies[i : i + batch_size]

            tasks = [email_finder.find_emails(c["website"]) for c in batch]
            email_results = await asyncio.gather(*tasks, return_exceptions=True)

            for j, company in enumerate(batch):
                emails: List[str] = []
                if isinstance(email_results[j], list):
                    emails = email_results[j]

                if emails:
                    companies_with_emails.append(
                        {
                            "company_name": company["company_name"],
                            "website": company["website"],
                            "description": company.get("description"),
                            "emails": emails,
                            "status": "email_found",
                        }
                    )

            if i + batch_size < len(companies):
                await asyncio.sleep(1)

        return companies_with_emails
    except Exception as exc:  # pragma: no cover
        logger.error("Company/email finding failed: %s", exc)
        import traceback

        traceback.print_exc()
        return []


@router.post("/search-companies", response_model=CompanySearchResponse)
async def search_companies(
    request: CompanySearchRequest, current_user: dict = Depends(get_current_user)
) -> CompanySearchResponse:
    """
    Search for companies and extract their emails using company_finder + email_finder.
    Caches companies in Mongo and filters out ones the user has already applied to.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])
        company_type = request.company_type.lower().strip()

        existing_cursor = db.companies.find({"company_type": company_type})
        existing = await existing_cursor.to_list(length=200)

        companies_data: List[Dict[str, Any]] = []

        if existing:
            # Simulate some delay to keep UX consistent
            await asyncio.sleep(2)
            for company_doc in existing:
                parsed = urlparse(company_doc.get("website", ""))
                domain = parsed.netloc.replace("www.", "").lower()
                companies_data.append(
                    {
                        "company_name": company_doc.get("company_name"),
                        "website": company_doc.get("website"),
                        "description": company_doc.get("description"),
                        "emails": company_doc.get("emails", []),
                        "status": "email_found"
                        if company_doc.get("emails")
                        else "no_email",
                        "domain": domain,
                    }
                )
        else:
            companies_data = await _find_companies_with_emails(request.company_type)

            if companies_data:
                for company in companies_data:
                    parsed = urlparse(company["website"])
                    domain = parsed.netloc.replace("www.", "").lower()
                    company_doc = {
                        "company_name": company["company_name"],
                        "website": company["website"],
                        "domain": domain,
                        "description": company.get("description"),
                        "emails": company.get("emails", []),
                        "company_type": company_type,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    }
                    await db.companies.update_one(
                        {"domain": company_doc["domain"], "company_type": company_type},
                        {"$set": company_doc},
                        upsert=True,
                    )

        if not companies_data:
            return CompanySearchResponse(
                success=False,
                companies=[],
                total=0,
                message="No companies with emails found. Try a different search term.",
            )

        applied_cursor = db.company_applications.find({"user_id": user_id})
        applied_docs = await applied_cursor.to_list(length=None)
        applied_domains = {
            app.get("company_domain", "").lower()
            for app in applied_docs
            if app.get("company_domain")
        }

        filtered: List[Dict[str, Any]] = []
        for company in companies_data:
            parsed = urlparse(company["website"])
            domain = parsed.netloc.replace("www.", "").lower()
            email_domains = [
                email.split("@")[1].lower()
                for email in company.get("emails", [])
                if "@" in email
            ]
            is_applied = domain in applied_domains or any(
                ed in applied_domains for ed in email_domains
            )
            if not is_applied:
                filtered.append(company)

        company_infos = [
            CompanyInfo(
                company_name=c["company_name"],
                website=c["website"],
                description=c.get("description"),
                emails=c.get("emails", []),
                status=c.get("status", "email_found"),
            )
            for c in filtered
        ]

        return CompanySearchResponse(
            success=True,
            companies=company_infos,
            total=len(company_infos),
            message=(
                f"Found {len(company_infos)} companies with emails"
                f" (excluding {len(companies_data) - len(company_infos)} already applied)"
            ),
        )
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to search companies: {exc}"
        ) from exc


@router.post("/generate-template", response_model=EmailTemplateResponse)
async def generate_email_template(
    request: EmailTemplateRequest, current_user: dict = Depends(get_current_user)
) -> EmailTemplateResponse:
    """
    Generate a cold email template using Gemini.
    """
    try:
        skills_text = ", ".join(request.user_skills or []) or "various technical skills"
        bio_text = request.user_bio or "a motivated professional"

        prompt = f"""Generate a professional cold email template for a job application. The email should be:
- Professional but friendly
- Concise (2-3 short paragraphs)
- Highlight relevant skills and experience
- Show genuine interest in the company
- Include a clear call to action

Company Name: {request.company_name}
Applicant Name: {request.user_name}
Applicant Email: {request.user_email}
Applicant Bio: {bio_text}
Applicant Skills: {skills_text}

Return ONLY valid JSON:
{{
  "subject": "Subject line here",
  "body": "Email body here with line breaks using \\n"
}}
"""

        response_json = await gemini_service.generate(prompt)
        candidates = response_json.get("candidates", [])
        if not candidates:
            raise RuntimeError("No candidates from Gemini")
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise RuntimeError("No content parts from Gemini")
        text = (parts[0].get("text") or "").strip()

        cleaned = text
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        import json

        template_data = json.loads(cleaned)

        return EmailTemplateResponse(
            success=True,
            subject=template_data.get("subject", "Application for Opportunities"),
            body=template_data.get("body", ""),
            message="Email template generated successfully",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate template: {exc}"
        ) from exc


def send_email_via_smtp(
    to_email: str,
    subject: str,
    body: str,
    from_email: str,
    smtp_password: str,
    resume_file_base64: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send email via SMTP. Reused by both single and bulk send endpoints.
    """
    try:
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        if resume_file_base64:
            try:
                resume_data = base64.b64decode(resume_file_base64)
                attachment = MIMEBase("application", "octet-stream")
                attachment.set_payload(resume_data)
                encoders.encode_base64(attachment)
                attachment.add_header(
                    "Content-Disposition", "attachment; filename=resume.pdf"
                )
                msg.attach(attachment)
            except Exception as exc:  # pragma: no cover
                logger.error("Error attaching resume: %s", exc)

        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        lower_from = from_email.lower()
        if "outlook" in lower_from or "hotmail" in lower_from:
            smtp_server = "smtp-mail.outlook.com"
        elif "yahoo" in lower_from:
            smtp_server = "smtp.mail.yahoo.com"

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(from_email, smtp_password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()

        return {"success": True, "message": "Email sent successfully"}
    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "message": "SMTP authentication failed. Check your email and password.",
        }
    except Exception as exc:  # pragma: no cover
        return {"success": False, "message": f"Failed to send email: {exc}"}


@router.post("/send-email", response_model=SendEmailResponse)
async def send_email(
    request: SendEmailRequest, current_user: dict = Depends(get_current_user)
) -> SendEmailResponse:
    """
    Send a single cold email.
    """
    result = send_email_via_smtp(
        to_email=request.company_email,
        subject=request.subject,
        body=request.body,
        from_email=request.smtp_email,
        smtp_password=request.smtp_password,
        resume_file_base64=request.resume_file,
    )
    if result["success"]:
        return SendEmailResponse(success=True, message=result["message"])
    raise HTTPException(status_code=400, detail=result["message"])


@router.post("/bulk-send", response_model=BulkSendResponse)
async def bulk_send_emails(
    request: BulkSendRequest, current_user: dict = Depends(get_current_user)
) -> BulkSendResponse:
    """
    Send emails to multiple companies with rate limiting and track in Mongo.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        results: List[Dict[str, Any]] = []
        sent = 0
        failed = 0

        for company in request.companies:
            company_email = company.get("company_email")
            company_name = company.get("company_name", "Company")
            company_website = company.get("company_website", "")

            if not company_email or company_email == "N/A":
                results.append(
                    {
                        "company_name": company_name,
                        "status": "skipped",
                        "message": "No email address found",
                    }
                )
                failed += 1
                continue

            company_domain = ""
            if company_website:
                parsed = urlparse(company_website)
                company_domain = parsed.netloc.replace("www.", "").lower()
            elif "@" in company_email:
                company_domain = company_email.split("@")[1].lower()

            personalized_subject = request.subject.replace("{company_name}", company_name)
            personalized_body = request.body.replace("{company_name}", company_name)

            result = send_email_via_smtp(
                to_email=company_email,
                subject=personalized_subject,
                body=personalized_body,
                from_email=request.smtp_email,
                smtp_password=request.smtp_password,
                resume_file_base64=request.resume_file,
            )

            if result["success"]:
                application_doc = {
                    "user_id": user_id,
                    "company_name": company_name,
                    "company_email": company_email,
                    "company_domain": company_domain,
                    "subject": personalized_subject,
                    "sent_at": datetime.utcnow(),
                    "status": "sent",
                }
                await db.company_applications.insert_one(application_doc)

                results.append(
                    {
                        "company_name": company_name,
                        "status": "sent",
                        "message": "Email sent successfully",
                    }
                )
                sent += 1
            else:
                application_doc = {
                    "user_id": user_id,
                    "company_name": company_name,
                    "company_email": company_email,
                    "company_domain": company_domain,
                    "subject": personalized_subject,
                    "sent_at": datetime.utcnow(),
                    "status": "failed",
                    "error_message": result["message"],
                }
                await db.company_applications.insert_one(application_doc)

                results.append(
                    {
                        "company_name": company_name,
                        "status": "failed",
                        "message": result["message"],
                    }
                )
                failed += 1

            await asyncio.sleep(2)

        return BulkSendResponse(success=True, sent=sent, failed=failed, results=results)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to send bulk emails: {exc}"
        ) from exc

from fastapi import APIRouter, Depends, HTTPException
from .schema import (
    CompanySearchRequest,
    CompanySearchResponse,
    CompanyInfo,
    EmailTemplateRequest,
    EmailTemplateResponse,
    SendEmailRequest,
    SendEmailResponse,
    BulkSendRequest,
    BulkSendResponse,
)
from auth.router import get_current_user
from config import get_database
from gemini_service import gemini_service
import re
import asyncio
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from datetime import datetime
from urllib.parse import urlparse
import smtplib


router = APIRouter(prefix="/cold-mail", tags=["Cold Mail"])


async def find_companies_with_emails(company_type: str) -> List[dict]:
    """
    Two-step process:
    1. Company Finder: Scrapes from multiple sources to get 100+ company URLs
    2. Email Finder: Takes those URLs and finds emails from multiple pages
    """
    try:
        from cold_mail.company_finder import company_finder
        from cold_mail.email_finder import email_finder

        print(f"🔍 Step 1: Finding companies for '{company_type}'...")
        companies = await company_finder.find_companies(
            company_type, target_count=100
        )

        if not companies:
            print("   ⚠ No companies found")
            return []

        print(f"   ✓ Found {len(companies)} companies")
        print(f"📧 Step 2: Finding emails for {len(companies)} companies...")

        batch_size = 10
        companies_with_emails: List[Dict[str, Any]] = []

        for i in range(0, len(companies), batch_size):
            batch = companies[i : i + batch_size]
            print(
                f"   Processing batch {i//batch_size + 1}/"
                f"{(len(companies) + batch_size - 1)//batch_size}..."
            )

            tasks = [email_finder.find_emails(company["website"]) for company in batch]
            email_results = await asyncio.gather(*tasks, return_exceptions=True)

            for j, company in enumerate(batch):
                emails: List[str] = []
                if isinstance(email_results[j], list):
                    emails = email_results[j]

                if emails:
                    companies_with_emails.append(
                        {
                            "company_name": company["company_name"],
                            "website": company["website"],
                            "description": company.get("description"),
                            "emails": emails,
                            "status": "email_found",
                        }
                    )

            if i + batch_size < len(companies):
                await asyncio.sleep(1)

        print(f"   ✓ Found emails for {len(companies_with_emails)} companies")
        return companies_with_emails

    except Exception as e:  # noqa: BLE001
        print(f"Error in company/email finding: {e}")
        import traceback

        traceback.print_exc()
        return []


@router.post("/search-companies", response_model=CompanySearchResponse)
async def search_companies(
    request: CompanySearchRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Search for companies and extract their emails using two-scraper system.
    Only returns companies that have emails found and user hasn't applied to yet.
    Companies are saved to MongoDB for future use.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])
        company_type = request.company_type.lower().strip()

        existing_companies_cursor = db.companies.find(
            {
                "company_type": company_type,
            }
        )
        existing_companies = await existing_companies_cursor.to_list(length=200)

        companies_data: List[Dict[str, Any]] = []

        if existing_companies:
            print(
                f"📦 Found {len(existing_companies)} existing companies in DB for "
                f"'{company_type}'"
            )
            print("⏳ Simulating search delay (5 seconds)...")
            await asyncio.sleep(5)

            for company_doc in existing_companies:
                parsed = urlparse(company_doc.get("website", ""))
                domain = parsed.netloc.replace("www.", "").lower()

                companies_data.append(
                    {
                        "company_name": company_doc.get("company_name"),
                        "website": company_doc.get("website"),
                        "description": company_doc.get("description"),
                        "emails": company_doc.get("emails", []),
                        "status": (
                            "email_found"
                            if company_doc.get("emails")
                            else "no_email"
                        ),
                        "domain": domain,
                    }
                )
        else:
            print(
                f"🔍 No existing companies found, fetching new ones for '{company_type}'..."
            )
            companies_data = await find_companies_with_emails(request.company_type)

            if companies_data:
                print(f"💾 Saving {len(companies_data)} companies to database...")
                for company in companies_data:
                    parsed = urlparse(company["website"])
                    domain = parsed.netloc.replace("www.", "").lower()

                    company_doc = {
                        "company_name": company["company_name"],
                        "website": company["website"],
                        "domain": domain,
                        "description": company.get("description"),
                        "emails": company.get("emails", []),
                        "company_type": company_type,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    }

                    await db.companies.update_one(
                        {"domain": company_doc["domain"], "company_type": company_type},
                        {"$set": company_doc},
                        upsert=True,
                    )
                print(f"   ✓ Saved {len(companies_data)} companies")

        if not companies_data:
            return CompanySearchResponse(
                success=False,
                companies=[],
                total=0,
                message="No companies with emails found. Try a different search term.",
            )

        applied_companies_cursor = db.company_applications.find(
            {
                "user_id": user_id,
            }
        )
        applied_companies = await applied_companies_cursor.to_list(length=None)

        applied_domains = {
            (app.get("company_domain") or "").lower()
            for app in applied_companies
            if app.get("company_domain")
        }

        filtered_companies: List[Dict[str, Any]] = []
        for company in companies_data:
            parsed = urlparse(company["website"])
            domain = parsed.netloc.replace("www.", "").lower()

            email_domains = [
                email.split("@")[1].lower()
                for email in company.get("emails", [])
                if "@" in email
            ]

            is_applied = domain in applied_domains or any(
                email_domain in applied_domains for email_domain in email_domains
            )

            if not is_applied:
                filtered_companies.append(company)

        company_infos = [
            CompanyInfo(
                company_name=company["company_name"],
                website=company["website"],
                description=company.get("description"),
                emails=company["emails"],
                status=company["status"],
            )
            for company in filtered_companies
        ]

        return CompanySearchResponse(
            success=True,
            companies=company_infos,
            total=len(company_infos),
            message=(
                f"Found {len(company_infos)} companies with emails "
                f"(excluding {len(companies_data) - len(company_infos)} already applied)"
            ),
        )

    except Exception as e:  # noqa: BLE001
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to search companies: {str(e)}"
        )


async def _call_gemini_for_template(prompt: str) -> Dict[str, Any]:
    raw = await gemini_service.generate(prompt)
    candidates = raw.get("candidates", []) or []
    if not candidates:
        raise RuntimeError("Empty Gemini response for cold-mail template")
    parts = candidates[0].get("content", {}).get("parts", []) or []
    text_chunks: List[str] = []
    for part in parts:
        if isinstance(part, dict) and "text" in part:
            text_chunks.append(str(part["text"]))
    text = "".join(text_chunks).strip()
    if not text:
        raise RuntimeError("Gemini response did not contain any text content")

    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    import json

    return json.loads(text)


@router.post("/generate-template", response_model=EmailTemplateResponse)
async def generate_email_template(
    request: EmailTemplateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate email template using Gemini"""
    try:
        skills_text = (
            ", ".join(request.user_skills)
            if request.user_skills
            else "various technical skills"
        )
        bio_text = request.user_bio if request.user_bio else "a motivated professional"

        prompt = f"""Generate a professional cold email template for a job application. The email should be:
- Professional but friendly
- Concise (2-3 short paragraphs)
- Highlight relevant skills and experience
- Show genuine interest in the company
- Include a clear call to action

**Company Name:** {request.company_name}
**Applicant Name:** {request.user_name}
**Applicant Email:** {request.user_email}
**Applicant Bio:** {bio_text}
**Applicant Skills:** {skills_text}

Generate:
1. A compelling subject line (max 60 characters)
2. Email body (2-3 paragraphs, professional tone)

Return ONLY valid JSON in this format:
{{
  "subject": "Subject line here",
  "body": "Email body here with line breaks using \\n"
}}

Do NOT include markdown formatting, code blocks, or any other text. Only return the JSON object.
"""

        template_data = await _call_gemini_for_template(prompt)

        return EmailTemplateResponse(
            success=True,
            subject=template_data.get("subject", "Application for Opportunities"),
            body=template_data.get("body", ""),
            message="Email template generated successfully",
        )

    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Failed to generate template: {str(e)}"
        )


def send_email_via_smtp(
    to_email: str,
    subject: str,
    body: str,
    from_email: str,
    smtp_password: str,
    resume_file_base64: Optional[str] = None,
) -> dict:
    """Send email via SMTP"""
    try:
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        if resume_file_base64:
            try:
                resume_data = base64.b64decode(resume_file_base64)
                attachment = MIMEBase("application", "octet-stream")
                attachment.set_payload(resume_data)
                encoders.encode_base64(attachment)
                attachment.add_header(
                    "Content-Disposition",
                    "attachment; filename=resume.pdf",
                )
                msg.attach(attachment)
            except Exception as e:  # noqa: BLE001
                print(f"Error attaching resume: {e}")

        smtp_server = "smtp.gmail.com"
        smtp_port = 587

        lower_email = from_email.lower()
        if "outlook" in lower_email or "hotmail" in lower_email:
            smtp_server = "smtp-mail.outlook.com"
        elif "yahoo" in lower_email:
            smtp_server = "smtp.mail.yahoo.com"

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(from_email, smtp_password)
        text = msg.as_string()
        server.sendmail(from_email, to_email, text)
        server.quit()

        return {"success": True, "message": "Email sent successfully"}

    except smtplib.SMTPAuthenticationError:
        return {
            "success": False,
            "message": "SMTP authentication failed. Check your email and password.",
        }
    except Exception as e:  # noqa: BLE001
        return {"success": False, "message": f"Failed to send email: {str(e)}"}


@router.post("/send-email", response_model=SendEmailResponse)
async def send_email(
    request: SendEmailRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send a single email"""
    try:
        result = send_email_via_smtp(
            to_email=request.company_email,
            subject=request.subject,
            body=request.body,
            from_email=request.smtp_email,
            smtp_password=request.smtp_password,
            resume_file_base64=request.resume_file,
        )

        if result["success"]:
            return SendEmailResponse(success=True, message=result["message"])
        raise HTTPException(status_code=400, detail=result["message"])

    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Failed to send email: {str(e)}"
        )


@router.post("/bulk-send", response_model=BulkSendResponse)
async def bulk_send_emails(
    request: BulkSendRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send emails to multiple companies with rate limiting and track applications"""
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        results: List[Dict[str, Any]] = []
        sent = 0
        failed = 0

        for company in request.companies:
            company_email = company.get("company_email")
            company_name = company.get("company_name", "Company")
            company_website = company.get("company_website", "")

            if not company_email or company_email == "N/A":
                results.append(
                    {
                        "company_name": company_name,
                        "status": "skipped",
                        "message": "No email address found",
                    }
                )
                failed += 1
                continue

            company_domain = ""
            if company_website:
                parsed = urlparse(company_website)
                company_domain = parsed.netloc.replace("www.", "").lower()
            elif "@" in company_email:
                company_domain = company_email.split("@")[1].lower()

            personalized_subject = request.subject.replace(
                "{company_name}", company_name
            )
            personalized_body = request.body.replace(
                "{company_name}", company_name
            )

            result = send_email_via_smtp(
                to_email=company_email,
                subject=personalized_subject,
                body=personalized_body,
                from_email=request.smtp_email,
                smtp_password=request.smtp_password,
                resume_file_base64=request.resume_file,
            )

            if result["success"]:
                application_doc = {
                    "user_id": user_id,
                    "company_name": company_name,
                    "company_email": company_email,
                    "company_domain": company_domain,
                    "subject": personalized_subject,
                    "sent_at": datetime.utcnow(),
                    "status": "sent",
                }
                await db.company_applications.insert_one(application_doc)

                results.append(
                    {
                        "company_name": company_name,
                        "status": "sent",
                        "message": "Email sent successfully",
                    }
                )
                sent += 1
            else:
                application_doc = {
                    "user_id": user_id,
                    "company_name": company_name,
                    "company_email": company_email,
                    "company_domain": company_domain,
                    "subject": personalized_subject,
                    "sent_at": datetime.utcnow(),
                    "status": "failed",
                    "error_message": result["message"],
                }
                await db.company_applications.insert_one(application_doc)

                results.append(
                    {
                        "company_name": company_name,
                        "status": "failed",
                        "message": result["message"],
                    }
                )
                failed += 1

            await asyncio.sleep(2)

        return BulkSendResponse(
            success=True,
            sent=sent,
            failed=failed,
            results=results,
        )

    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Failed to send bulk emails: {str(e)}"
        )

