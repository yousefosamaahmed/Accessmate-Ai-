from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.onboarding_service import OnboardingService
from app.schemas.accessibility_profile_schema import (
    AccessibilityProfileResponse,
    AccessibilityProfileUpdate,
)


router = APIRouter(
    prefix="/onboarding",
    tags=["Onboarding"]
)


@router.post(
    "/users/{user_id}/default-profile",
    response_model=AccessibilityProfileResponse,
    status_code=status.HTTP_201_CREATED
)
def create_default_profile(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = OnboardingService(db)

    try:
        return service.create_default_profile(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.patch(
    "/users/{user_id}/preferences",
    response_model=AccessibilityProfileResponse
)
def update_onboarding_preferences(
    user_id: UUID,
    profile_data: AccessibilityProfileUpdate,
    db: Session = Depends(get_db)
):
    service = OnboardingService(db)

    try:
        return service.update_onboarding_preferences(
            user_id,
            profile_data
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )