from datetime import datetime
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth.router import get_current_user
from config import get_database
from job_application.application_service import generate_tailored_application
from job_application.schema import (
    Application,
    ApplicationGenerateResponse,
    ApplicationRequest,
    ApplicationResponse,
    ApplicationsListResponse,
    SaveApplicationRequest,
)


router = APIRouter(prefix="/job-application", tags=["Job Application"])


@router.post("/generate", response_model=ApplicationGenerateResponse)
async def generate_application(
    request: ApplicationRequest, current_user: dict = Depends(get_current_user)
) -> ApplicationGenerateResponse:
    """
    Generate JD-tailored resume and cover letter from the user's profile.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        profile = await db.user_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if not profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found. Please complete your profile first.",
            )

        profile["name"] = current_user.get("full_name", "")
        profile["email"] = current_user.get("email", "")
        profile["phone"] = ""
        for link in profile.get("links", []):
            if link.get("type") == "phone":
                profile["phone"] = link.get("value", "")
                break

        result = await generate_tailored_application(
            job_description=request.job_description,
            job_title=request.job_title,
            company=request.company,
            user_profile=profile,
        )

        return ApplicationGenerateResponse(
            success=True,
            tailored_resume=result.get("tailored_resume"),
            cover_letter=result.get("cover_letter"),
            message="Application materials generated successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        msg = str(exc)
        if "API quota exceeded" in msg or "Unable to generate response" in msg:
            raise HTTPException(
                status_code=503,
                detail=(
                    "AI service is temporarily unavailable due to API quota limits. "
                    "Please try again later or contact support."
                ),
            ) from exc
        raise HTTPException(
            status_code=500, detail=f"Failed to generate application: {msg}"
        ) from exc


@router.post("/save", response_model=ApplicationResponse)
async def save_application(
    request: SaveApplicationRequest, current_user: dict = Depends(get_current_user)
) -> ApplicationResponse:
    """
    Save a job application with tailored resume and cover letter.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        existing = await db.job_applications.find_one(
            {"user_id": user_id, "job_id": request.job_id}
        )

        application_data: Dict[str, Any] = {
            "user_id": user_id,
            "job_id": request.job_id,
            "job_title": request.job_title,
            "company": request.company,
            "job_description": request.job_description,
            "tailored_resume": request.tailored_resume.dict(),
            "cover_letter": request.cover_letter.dict(),
            "updated_at": datetime.utcnow(),
            "status": "draft",
        }

        if existing:
            await db.job_applications.update_one(
                {"_id": existing["_id"]}, {"$set": application_data}
            )
            application_data["created_at"] = existing["created_at"]
            application_data["_id"] = existing["_id"]
        else:
            application_data["created_at"] = datetime.utcnow()
            result = await db.job_applications.insert_one(application_data)
            application_data["_id"] = result.inserted_id

        application_data.pop("_id", None)

        return ApplicationResponse(
            success=True,
            application=Application(**application_data),
            message="Application saved successfully",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to save application: {exc}"
        ) from exc


@router.get("/my-applications", response_model=ApplicationsListResponse)
async def get_my_applications(
    limit: int = 50, current_user: dict = Depends(get_current_user)
) -> ApplicationsListResponse:
    """
    Get all applications for the current user, including cold mail applications.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        all_applications: List[Dict[str, Any]] = []

        cursor = db.job_applications.find({"user_id": user_id}).sort("updated_at", -1)
        async for app in cursor:
            app.pop("_id", None)
            app["application_source"] = "job_application"
            all_applications.append(app)

        cold_cursor = db.company_applications.find(
            {"user_id": user_id, "status": "sent"}
        ).sort("sent_at", -1)
        async for app in cold_cursor:
            app.pop("_id", None)
            application = {
                "user_id": app.get("user_id"),
                "job_id": f"cold_mail_{app.get('company_domain', 'unknown')}",
                "job_title": "Cold Mail Application",
                "company": app.get("company_name", "Unknown Company"),
                "job_description": f"Cold email sent to {app.get('company_email', 'N/A')}",
                "tailored_resume": None,
                "cover_letter": None,
                "created_at": app.get("sent_at"),
                "updated_at": app.get("sent_at"),
                "status": "submitted",
                "application_source": "cold_mail",
                "company_email": app.get("company_email"),
                "subject": app.get("subject"),
            }
            all_applications.append(application)

        all_applications.sort(
            key=lambda x: x.get("updated_at") or x.get("created_at") or datetime.min,
            reverse=True,
        )

        applications = all_applications[:limit]
        formatted: List[Application] = []
        for app in applications:
            try:
                formatted.append(Application(**app))
            except Exception:
                continue

        return ApplicationsListResponse(
            success=True,
            applications=formatted,
            total=len(formatted),
            message="Applications fetched successfully",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch applications: {exc}"
        ) from exc


@router.delete("/delete/{job_id}")
async def delete_application(
    job_id: str, current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete a saved application by job_id.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        result = await db.job_applications.delete_one(
            {"user_id": user_id, "job_id": job_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"success": True, "message": "Application deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete application: {exc}"
        ) from exc

from datetime import datetime
from typing import Dict, Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth.router import get_current_user
from config import get_database
from .schema import (
    ApplicationRequest,
    ApplicationGenerateResponse,
    SaveApplicationRequest,
    ApplicationResponse,
    ApplicationsListResponse,
    Application,
)
from .application_service import generate_tailored_application


router = APIRouter(prefix="/job-application", tags=["job_application"])


@router.post("/generate", response_model=ApplicationGenerateResponse)
async def generate_application(
    request: ApplicationRequest, current_user: dict = Depends(get_current_user)
):
    """
    Generate JD-tailored resume and cover letter.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        # Fetch user profile data
        profile = await db.user_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0},
        )

        if not profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found. Please complete your profile first.",
            )

        # Add user basic info to profile
        profile["name"] = current_user.get("full_name", "")
        profile["email"] = current_user.get("email", "")
        profile["phone"] = ""
        for link in profile.get("links", []):
            if link.get("type") == "phone":
                profile["phone"] = link.get("value", "")
                break

        # Generate tailored application materials
        result = await generate_tailored_application(
            job_description=request.job_description,
            job_title=request.job_title,
            company=request.company,
            user_profile=profile,
        )

        return ApplicationGenerateResponse(
            success=True,
            tailored_resume=result.get("tailored_resume"),
            cover_letter=result.get("cover_letter"),
            message="Application materials generated successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating application: {error_msg}")

        # Check if it's an API quota error
        if "API quota exceeded" in error_msg or "Unable to generate response" in error_msg:
            raise HTTPException(
                status_code=503,
                detail=(
                    "AI service is temporarily unavailable due to API quota limits. "
                    "Please try again later or contact support."
                ),
            )

        raise HTTPException(status_code=500, detail=f"Failed to generate application: {error_msg}")


@router.post("/save", response_model=ApplicationResponse)
async def save_application(
    request: SaveApplicationRequest, current_user: dict = Depends(get_current_user)
):
    """
    Save a job application with tailored resume and cover letter.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        # Check if application already exists for this job
        existing = await db.job_applications.find_one(
            {
                "user_id": user_id,
                "job_id": request.job_id,
            }
        )

        # Prepare application data
        application_data: Dict[str, Any] = {
            "user_id": user_id,
            "job_id": request.job_id,
            "job_title": request.job_title,
            "company": request.company,
            "job_description": request.job_description,
            "tailored_resume": request.tailored_resume.model_dump(),
            "cover_letter": request.cover_letter.model_dump(),
            "updated_at": datetime.utcnow(),
            "status": "draft",
        }

        if existing:
            # Update existing application
            await db.job_applications.update_one(
                {"_id": existing["_id"]},
                {"$set": application_data},
            )
            application_data["created_at"] = existing["created_at"]
            application_data["_id"] = existing["_id"]
        else:
            # Create new application
            application_data["created_at"] = datetime.utcnow()
            result = await db.job_applications.insert_one(application_data)
            application_data["_id"] = result.inserted_id

        # Remove MongoDB _id from response
        application_data.pop("_id", None)

        return ApplicationResponse(
            success=True,
            application=Application(**application_data),
            message="Application saved successfully",
        )

    except Exception as e:
        print(f"Error saving application: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save application: {str(e)}")


@router.get("/my-applications", response_model=ApplicationsListResponse)
async def get_my_applications(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """
    Get all applications for the current user (both job applications and cold mail applications).
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        all_applications: list[Dict[str, Any]] = []

        # Fetch job applications
        job_apps_cursor = db.job_applications.find({"user_id": user_id}).sort("updated_at", -1)

        async for app in job_apps_cursor:
            app.pop("_id", None)
            app["application_source"] = "job_application"
            all_applications.append(app)

        # Fetch cold mail applications if collection exists
        if "company_applications" in await db.list_collection_names():
            cold_mail_cursor = db.company_applications.find(
                {"user_id": user_id, "status": "sent"}
            ).sort("sent_at", -1)

            async for app in cold_mail_cursor:
                app.pop("_id", None)
                application = {
                    "user_id": app.get("user_id"),
                    "job_id": f"cold_mail_{app.get('company_domain', 'unknown')}",
                    "job_title": "Cold Mail Application",
                    "company": app.get("company_name", "Unknown Company"),
                    "job_description": f"Cold email sent to {app.get('company_email', 'N/A')}",
                    "tailored_resume": None,
                    "cover_letter": None,
                    "created_at": app.get("sent_at"),
                    "updated_at": app.get("sent_at"),
                    "status": "submitted",
                    "application_source": "cold_mail",
                    "company_email": app.get("company_email"),
                    "subject": app.get("subject"),
                }
                all_applications.append(application)

        # Sort all applications by date (most recent first)
        all_applications.sort(
            key=lambda x: x.get("updated_at") or x.get("created_at") or datetime.min,
            reverse=True,
        )

        # Limit results
        applications = all_applications[:limit]

        # Convert to Application objects
        formatted_applications = []
        for app in applications:
            try:
                formatted_applications.append(Application(**app))
            except Exception as e:
                print(f"Error formatting application: {e}")
                continue

        return ApplicationsListResponse(
            success=True,
            applications=formatted_applications,
            total=len(formatted_applications),
            message="Applications fetched successfully",
        )

    except Exception as e:
        print(f"Error fetching applications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


@router.delete("/delete/{job_id}")
async def delete_application(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete an application.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        result = await db.job_applications.delete_one({"user_id": user_id, "job_id": job_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")

        return {"success": True, "message": "Application deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting application: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete application: {str(e)}")

