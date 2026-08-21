from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from openai import APIStatusError, RateLimitError
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.hearing_persistence_schema import (
    HearingSessionCreate,
    HearingSessionOut,
    HearingSessionSummaryOut,
    HearingSoundEventCreate,
    HearingSoundEventOut,
)
from app.schemas.hearing_schema import (
    HearingChunkResponse,
    HearingSoundResponse,
    HearingTranslationRequest,
    HearingTranslationResponse,
)
from app.services.hearing_persistence_service import HearingPersistenceService
from app.services.hearing_service import HearingService
from app.services.hearing_translation_service import HearingTranslationService
from app.services.sound_awareness_service import SoundAwarenessService


router = APIRouter(
    prefix="/hearing",
    tags=["Hearing Assistant"],
)


# ============================================================
# LIVE SPEECH-TO-TEXT
# ============================================================

@router.post(
    "/transcribe-chunk",
    response_model=HearingChunkResponse,
)
async def transcribe_live_chunk(
    language: str = Form(default="auto"),
    sequence: int = Form(default=0),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    try:
        result = await HearingService().transcribe_chunk(
            audio_file=audio_file,
            language=language,
            sequence=sequence,
        )
        return HearingChunkResponse(**result)

    except RateLimitError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Live caption provider rate limit exceeded. "
                "Please wait briefly and try again."
            ),
        ) from error

    except APIStatusError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Speech provider returned HTTP {error.status_code}.",
        ) from error

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Hearing Assistant transcription failed: {error}",
        ) from error


# ============================================================
# LIVE TRANSLATION
# ============================================================

@router.post(
    "/translate",
    response_model=HearingTranslationResponse,
)
async def translate_caption(
    payload: HearingTranslationRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    try:
        result = await HearingTranslationService().translate(
            text=payload.text,
            source_language=payload.source_language,
            target_language=payload.target_language,
        )
        return HearingTranslationResponse(**result)

    except RateLimitError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Translation provider rate limit exceeded. "
                "The original caption is still available."
            ),
        ) from error

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Caption translation failed: {error}",
        ) from error


# ============================================================
# ENVIRONMENTAL SOUND CLASSIFICATION
# ============================================================

@router.post(
    "/classify-sound",
    response_model=HearingSoundResponse,
)
async def classify_environment_sound(
    threshold: float = Form(default=0.22),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    content_type = (audio_file.content_type or "").split(";", 1)[0].lower()

    if content_type not in {"audio/wav", "audio/x-wav"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sound Awareness expects WAV audio.",
        )

    try:
        audio_bytes = await audio_file.read()
        result = await SoundAwarenessService().classify(
            audio_bytes=audio_bytes,
            threshold=threshold,
        )
        return HearingSoundResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sound Awareness classification failed: {error}",
        ) from error


# ============================================================
# HEARING SESSION PERSISTENCE
# ============================================================

@router.post(
    "/sessions",
    response_model=HearingSessionOut,
    status_code=status.HTTP_201_CREATED,
)
def save_hearing_session(
    payload: HearingSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return HearingPersistenceService(db).save_session(
            current_user.id,
            payload,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.get(
    "/sessions",
    response_model=list[HearingSessionSummaryOut],
)
def get_my_hearing_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return HearingPersistenceService(db).list_sessions(
        current_user.id,
        limit,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=HearingSessionOut,
)
def get_hearing_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return HearingPersistenceService(db).get_session(
            current_user.id,
            session_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_hearing_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        HearingPersistenceService(db).delete_session(
            current_user.id,
            session_id,
        )
        return None
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


# ============================================================
# SOUND EVENT PERSISTENCE
# ============================================================

@router.post(
    "/sound-events",
    response_model=HearingSoundEventOut,
    status_code=status.HTTP_201_CREATED,
)
def save_hearing_sound_event(
    payload: HearingSoundEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return HearingPersistenceService(db).save_sound_event(
            current_user.id,
            payload,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.get(
    "/sound-events",
    response_model=list[HearingSoundEventOut],
)
def get_my_hearing_sound_events(
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return HearingPersistenceService(db).list_sound_events(
        current_user.id,
        limit,
    )


@router.patch(
    "/sound-events/by-client/{client_id}/care-alert/{care_alert_id}",
    response_model=HearingSoundEventOut,
)
def link_hearing_sound_event_to_care_alert(
    client_id: str,
    care_alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return HearingPersistenceService(db).link_sound_event_to_care_alert(
            current_user.id,
            client_id,
            care_alert_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
