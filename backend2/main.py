import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from logger import get_logger
from auth.router import router as auth_router
from user_profile.routes import router as profile_router
from ai_resume_builder.routes import router as ai_resume_router
from portfolio.routes import router as portfolio_router
from presentation.routes import router as presentation_router
from career_recommender.routes import router as career_router
from learning.routes import router as learning_router
from job_application.routes import router as job_application_router
from cold_mail.routes import router as cold_mail_router
from job_tracker.routes import router as jobs_router
from job_tracker.scheduler import job_scheduler
from resume_analyzer.routes import router as resume_analyzer_router
from flashcards.routes import router as flashcards_router
from interview_agent.routes import router as interview_router
from explainer.routes import router as explainer_router
from YT_transcript.routes import router as yt_transcript_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    logger.info("Starting SkillSphere application...")
    # Start background job scheduler for job scraping (LinkedIn + Tavily),
    # mirroring the behavior from HACKSYNC.
    try:
        job_scheduler.start()
        logger.info("Job scheduler started successfully")
    except Exception as exc:  # pragma: no cover
        logger.error("Failed to start job scheduler: %s", exc)
    logger.info("Application started successfully")
    yield
    # Shutdown
    logger.info("Shutting down application...")
    try:
        job_scheduler.shutdown()
    except Exception:
        # Best-effort shutdown; don't block app exit
        logger.warning("Job scheduler shutdown encountered an error", exc_info=True)
    logger.info("Application shut down")


app = FastAPI(title="SkillSphere API", lifespan=lifespan)

# Configure CORS
import os

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(ai_resume_router)
app.include_router(portfolio_router)
app.include_router(presentation_router)
app.include_router(career_router)
app.include_router(learning_router, prefix="/api/learning", tags=["Learning"])
app.include_router(job_application_router, prefix="/api", tags=["Job Application"])
app.include_router(cold_mail_router, prefix="/api", tags=["Cold Mail"])
app.include_router(jobs_router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(resume_analyzer_router, prefix="/api", tags=["Resume Analyzer"])
app.include_router(flashcards_router, prefix="/api", tags=["Flashcards"])
app.include_router(interview_router, prefix="/api", tags=["Interview Agent"])
app.include_router(explainer_router, prefix="/api/explainer", tags=["Explainer Agent"])
app.include_router(
    yt_transcript_router, prefix="/api/yt_transcript", tags=["YouTube Transcript"]
)


@app.get("/")
def home():
    logger.info("Health check endpoint accessed")
    return {"message": "SkillSphere API Online"}
