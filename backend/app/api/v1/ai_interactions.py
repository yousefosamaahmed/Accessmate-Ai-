from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.repositories.ai_interaction_repository import AIInteractionRepository
from app.schemas.ai_interaction_schema import AIInteractionListResponse


router = APIRouter(
    prefix="/ai-interactions",
    tags=["AI Interactions"]
)


@router.get(
    "",
    response_model=AIInteractionListResponse
)
def list_my_ai_interactions(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repository = AIInteractionRepository(db)

    items = repository.list_user_interactions(
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )

    return AIInteractionListResponse(
        items=items,
        count=len(items),
        limit=limit,
        offset=offset
    )