from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.settings import settings
from app.database import get_db
from app.models.user import User
from app.repositories.ai_interaction_repository import AIInteractionRepository
from app.schemas.voice_schema import (
    VoiceAudioAskResponse,
    VoiceTextAskRequest,
    VoiceTextAskResponse,
    VoiceTranscriptionResponse,
)
from app.services.voice_service import VoiceService


router = APIRouter(
    prefix="/voice",
    tags=["Voice Services"]
)


def safe_log_ai_interaction(
    db: Session,
    current_user: User,
    feature: str,
    request_type: str,
    input_text: str | None,
    output_text: str | None,
    provider: str | None,
    model_name: str | None,
    status_value: str = "success",
    confidence: float | None = None,
    is_voice_friendly: bool = True,
    should_speak: bool = False,
    metadata_json: dict | None = None,
) -> None:
    """
    Audit logging must never break the voice response.
    If logging fails, rollback and continue normally.
    """

    try:
        repository = AIInteractionRepository(db)

        repository.create_interaction(
            user_id=current_user.id,
            feature=feature,
            request_type=request_type,
            input_text=input_text,
            output_text=output_text,
            provider=provider,
            model_name=model_name,
            status=status_value,
            confidence=confidence,
            is_voice_friendly=is_voice_friendly,
            should_speak=should_speak,
            metadata_json=metadata_json,
        )

    except Exception:
        db.rollback()


def handle_ai_error(error: Exception):
    error_text = str(error)

    if (
        "RateLimitError" in error_text
        or "rate_limit" in error_text.lower()
        or "too many requests" in error_text.lower()
        or "429" in error_text
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "AI provider rate limit exceeded. "
                "Please wait and try again."
            )
        )

    if (
        "AuthenticationError" in error_text
        or "invalid_api_key" in error_text.lower()
        or "Incorrect API key" in error_text
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid AI provider API key."
        )

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Voice service error: {error_text}"
    )


@router.post(
    "/text-ask",
    response_model=VoiceTextAskResponse
)
def voice_text_ask(
    request_data: VoiceTextAskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = VoiceService()

    try:
        result = service.ask_by_text(
            message=request_data.message,
            language=request_data.language,
            explanation_level=request_data.explanation_level,
            voice_friendly=request_data.voice_friendly,
            speak=request_data.speak
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="voice",
            request_type="text_ask",
            input_text=request_data.message,
            output_text=result.get("answer"),
            provider=settings.AI_PROVIDER,
            model_name=settings.AI_MODEL,
            status_value="success",
            confidence=None,
            is_voice_friendly=request_data.voice_friendly,
            should_speak=request_data.speak,
            metadata_json={
                "endpoint": "/api/v1/voice/text-ask",
                "language": request_data.language,
                "explanation_level": request_data.explanation_level,
                "speak": request_data.speak,
            },
        )

        return VoiceTextAskResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_ai_error(error)


@router.post(
    "/transcribe",
    response_model=VoiceTranscriptionResponse
)
async def transcribe_audio(
    language: str = Form(default="en"),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = VoiceService()

    try:
        result = await service.transcribe_audio(
            audio_file=audio_file,
            language=language
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="voice",
            request_type="transcribe",
            input_text=audio_file.filename,
            output_text=result.get("transcript"),
            provider=result.get("provider", "voice_service"),
            model_name=result.get("model", "transcription_service"),
            status_value="success",
            confidence=result.get("confidence"),
            is_voice_friendly=True,
            should_speak=False,
            metadata_json={
                "endpoint": "/api/v1/voice/transcribe",
                "filename": audio_file.filename,
                "language": language,
                "content_type": audio_file.content_type,
            },
        )

        return VoiceTranscriptionResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_ai_error(error)


@router.post(
    "/audio-ask",
    response_model=VoiceAudioAskResponse
)
async def voice_audio_ask(
    language: str = Form(default="en"),
    explanation_level: str = Form(default="simple"),
    voice_friendly: bool = Form(default=True),
    speak: bool = Form(default=True),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = VoiceService()

    try:
        result = await service.ask_by_audio(
            audio_file=audio_file,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            speak=speak
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="voice",
            request_type="audio_ask",
            input_text=result.get("transcript") or audio_file.filename,
            output_text=result.get("answer"),
            provider=settings.AI_PROVIDER,
            model_name=settings.AI_MODEL,
            status_value="success",
            confidence=result.get("confidence"),
            is_voice_friendly=voice_friendly,
            should_speak=speak,
            metadata_json={
                "endpoint": "/api/v1/voice/audio-ask",
                "filename": audio_file.filename,
                "language": language,
                "content_type": audio_file.content_type,
                "explanation_level": explanation_level,
                "speak": speak,
                "has_transcript": bool(result.get("transcript")),
            },
        )

        return VoiceAudioAskResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_ai_error(error)