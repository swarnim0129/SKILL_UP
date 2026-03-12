"""
Business logic to generate tailored resume + cover letter for a job.
Ported from HACKSYNC's application_service to use ProjectMorpheus GeminiService.
"""

from typing import Dict, Any

from ai_resume_builder.schema import AIResumeData
from gemini_service import gemini_service
from logger import get_logger


logger = get_logger(__name__)


async def generate_tailored_application(
    job_description: str, job_title: str, company: str, user_profile: Dict[str, Any]
) -> Dict[str, Any]:
  """
  Generate a tailored resume structure and cover letter for a given JD.
  This mirrors the HACKSYNC behavior but calls our HTTP-based GeminiService.
  """
  # Build a compact profile summary to feed to Gemini
  skills = [s.get("name") if isinstance(s, dict) else s for s in user_profile.get("skills", [])]
  experiences = user_profile.get("experiences", [])
  projects = user_profile.get("projects", [])

  profile_summary = {
    "name": user_profile.get("name", ""),
    "email": user_profile.get("email", ""),
    "phone": user_profile.get("phone", ""),
    "location": user_profile.get("location"),
    "skills": skills,
    "experiences": experiences,
    "projects": projects,
    "education": user_profile.get("education", []),
  }

  prompt = f"""
You are an expert career coach and resume writer.

JOB TITLE: {job_title}
COMPANY: {company}

JOB DESCRIPTION:
\"\"\"{job_description}\"\"\"

USER PROFILE (JSON):
{profile_summary}

TASKS:
1. Create a JSON resume structure (AIResumeData-like) tailored to this job.
2. Create a JSON cover letter with fields:
   - greeting
   - opening_paragraph
   - body_paragraphs (array of 2-3 paragraphs)
   - closing_paragraph
   - signature

Return ONLY valid JSON in this exact format:
{{
  "tailored_resume": {{}},  // AIResumeData shape
  "cover_letter": {{
    "greeting": "...",
    "opening_paragraph": "...",
    "body_paragraphs": ["..."],
    "closing_paragraph": "...",
    "signature": "..."
  }}
}}
"""

  logger.info("[JOB APPLICATION] Sending prompt to Gemini for tailored application")
  response_json = await gemini_service.generate(
    prompt,
  )

  candidates = response_json.get("candidates", [])
  if not candidates:
    raise RuntimeError("No candidates from Gemini for application generation")

  parts = candidates[0].get("content", {}).get("parts", [])
  if not parts:
    raise RuntimeError("No content parts from Gemini for application generation")

  text = (parts[0].get("text") or "").strip()

  import json

  # Remove markdown fences if any slipped through
  cleaned = text
  if cleaned.startswith("```json"):
    cleaned = cleaned[7:]
  elif cleaned.startswith("```"):
    cleaned = cleaned[3:]
  if cleaned.endswith("```"):
    cleaned = cleaned[:-3]
  cleaned = cleaned.strip()

  try:
    parsed = json.loads(cleaned)
  except json.JSONDecodeError as exc:
    logger.error("[JOB APPLICATION] Failed to parse Gemini JSON: %s", exc)
    raise

  tailored_resume_data = parsed.get("tailored_resume") or {}
  cover_letter_data = parsed.get("cover_letter") or {}

  return {
    "tailored_resume": AIResumeData(**tailored_resume_data),
    "cover_letter": cover_letter_data,
  }

import json
from typing import Any, Dict, List

from gemini_service import gemini_service


def _extract_text_from_gemini_response(response: Dict[str, Any]) -> str:
  """
  Convert a Gemini JSON response into a plain text string by
  concatenating all candidate parts.
  """
  candidates: List[Dict[str, Any]] = response.get("candidates", []) or []
  if not candidates:
      raise ValueError("Empty Gemini response: no candidates returned")

  parts = candidates[0].get("content", {}).get("parts", []) or []
  text_chunks: List[str] = []
  for part in parts:
      if isinstance(part, dict) and "text" in part:
          text_chunks.append(str(part["text"]))
  text = "".join(text_chunks).strip()
  if not text:
      raise ValueError("Gemini response did not contain any text content")
  return text


async def generate_tailored_application(
    job_description: str, job_title: str, company: str, user_profile: dict
) -> dict:
    """
    Generate JD-tailored resume and cover letter using Gemini AI.
    Returns dict with tailored_resume and cover_letter.
    """
    try:
        # Prepare user data summary
        user_skills = ", ".join(
            [skill.get("name", "") for skill in user_profile.get("skills", [])]
        )
        user_experiences = user_profile.get("experiences", [])
        user_projects = user_profile.get("projects", [])
        user_education = user_profile.get("education", [])
        user_name = user_profile.get("name", "Applicant")
        user_email = user_profile.get("email", "")
        user_phone = user_profile.get("phone", "")
        user_location = user_profile.get("location", "")

        # Extract links
        links = user_profile.get("links", [])
        linkedin = github = portfolio = ""
        for link in links:
            link_type = link.get("type", "")
            link_value = link.get("value", "")
            if link_type == "linkedin":
                linkedin = link_value
            elif link_type == "github":
                github = link_value
            elif link_type in ("website", "portfolio"):
                portfolio = link_value
            elif link_type == "phone" and not user_phone:
                user_phone = link_value
            elif link_type == "email" and not user_email:
                user_email = link_value

        # Construct the prompt
        prompt = f"""
You are an expert career consultant and resume writer. Generate a JOB-TAILORED resume and a NATURAL, HUMAN-SOUNDING COVER LETTER for the following job application.

JOB DETAILS (for context only – do not echo headings like "JOB DETAILS" in the output):
- Position: {job_title}
- Company: {company}
- Job Description: {job_description}

CANDIDATE PROFILE (for context only):
- Name: {user_name}
- Email: {user_email}
- Phone: {user_phone}
- Location: {user_location}
- LinkedIn: {linkedin}
- GitHub: {github}
- Portfolio: {portfolio}
- Skills: {user_skills}
- Experiences: {json.dumps(user_experiences, indent=2)}
- Projects: {json.dumps(user_projects, indent=2)}
- Education: {json.dumps(user_education, indent=2)}

INSTRUCTIONS:
1. Analyze the job description carefully to identify key requirements, skills, and qualifications.
2. Create a TAILORED resume that:
   - Emphasizes relevant skills that match the job requirements
   - Rewrites experience bullet points to highlight achievements relevant to this role
   - Prioritizes projects that demonstrate applicable skills
   - Includes a compelling summary tailored to this specific position
   - Uses keywords from the job description naturally
3. Create a professional cover letter that:
   - Is written entirely in the first person ("I") from the candidate's perspective
   - Uses clear, natural language with 3–5 paragraphs
   - DOES NOT include headings, bullet points, or meta-instructions like "Paragraph 1:"
   - Reads like a real letter a candidate would send to a recruiter or hiring manager
4. Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO extra explanatory text.

REQUIRED JSON STRUCTURE (FILL ALL STRINGS WITH FINAL COVER-LETTER TEXT, NOT INSTRUCTIONS):
{{
  "tailored_resume": {{
    "personal_info": {{
      "name": "{user_name}",
      "email": "{user_email}",
      "phone": "{user_phone}",
      "location": "{user_location}",
      "linkedin": "{linkedin}",
      "github": "{github}",
      "portfolio": "{portfolio}"
    }},
    "summary": "A compelling 2-3 sentence summary TAILORED to this specific job, highlighting the candidate's most relevant qualifications.",
    "skills": [
      {{
        "category": "Most Relevant Skills (from JD)",
        "skills": ["skill1", "skill2", "skill3"]
      }},
      {{
        "category": "Technical Skills",
        "skills": ["skill1", "skill2"]
      }},
      {{
        "category": "Tools & Technologies",
        "skills": ["tool1", "tool2"]
      }}
    ],
    "experience": [
      {{
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, State",
        "start_date": "Mon YYYY",
        "end_date": "Mon YYYY or Present",
        "description": [
          "TAILORED bullet point emphasizing a relevant achievement with metrics.",
          "Another achievement highlighting skills from the job description.",
          "Technical accomplishment relevant to the target role."
        ]
      }}
    ],
    "projects": [
      {{
        "name": "Most Relevant Project Name",
        "description": "Description emphasizing relevance to target role.",
        "technologies": ["tech1", "tech2", "tech3"],
        "link": "project-url",
        "highlights": [
          "Key achievement relevant to job requirements.",
          "Impact or result that demonstrates required skills."
        ]
      }}
    ],
    "education": [
      {{
        "degree": "Degree Name",
        "institution": "Institution Name",
        "location": "City, State",
        "graduation_date": "Mon YYYY",
        "gpa": "X.X/4.0",
        "achievements": ["Relevant achievement 1", "Relevant achievement 2"]
      }}
    ],
    "certifications": [
      {{
        "name": "Relevant Certification",
        "issuer": "Issuing Organization",
        "date": "Mon YYYY",
        "credential_id": "ID if available"
      }}
    ],
    "awards": ["Relevant award or achievement"],
    "languages": ["Language 1", "Language 2"]
  }},
  "cover_letter": {{
    "greeting": "Dear Hiring Manager," or "Dear {{recipient_name}}," if a name is clearly implied from the context.",
    "opening_paragraph": "A 4–6 sentence FIRST-PERSON paragraph that clearly states the role ({job_title}), the company ({company}), how the candidate found the role, and why they are genuinely excited about it. This should immediately sound like a real cover letter opening.",
    "body_paragraphs": [
      "Paragraph 1: A 4–6 sentence FIRST-PERSON paragraph highlighting the candidate's most relevant experience or project. It should directly address one or two of the most important job requirements using specific examples and, where possible, metrics.",
      "Paragraph 2: A 4–6 sentence FIRST-PERSON paragraph that adds complementary strengths (e.g., collaboration, ownership, impact, leadership) and connects them to what the company needs.",
      "Paragraph 3 (optional): A 3–5 sentence FIRST-PERSON paragraph that addresses any unique qualifications or experiences that set the candidate apart OR shows alignment with the company's mission, culture, or products."
    ],
    "closing_paragraph": "A 3–5 sentence FIRST-PERSON closing paragraph that thanks the reader, reiterates enthusiasm for the role at {company}, and mentions openness to further discussion or an interview.",
    "signature": "Sincerely,\\n{user_name}"
  }}
}}

CRITICAL: Return ONLY the JSON object above. No markdown, no headings, no bullet lists, and no explanations outside the JSON.
"""

        # Call Gemini API via shared service
        raw_response = await gemini_service.generate(prompt)
        response_text = _extract_text_from_gemini_response(raw_response)

        # Remove markdown code fences if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON payload (tailored_resume + cover_letter)
        result = json.loads(response_text)

        return {
            "success": True,
            "tailored_resume": result.get("tailored_resume"),
            "cover_letter": result.get("cover_letter"),
        }

    except json.JSONDecodeError as e:
        snippet = response_text[:500] if "response_text" in locals() and response_text else "No response"
        print(f"JSON parsing error: {e}")
        print(f"Response text snippet: {snippet}")
        raise Exception(f"Failed to parse AI response as JSON: {e}")
    except Exception as e:
        print(f"Error generating tailored application: {e}")
        raise Exception(f"Failed to generate application materials: {e}")

