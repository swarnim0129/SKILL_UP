from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from auth.router import get_current_user
from config import get_database
from .schema import AIResumeData, ResumeAnalysisResponse


router = APIRouter(prefix="/ai-resume-builder", tags=["AI Resume Builder"])


@router.post("/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
):
  """
  Get user profile data and format for resume.
  No AI - just uses MongoDB data directly, same as in HACKSYNC.
  """
  try:
      db = await get_database()
      user_id = str(current_user["_id"])

      profile = await db.user_profiles.find_one(
          {"user_id": user_id},
          {"_id": 0},
      )

      if not profile:
          profile = {}

      all_skills = [skill.get("name", "") for skill in profile.get("skills", [])]
      skill_count = len(all_skills) // 3 if len(all_skills) >= 3 else len(all_skills)
      skills_grouped = [
          {
              "category": "Languages & Frameworks",
              "skills": all_skills[:skill_count] if all_skills else [],
          },
          {
              "category": "Tools & Technologies",
              "skills": (
                  all_skills[skill_count : skill_count * 2]
                  if len(all_skills) > skill_count
                  else []
              ),
          },
          {
              "category": "Databases & Cloud",
              "skills": (
                  all_skills[skill_count * 2 :]
                  if len(all_skills) > skill_count * 2
                  else []
              ),
          },
      ]

      experiences_transformed = []
      for exp in profile.get("experiences", []):
          experiences_transformed.append(
              {
                  "title": exp.get("title", ""),
                  "company": exp.get("company", ""),
                  "location": "",
                  "start_date": exp.get("startDate", ""),
                  "end_date": (
                      exp.get("endDate", "")
                      if not exp.get("currentlyWorking")
                      else "Present"
                  ),
                  "description": [exp.get("description", "")]
                  if exp.get("description")
                  else [],
              }
          )

      projects_transformed = []
      for proj in profile.get("projects", []):
          tech_list = (
              [t.strip() for t in proj.get("technologies", "").split(",")]
              if proj.get("technologies")
              else []
          )
          projects_transformed.append(
              {
                  "name": proj.get("name", ""),
                  "description": proj.get("description", ""),
                  "technologies": tech_list,
                  "link": proj.get("link"),
                  "highlights": [],
              }
          )

      education_transformed = []
      for edu in profile.get("education", []):
          education_transformed.append(
              {
                  "degree": edu.get("degree", ""),
                  "institution": edu.get("institution", ""),
                  "location": "",
                  "graduation_date": edu.get("year", ""),
                  "gpa": None,
                  "achievements": None,
              }
          )

      phone = ""
      linkedin = ""
      github = ""
      website = ""
      for link in profile.get("links", []):
          link_type = link.get("type", "")
          link_value = link.get("value", "")
          if link_type == "phone":
              phone = link_value
          elif link_type == "linkedin":
              linkedin = link_value
          elif link_type == "github":
              github = link_value
          elif link_type == "website":
              website = link_value

      resume_data = {
          "personal_info": {
              "name": current_user.get("full_name", ""),
              "email": current_user.get("email", ""),
              "phone": phone,
              "location": profile.get("location", "India"),
              "linkedin": linkedin,
              "github": github,
              "portfolio": website,
          },
          "summary": "",
          "skills": skills_grouped,
          "experience": experiences_transformed,
          "projects": projects_transformed,
          "education": education_transformed,
          "certifications": None,
          "awards": None,
          "languages": None,
      }

      await db.user_profiles.update_one(
          {"user_id": user_id},
          {"$set": {"ai_resume_data": resume_data}},
          upsert=True,
      )

      return ResumeAnalysisResponse(
          success=True,
          data=AIResumeData(**resume_data),
          message="Resume data loaded successfully",
      )

  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Failed to load resume: {str(e)}")


@router.put("/save")
async def save_edited_resume(
    resume_data: AIResumeData,
    current_user: dict = Depends(get_current_user),
):
  """Save user-edited AI resume data to MongoDB."""
  try:
      db = await get_database()
      user_id = str(current_user["_id"])

      await db.user_profiles.update_one(
          {"user_id": user_id},
          {"$set": {"ai_resume_data": resume_data.model_dump()}},
          upsert=True,
      )

      return {"success": True, "message": "Resume saved successfully"}

  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Failed to save resume: {str(e)}")


@router.get("/resume-data")
async def get_resume_data(current_user: dict = Depends(get_current_user)):
  """Get user's AI-enhanced resume data from MongoDB."""
  try:
      db = await get_database()
      user_id = str(current_user["_id"])

      profile = await db.user_profiles.find_one(
          {"user_id": user_id},
          {"ai_resume_data": 1, "_id": 0},
      )

      if not profile or "ai_resume_data" not in profile:
          return {
              "success": False,
              "data": None,
              "message": "No AI resume data found",
          }

      return {
          "success": True,
          "data": profile["ai_resume_data"],
          "message": "Resume data retrieved successfully",
      }

  except Exception as e:
      raise HTTPException(
          status_code=500, detail=f"Failed to retrieve resume data: {str(e)}"
      )


@router.post("/generate-pdf")
async def generate_pdf(
    template: str = "modern",
    current_user: dict = Depends(get_current_user),
):
  """
  Return stored AI resume data with selected template.
  Frontend handles actual rendering + PDF export.
  """
  try:
      db = await get_database()
      user_id = str(current_user["_id"])

      profile = await db.user_profiles.find_one(
          {"user_id": user_id},
          {"ai_resume_data": 1, "_id": 0},
      )

      if not profile or "ai_resume_data" not in profile:
          raise HTTPException(
              status_code=404,
              detail="No resume data found. Please generate resume first.",
          )

      resume_data = profile["ai_resume_data"]

      return {
          "template": template,
          "data": resume_data,
      }

  except HTTPException:
      raise
  except Exception as e:
      raise HTTPException(
          status_code=500, detail=f"Failed to get resume data: {str(e)}"
      )

