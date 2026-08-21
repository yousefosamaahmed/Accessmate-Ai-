from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.accessibility_profile_service import AccessibilityService
from app.schemas.accessibility_profile_schema import (
    AccessibilityProfileResponse,
    AccessibilityProfileUpdate,
)
from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(
    prefix="/profile",
    tags=["Accessibility Profile"]
)


@router.get(
    "/me",
    response_model=AccessibilityProfileResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.get_profile_by_user_id(current_user.id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me",
    response_model=AccessibilityProfileResponse
)
def update_my_profile(
    profile_data: AccessibilityProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.update_profile(
            current_user.id,
            profile_data
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me/safe-browsing/enable",
    response_model=AccessibilityProfileResponse
)
def enable_my_safe_browsing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.enable_safe_browsing(current_user.id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me/safe-browsing/disable",
    response_model=AccessibilityProfileResponse
)
def disable_my_safe_browsing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.disable_safe_browsing(current_user.id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me/voice-guidance/enable",
    response_model=AccessibilityProfileResponse
)
def enable_my_voice_guidance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.enable_voice_guidance(current_user.id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me/voice-guidance/disable",
    response_model=AccessibilityProfileResponse
)
def disable_my_voice_guidance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.disable_voice_guidance(current_user.id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me/language/{language}",
    response_model=AccessibilityProfileResponse
)
def set_my_assistant_language(
    language: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.set_assistant_language(
            current_user.id,
            language
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/me/mode/{mode}",
    response_model=AccessibilityProfileResponse
)
def set_my_accessibility_mode(
    mode: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.set_accessibility_mode(
            current_user.id,
            mode
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.get(
    "/{user_id}",
    response_model=AccessibilityProfileResponse
)
def get_profile_by_user_id(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.get_profile_by_user_id(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}",
    response_model=AccessibilityProfileResponse
)
def update_profile(
    user_id: UUID,
    profile_data: AccessibilityProfileUpdate,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.update_profile(user_id, profile_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}/safe-browsing/enable",
    response_model=AccessibilityProfileResponse
)
def enable_safe_browsing(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.enable_safe_browsing(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}/safe-browsing/disable",
    response_model=AccessibilityProfileResponse
)
def disable_safe_browsing(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.disable_safe_browsing(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}/voice-guidance/enable",
    response_model=AccessibilityProfileResponse
)
def enable_voice_guidance(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.enable_voice_guidance(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}/voice-guidance/disable",
    response_model=AccessibilityProfileResponse
)
def disable_voice_guidance(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.disable_voice_guidance(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}/language/{language}",
    response_model=AccessibilityProfileResponse
)
def set_assistant_language(
    user_id: UUID,
    language: str,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.set_assistant_language(user_id, language)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/{user_id}/mode/{mode}",
    response_model=AccessibilityProfileResponse
)
def set_accessibility_mode(
    user_id: UUID,
    mode: str,
    db: Session = Depends(get_db)
):
    service = AccessibilityService(db)

    try:
        return service.set_accessibility_mode(user_id, mode)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )