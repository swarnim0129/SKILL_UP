import json
import os
from typing import List, Dict, Any

from openai import OpenAI
from openai import APIConnectionError, APIError

from logger import get_logger

logger = get_logger(__name__)


def _get_client() -> OpenAI:
    """
    Initialize the OpenAI client with timeout and retry configuration.
    We intentionally read OPENAI_API_KEY directly from env so that
    only this feature depends on OpenAI; all other modules stay on Gemini.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY is not set in environment!")
        raise ValueError("Missing OPENAI_API_KEY for Interview Agent feature")
    
    # Configure client with timeout and max retries
    return OpenAI(
        api_key=api_key,
        timeout=60.0,  # 60 second timeout
        max_retries=2,  # Retry up to 2 times on transient errors
    )


def generate_interview_questions_fast(
    resume_text: str, job_description: str
) -> List[Dict[str, Any]]:
    """
    Generate 10 interview questions directly from resume + JD in one GPT-4o-mini call.
    Adapted from the standalone Interview Agent project.
    """
    logger.info("Calling GPT-4o-mini to generate interview questions...")
    client = _get_client()

    prompt = f"""You are an expert interviewer creating targeted interview questions that are SPECIFICALLY tied to the candidate's resume.

CANDIDATE RESUME TEXT:
{resume_text}

JOB DESCRIPTION:
{job_description}

TASK:
Generate EXACTLY 10 interview questions with this distribution:
- 3 easy
- 3 medium
- 4 hard

Return a JSON object with this exact structure:
{{
  "questions": [
    {{"question": "...", "difficulty": "easy", "category": "technical"}},
    {{"question": "...", "difficulty": "easy", "category": "behavioral"}},
    {{"question": "...", "difficulty": "easy", "category": "technical"}},
    {{"question": "...", "difficulty": "medium", "category": "technical"}},
    {{"question": "...", "difficulty": "medium", "category": "system_design"}},
    {{"question": "...", "difficulty": "medium", "category": "behavioral"}},
    {{"question": "...", "difficulty": "hard", "category": "technical"}},
    {{"question": "...", "difficulty": "hard", "category": "system_design"}},
    {{"question": "...", "difficulty": "hard", "category": "technical"}},
    {{"question": "...", "difficulty": "hard", "category": "behavioral"}}
  ]
}}

CRITICAL RULES - ALL QUESTIONS MUST REFERENCE THE RESUME:
1. **RESUME-SPECIFIC ONLY**: Every question MUST reference something concrete from the resume:
   - Specific projects mentioned (e.g., "In your resume, you mentioned building [Project X]. Can you walk me through the technical architecture?")
   - Specific internships or work experiences (e.g., "During your internship at [Company], you worked with [Technology]. What was your biggest challenge?")
   - Specific technologies, frameworks, or tools listed (e.g., "I see you used [Technology] in [Project]. How did you handle [specific technical challenge]?")
   - Specific achievements or metrics mentioned (e.g., "You mentioned improving performance by X%. How did you achieve that?")

2. **NO GENERIC QUESTIONS**: NEVER ask generic behavioral questions like:
   - "When was the last time you worked as a team?"
   - "Tell me about a time you faced a challenge"
   - "Describe a situation where..."
   Instead, tie behavioral questions to resume items: "In your resume, you mentioned [specific project/experience]. Tell me about a challenge you faced during that project and how you overcame it."

3. **Technical Questions**: Must reference specific technologies, projects, or experiences from the resume:
   - "I see you built [Project Name] using [Technology]. Can you explain how you implemented [specific feature]?"
   - "You mentioned working with [Technology] at [Company]. What was the most complex problem you solved with it?"

4. **System Design Questions**: Should reference projects or experiences from the resume:
   - "Based on your experience building [Project from resume], how would you design [related system]?"
   - "You worked on [Project]. If you had to scale it to handle 10x traffic, what would you change?"

5. **Behavioral Questions**: Must reference specific resume items:
   - "In your resume, you mentioned [specific project/internship]. Tell me about a time during that experience when you had to collaborate with others."
   - "You worked on [Project]. What was the most difficult technical decision you had to make?"

6. **Question Quality**:
   - Questions must progress from easy to hard
   - Each question must be precise and interview-ready
   - difficulty must be exactly one of: easy, medium, hard
   - category must be exactly one of: technical, behavioral, system_design

7. **If resume lacks detail**: Still reference what IS mentioned (technologies, company names, project names, etc.) and ask for deeper explanation or related technical challenges."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.6,
        )

        data = json.loads(response.choices[0].message.content)
        questions_list = data.get("questions", [])

        if len(questions_list) != 10:
            logger.warning(
                "GPT-4o-mini returned %d questions instead of 10.", len(questions_list)
            )

        logger.info("Question generation completed successfully.")
        return questions_list

    except APIConnectionError as e:
        logger.error(
            "OpenAI API connection error. This usually indicates a network/DNS issue. "
            "Please check your internet connection and DNS settings. Error: %s",
            str(e),
        )
        raise ValueError(
            "Failed to connect to OpenAI API. Please check your internet connection "
            "and ensure OPENAI_API_KEY is valid. If the issue persists, there may be "
            "a network or DNS resolution problem."
        ) from e
    except APIError as e:
        logger.error("OpenAI API error: %s", str(e))
        raise ValueError(f"OpenAI API error: {str(e)}") from e
    except json.JSONDecodeError as e:
        logger.error("Failed to parse OpenAI response as JSON: %s", str(e))
        raise ValueError("Invalid response format from OpenAI API") from e
    except Exception as e:  # pragma: no cover - logged and re-raised
        logger.exception("Failed during generate_interview_questions_fast")
        raise ValueError(f"Unexpected error generating interview questions: {str(e)}") from e


def evaluate_interview_transcript(
    transcript: str, candidate_name: str, candidate_email: str
) -> Dict[str, Any]:
    """
    Evaluate the completed interview transcript and generate a full JSON report
    using GPT-4o-mini. Adapted from the standalone Interview Agent project.
    """
    logger.info("Calling GPT-4o-mini to evaluate interview transcript...")
    client = _get_client()

    prompt = f"""You are an expert interview evaluator analyzing a voice interview transcript.
Your scoring style is FAIR and slightly GENEROUS (not strict): give meaningful partial credit, assume good intent, and avoid harsh penalties for minor omissions, nervousness, filler words, or imperfect structure.
Only give very low scores when the candidate is clearly incorrect, refuses to answer, or provides no relevant content.

Full Interview Transcript:
{transcript}

Candidate Name: {candidate_name}
Candidate Email: {candidate_email}

TASK:
1. PARSE the transcript to identify questions and answers
2. EXTRACT difficulty level from each question (easy/medium/hard)
3. COUNT how many questions were answered (expected: 10 total)
4. EVALUATE each answer with a score from 1-10 (slightly generous rubric below)
5. CALCULATE overall score out of 100

INTERVIEW STATUS RULES:
- If 0 questions answered -> interviewStatus: "incomplete", overallScore: 0
- If 1-9 questions answered -> interviewStatus: "partial"
- If 10 questions answered -> interviewStatus: "complete"
- Score ONLY the questions actually answered
- Base percentage on answered questions only

SCORING RUBRIC (be slightly generous):
- 9-10: Excellent, correct, clear, good depth, good tradeoffs/examples.
- 7-8: Strong, mostly correct, some depth, minor gaps ok.
- 5-6: Decent attempt with partial correctness; missing details but directionally right.
- 3-4: Weak/vague; some relevant points but mostly shallow or unclear.
- 1-2: Incorrect or no meaningful attempt.

IMPORTANT:
- If the candidate attempts an answer and it is directionally correct, prefer 5-6 instead of 3-4.
- Do not penalize heavily for not using perfect terminology if the idea is correct.

Return a JSON object with EXACTLY this structure (no deviations):
{{
  "candidateInfo": {{
    "name": "{candidate_name}",
    "email": "{candidate_email}"
  }},
  "interviewStatus": "complete",
  "questionsAnswered": <number>,
  "totalQuestions": 10,
  "overallScore": <number 0-100>,
  "recommendation": "Strong Hire | Hire | Maybe | No Hire",
  "detailedReport": "A 3-5 sentence executive summary of the candidate's overall performance, communication style, and suitability for the role.",
  "summary": {{
    "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
    "painPoints": ["weakness or gap 1", "weakness or gap 2"],
    "areasToImprove": ["improvement area 1", "improvement area 2"]
  }},
  "evaluations": [
    {{
      "questionNumber": 1,
      "question": "The exact question asked",
      "answer": "Summary of what the candidate said",
      "difficulty": "easy",
      "category": "technical",
      "score": <1-10>,
      "maxScore": 10,
      "feedback": "Specific constructive feedback on this answer"
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.4,
        )

        report_data = json.loads(response.choices[0].message.content)

        # Optional small leniency pass to reduce "over-strict" scoring.
        # This keeps values bounded and makes overallScore consistent with per-question scores.
        try:
            evaluations = report_data.get("evaluations") or []
            if isinstance(evaluations, list) and len(evaluations) > 0:
                adjusted_scores: List[int] = []
                for ev in evaluations:
                    if not isinstance(ev, dict):
                        continue
                    raw = ev.get("score")
                    try:
                        s = int(raw)
                    except Exception:
                        continue

                    # Gentle boost: +1 for any non-perfect score, capped at 10.
                    s_adj = min(10, max(1, s + (1 if s < 10 else 0)))
                    ev["score"] = s_adj
                    ev["maxScore"] = 10
                    adjusted_scores.append(s_adj)

                if adjusted_scores:
                    overall = round((sum(adjusted_scores) / (len(adjusted_scores) * 10)) * 100)
                    report_data["overallScore"] = int(max(0, min(100, overall)))
        except Exception:
            # Never fail report generation due to calibration.
            pass

        logger.info(
            "Interview evaluated successfully. Final score: %s",
            report_data.get("overallScore"),
        )
        return report_data

    except APIConnectionError as e:
        logger.error(
            "OpenAI API connection error during transcript evaluation. "
            "Please check your internet connection and DNS settings. Error: %s",
            str(e),
        )
        raise ValueError(
            "Failed to connect to OpenAI API for transcript evaluation. "
            "Please check your internet connection and ensure OPENAI_API_KEY is valid."
        ) from e
    except APIError as e:
        logger.error("OpenAI API error during transcript evaluation: %s", str(e))
        raise ValueError(f"OpenAI API error: {str(e)}") from e
    except json.JSONDecodeError as e:
        logger.error("Failed to parse OpenAI response as JSON: %s", str(e))
        raise ValueError("Invalid response format from OpenAI API") from e
    except Exception as e:  # pragma: no cover - logged and re-raised
        logger.exception("Failed during evaluate_interview_transcript")
        raise ValueError(f"Unexpected error evaluating transcript: {str(e)}") from e

