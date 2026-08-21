from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.speech_service import SpeechService
from app.schemas.speech_log_schema import (
    SpeechLogCreate,
    SpeechLogUpdate,
    SpeechLogResponse,
)
from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(
    prefix="/speech",
    tags=["Speech"]
)


@router.post(
    "/logs",
    response_model=SpeechLogResponse,
    status_code=status.HTTP_201_CREATED
)
def create_speech_log(
    speech_log_data: SpeechLogCreate,
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.create_speech_log(speech_log_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.post(
    "/me/logs",
    response_model=SpeechLogResponse,
    status_code=status.HTTP_201_CREATED
)
def create_my_speech_log(
    speech_log_data: SpeechLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    speech_log_data.user_id = current_user.id

    try:
        return service.create_speech_log(speech_log_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.get(
    "/me/logs",
    response_model=list[SpeechLogResponse]
)
def get_my_speech_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.get_speech_logs_by_user_id(current_user.id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.get(
    "/logs/{speech_log_id}",
    response_model=SpeechLogResponse
)
def get_speech_log_by_id(
    speech_log_id: UUID,
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.get_speech_log_by_id(speech_log_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.get(
    "/users/{user_id}/logs",
    response_model=list[SpeechLogResponse]
)
def get_speech_logs_by_user_id(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.get_speech_logs_by_user_id(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/logs/{speech_log_id}",
    response_model=SpeechLogResponse
)
def update_speech_log(
    speech_log_id: UUID,
    speech_log_data: SpeechLogUpdate,
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.update_speech_log(speech_log_id, speech_log_data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/logs/{speech_log_id}/transcript",
    response_model=SpeechLogResponse
)
def set_transcript(
    speech_log_id: UUID,
    transcript: str = Query(..., min_length=1),
    detected_language: str = "unknown",
    confidence: Decimal | None = None,
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.set_transcript(
            speech_log_id=speech_log_id,
            transcript=transcript,
            detected_language=detected_language,
            confidence=confidence
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.patch(
    "/logs/{speech_log_id}/tts-output",
    response_model=SpeechLogResponse
)
def set_tts_output(
    speech_log_id: UUID,
    tts_output_path: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        return service.set_tts_output(
            speech_log_id=speech_log_id,
            tts_output_path=tts_output_path
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )


@router.delete(
    "/logs/{speech_log_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_speech_log(
    speech_log_id: UUID,
    db: Session = Depends(get_db)
):
    service = SpeechService(db)

    try:
        service.delete_speech_log(speech_log_id)
        return None
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )