from datetime import datetime
import logging
from typing import Any, Dict, List, Optional

from bson import ObjectId  # type: ignore[import-untyped]
from fastapi import APIRouter, Depends, HTTPException, Query

from auth.router import get_current_user
from config import get_database
from .job_matcher import job_matcher
from .schema import (
    AllJobsResponse,
    Job,
    JobMatchResponse,
    JobScraperStats,
    RelevantJobsResponse,
    SaveJobRequest,
)
from .scheduler import job_scheduler

logger = logging.getLogger(__name__)
router = APIRouter()


def _convert_objectid_to_str(obj: Any) -> Any:
    """Recursively convert ObjectId to string in dictionaries and lists."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {key: _convert_objectid_to_str(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [_convert_objectid_to_str(item) for item in obj]
    return obj


@router.get("/relevant", response_model=RelevantJobsResponse)
async def get_relevant_jobs(
    limit: int = Query(20, ge=1, le=500),
    min_match: float = Query(
        0, ge=0, le=100, description="Minimum match score percentage"
    ),
    current_user: dict = Depends(get_current_user),
) -> RelevantJobsResponse:
    """
    Get jobs most relevant to user's skills, ranked by match score.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        user_profile = await db.user_profiles.find_one({"user_id": user_id})
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")

        raw_skills = user_profile.get("skills", [])
        user_skills: list[str] = []
        for skill in raw_skills:
            if isinstance(skill, dict):
                user_skills.append(skill.get("name", ""))
            else:
                user_skills.append(str(skill))
        user_skills = [s for s in user_skills if s]

        raw_interests = user_profile.get("interests", [])
        user_interests: list[str] = []
        for interest in raw_interests:
            if isinstance(interest, dict):
                user_interests.append(interest.get("name", ""))
            else:
                user_interests.append(str(interest))
        user_interests = [i for i in user_interests if i]

        # If user has no skills yet, fall back to showing recent jobs
        # instead of returning an empty list. This prevents the UI from
        # looking "stuck" when the profile is not fully filled out.
        if not user_skills:
            jobs_cursor = db.jobs.find({}).sort("scraped_at", -1).limit(limit)
            jobs_data = await jobs_cursor.to_list(length=limit)

            if not jobs_data:
                return RelevantJobsResponse(
                    success=True,
                    jobs=[],
                    total_jobs=0,
                    user_skills=[],
                    message="No jobs available yet. Jobs are fetched periodically.",
                )

            fallback_matches: list[JobMatchResponse] = []
            for job_data in jobs_data:
                job = Job(
                    job_id=job_data["job_id"],
                    title=job_data["title"],
                    company=job_data["company"],
                    location=job_data["location"],
                    description=job_data["description"],
                    required_skills=job_data.get("required_skills", []),
                    url=job_data["url"],
                    salary=job_data.get("salary"),
                    job_type=job_data.get("job_type"),
                    experience_level=job_data.get("experience_level"),
                    source=job_data["source"],
                    posted_date=job_data.get("posted_date"),
                    scraped_at=(
                        datetime.fromisoformat(job_data["scraped_at"])
                        if isinstance(job_data["scraped_at"], str)
                        else job_data["scraped_at"]
                    ),
                )

                # Use a neutral match_score when we have no user skills
                fallback_matches.append(
                    JobMatchResponse(
                        job=job,
                        match_score=50.0,
                        matched_skills=[],
                        missing_skills=job.required_skills,
                    )
                )

            return RelevantJobsResponse(
                success=True,
                jobs=fallback_matches,
                total_jobs=len(fallback_matches),
                user_skills=[],
                message="Showing recent jobs. Add skills to your profile for better matches.",
            )

        # Normal path: rank jobs based on user skills and interests
        jobs_cursor = db.jobs.find({})
        jobs = await jobs_cursor.to_list(length=1000)

        if not jobs:
            return RelevantJobsResponse(
                success=True,
                jobs=[],
                total_jobs=0,
                user_skills=user_skills,
                message="No jobs available yet. Jobs are fetched periodically.",
            )

        ranked_jobs = job_matcher.rank_jobs(jobs, user_skills, user_interests)

        filtered_jobs = [j for j in ranked_jobs if j["match_score"] >= min_match]
        
        # Ensure source diversity: include at least 5 jobs from each major source
        # This prevents one source from dominating the results
        source_quota = 5
        major_sources = ["linkedin", "indeed", "zip_recruiter", "glassdoor", "internshala"]
        
        # Group jobs by source
        jobs_by_source: Dict[str, List[Dict[str, Any]]] = {}
        for job in filtered_jobs:
            src = (job.get("source") or "other").lower()
            if src not in jobs_by_source:
                jobs_by_source[src] = []
            jobs_by_source[src].append(job)
        
        # Build diverse result set
        diverse_jobs: List[Dict[str, Any]] = []
        used_job_ids = set()
        
        # First pass: take top jobs from each major source (up to quota)
        for source in major_sources:
            if source in jobs_by_source:
                source_jobs = jobs_by_source[source]
                taken = 0
                for job in source_jobs:
                    if job["job_id"] not in used_job_ids and taken < source_quota:
                        diverse_jobs.append(job)
                        used_job_ids.add(job["job_id"])
                        taken += 1
        
        # Second pass: fill remaining slots with highest-ranked jobs (any source)
        remaining_slots = limit - len(diverse_jobs)
        for job in filtered_jobs:
            if remaining_slots <= 0:
                break
            if job["job_id"] not in used_job_ids:
                diverse_jobs.append(job)
                used_job_ids.add(job["job_id"])
                remaining_slots -= 1
        
        # Sort the diverse set by match score to maintain quality
        diverse_jobs.sort(key=lambda x: -x["match_score"])
        limited_jobs = diverse_jobs[:limit]

        job_matches: list[JobMatchResponse] = []
        for job_data in limited_jobs:
            job = Job(
                job_id=job_data["job_id"],
                title=job_data["title"],
                company=job_data["company"],
                location=job_data["location"],
                description=job_data["description"],
                required_skills=job_data.get("required_skills", []),
                url=job_data["url"],
                salary=job_data.get("salary"),
                job_type=job_data.get("job_type"),
                experience_level=job_data.get("experience_level"),
                source=job_data["source"],
                posted_date=job_data.get("posted_date"),
                scraped_at=(
                    datetime.fromisoformat(job_data["scraped_at"])
                    if isinstance(job_data["scraped_at"], str)
                    else job_data["scraped_at"]
                ),
            )

            job_match = JobMatchResponse(
                job=job,
                match_score=job_data["match_score"],
                matched_skills=job_data["matched_skills"],
                missing_skills=job_data["missing_skills"],
            )
            job_matches.append(job_match)

        return RelevantJobsResponse(
            success=True,
            jobs=job_matches,
            total_jobs=len(filtered_jobs),
            user_skills=user_skills,
            message=f"Found {len(job_matches)} relevant jobs matching your skills",
        )

    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error fetching relevant jobs: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all", response_model=AllJobsResponse)
async def get_all_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    source: Optional[str] = Query(
        None, description="Filter by source: linkedin, indeed, internshala, etc."
    ),
    job_type: Optional[str] = Query(
        None, description="Filter by type: full-time, part-time, internship"
    ),
    current_user: dict = Depends(get_current_user),
) -> AllJobsResponse:
    """
    Get all available jobs with pagination and filters.
    """
    try:
        db = await get_database()

        query: Dict[str, Any] = {}
        if source:
            query["source"] = source
        if job_type:
            query["job_type"] = job_type

        total = await db.jobs.count_documents(query)

        skip = (page - 1) * limit
        jobs_cursor = (
            db.jobs.find(query)
            .skip(skip)
            .limit(limit)
            .sort("scraped_at", -1)
        )
        jobs_data = await jobs_cursor.to_list(length=limit)

        jobs: list[Job] = []
        for job_data in jobs_data:
            jobs.append(
                Job(
                    job_id=job_data["job_id"],
                    title=job_data["title"],
                    company=job_data["company"],
                    location=job_data["location"],
                    description=job_data["description"],
                    required_skills=job_data.get("required_skills", []),
                    url=job_data["url"],
                    salary=job_data.get("salary"),
                    job_type=job_data.get("job_type"),
                    experience_level=job_data.get("experience_level"),
                    source=job_data["source"],
                    posted_date=job_data.get("posted_date"),
                    scraped_at=(
                        datetime.fromisoformat(job_data["scraped_at"])
                        if isinstance(job_data["scraped_at"], str)
                        else job_data["scraped_at"]
                    ),
                )
            )

        return AllJobsResponse(
            success=True,
            jobs=jobs,
            total=total,
            page=page,
            limit=limit,
        )

    except Exception as e:  # noqa: BLE001
        logger.error("Error fetching all jobs: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_job(
    request: SaveJobRequest,
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Save or apply to a job; tracks user's job applications.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        job = await db.jobs.find_one({"job_id": request.job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        saved_job = {
            "user_id": user_id,
            "job_id": request.job_id,
            "status": request.status,
            "saved_at": datetime.utcnow().isoformat(),
            "applied_at": (
                datetime.utcnow().isoformat()
                if request.status == "applied"
                else None
            ),
            "notes": request.notes,
        }

        await db.saved_jobs.update_one(
            {"user_id": user_id, "job_id": request.job_id},
            {"$set": saved_job},
            upsert=True,
        )

        return {
            "success": True,
            "message": f"Job {request.status} successfully",
        }

    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error saving job: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved")
async def get_saved_jobs(
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get user's saved/applied jobs.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        saved_cursor = db.saved_jobs.find({"user_id": user_id}).sort("saved_at", -1)
        saved_jobs = await saved_cursor.to_list(length=100)

        enriched_jobs: list[Dict[str, Any]] = []
        for saved in saved_jobs:
            job = await db.jobs.find_one({"job_id": saved["job_id"]})
            if job:
                job_dict = _convert_objectid_to_str(dict(job))
                enriched_jobs.append(
                    {
                        **job_dict,
                        "saved_status": saved["status"],
                        "saved_at": saved["saved_at"],
                        "applied_at": saved.get("applied_at"),
                        "notes": saved.get("notes"),
                    }
                )

        return {
            "success": True,
            "jobs": enriched_jobs,
            "total": len(enriched_jobs),
        }

    except Exception as e:  # noqa: BLE001
        logger.error("Error fetching saved jobs: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_scraper_stats(
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get job scraper statistics.
    """
    try:
        db = await get_database()

        stats = await db.job_scraper_stats.find_one(sort=[("last_scrape", -1)])

        total_jobs = await db.jobs.count_documents({})
        linkedin_count = await db.jobs.count_documents({"source": "linkedin"})
        indeed_count = await db.jobs.count_documents({"source": "indeed"})
        internshala_count = await db.jobs.count_documents({"source": "internshala"})

        return {
            "success": True,
            "total_jobs": total_jobs,
            "by_source": {
                "linkedin": linkedin_count,
                "indeed": indeed_count,
                "internshala": internshala_count,
            },
            "last_scrape": stats.get("last_scrape") if stats else None,
            "last_scrape_stats": stats if stats else None,
        }

    except Exception as e:  # noqa: BLE001
        logger.error("Error fetching stats: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger-scrape")
async def trigger_manual_scrape(
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Manually trigger job scraping (bypasses 24-hour restriction).
    """
    try:
        result = await job_scheduler.force_scrape_and_save_jobs()
        if result.get("success"):
            return result
        raise HTTPException(status_code=400, detail=result.get("message", "Failed"))
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Error triggering scrape: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

