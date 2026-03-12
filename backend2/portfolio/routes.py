from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth.router import get_current_user
from config import get_database, FRONTEND_URL
from .portfolio_service import PortfolioService


class DeployRequest(BaseModel):
    design_type: str = "terminal"


router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/data")
async def get_portfolio_data(current_user: dict = Depends(get_current_user)):
    """
    Get portfolio data as JSON for preview.
    This mirrors HACKSYNC behaviour and is used by the frontend
    to render different React-based portfolio templates.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        portfolio_data = await PortfolioService.fetch_user_portfolio_data(db, user_id)

        return JSONResponse(content=portfolio_data)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch portfolio data: {str(e)}"
        )


@router.post("/deploy")
async def deploy_portfolio(
    request: DeployRequest = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Mark a user's portfolio as deployed and return the public URL.
    Frontend handles rendering; this just tracks deployment + design.
    """
    try:
        db = await get_database()
        user_id = str(current_user["_id"])

        deployment_data = {
            "user_id": user_id,
            "design_type": request.design_type,
            "deployed_at": __import__("datetime").datetime.utcnow(),
            "is_active": True,
        }

        existing = await db.deployed_portfolios.find_one({"user_id": user_id})

        if existing:
            await db.deployed_portfolios.update_one(
                {"user_id": user_id}, {"$set": deployment_data}
            )
        else:
            await db.deployed_portfolios.insert_one(deployment_data)

        portfolio_url = f"{FRONTEND_URL}/portfolio/{user_id}/deployed"

        return {
            "success": True,
            "portfolio_url": portfolio_url,
            "message": "Portfolio deployed successfully",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deploy portfolio: {str(e)}")


@router.get("/{user_id}/data")
async def get_user_portfolio_data(user_id: str):
    """
    Public route to get portfolio data for deployed portfolios.
    No authentication required (used by public portfolio URL).
    """
    try:
        db = await get_database()

        deployment = await db.deployed_portfolios.find_one(
            {"user_id": user_id, "is_active": True}
        )

        if not deployment:
            raise HTTPException(
                status_code=404, detail="Portfolio not found or not deployed"
            )

        portfolio_data = await PortfolioService.fetch_user_portfolio_data(db, user_id)
        portfolio_data["design_type"] = deployment.get("design_type", "terminal")

        return JSONResponse(content=portfolio_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load portfolio: {str(e)}")


