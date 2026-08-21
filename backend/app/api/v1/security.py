from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.website_safety_service import WebsiteSafetyService
from app.schemas.website_check_schema import WebsiteCheckResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/security",
    tags=["Website Security"]
)


@router.post(
    "/check-url",
    response_model=WebsiteCheckResponse,
    status_code=status.HTTP_201_CREATED
)
def check_url(
    user_id: UUID,
    url: str = Query(..., min_length=3),
    log_extension_event: bool = True,
    db: Session = Depends(get_db)
):
    service = WebsiteSafetyService(db)

    try:
        return service.check_url(
            user_id=user_id,
            url=url,
            log_extension_event=log_extension_event
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.post(
    "/me/check-url",
    response_model=WebsiteCheckResponse,
    status_code=status.HTTP_201_CREATED
)
def check_my_url(
    url: str = Query(..., min_length=3),
    log_extension_event: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = WebsiteSafetyService(db)

    try:
        return service.check_url(
            user_id=current_user.id,
            url=url,
            log_extension_event=log_extension_event
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )