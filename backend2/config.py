import os
from dotenv import load_dotenv

load_dotenv()

# Database Vars
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "morpheus_db")

# Security Vars
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


async def get_database():
  """
  Compatibility helper for feature modules ported from HACKSYNC.
  Returns the global Motor database instance.
  """
  # Local import to avoid circular dependency (database -> config -> database)
  from database import db  # type: ignore

  return db


# Validation
if not MONGO_URI:
    raise ValueError("❌ ERROR: Missing MONGO_URI in .env file")
