"""
Portfolio Service - Aggregates user data for portfolios
"""
from typing import Dict, Any
from datetime import datetime
from bson import ObjectId


class PortfolioService:
    @staticmethod
    async def fetch_user_portfolio_data(db, user_id: str) -> Dict[str, Any]:
        """
        Fetch all user data from various collections.
        Mirrors HACKSYNC behaviour but without HTML generation here.
        """
        # Get user basic info
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user = None

        # Get profile data
        profile = await db.user_profiles.find_one({"user_id": user_id})

        if not profile:
            profile = {
                "links": [],
                "skills": [],
                "experiences": [],
                "projects": [],
                "education": [],
                "interests": [],
            }

        portfolio_data: Dict[str, Any] = {
            "user_id": user_id,
            "name": user.get("full_name", "User") if user else "User",
            "email": user.get("email", "") if user else "",
            "location": profile.get("location", ""),
            "bio": profile.get("bio", ""),
            "links": profile.get("links", []),
            "skills": profile.get("skills", []),
            "experiences": profile.get("experiences", []),
            "projects": profile.get("projects", []),
            "education": profile.get("education", []),
            "interests": profile.get("interests", []),
        }

        return portfolio_data


