from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.repositories.ai_interaction_repository import AIInteractionRepository
from app.schemas.vision_schema import VisionAssistResponse, VisionDescribeResponse
from app.services.vision_service import VisionService


router = APIRouter(
    prefix="/vision",
    tags=["Vision Assistant"]
)


def handle_vision_error(error: Exception):
    error_text = str(error)

    if (
        "RateLimitError" in error_text
        or "rate_limit" in error_text.lower()
        or "too many requests" in error_text.lower()
        or "429" in error_text
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="All available vision providers are currently rate limited. Please try again shortly."
        )

    if (
        "AuthenticationError" in error_text
        or "invalid_api_key" in error_text.lower()
        or "Incorrect API key" in error_text
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Vision provider authentication failed."
        )

    if (
        "TimeoutError" in error_text
        or "timed out" in error_text.lower()
    ):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Vision providers took too long to respond. Please try again."
        )

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Vision assistant service error: {error_text}"
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
    confidence: float | None,
    is_voice_friendly: bool,
    should_speak: bool,
    metadata_json: dict | None = None,
) -> None:
    """
    Audit logging should never break the user-facing response.
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
            status="success",
            confidence=confidence,
            is_voice_friendly=is_voice_friendly,
            should_speak=should_speak,
            metadata_json=metadata_json,
        )

    except Exception:
        db.rollback()


@router.post(
    "/describe",
    response_model=VisionDescribeResponse
)
async def describe_image(
    language: str = Form(default="en"),
    explanation_level: str = Form(default="simple"),
    voice_friendly: bool = Form(default=True),
    should_speak: bool = Form(default=True),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = VisionService()

    try:
        result = await service.describe_image(
            image_file=image_file,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            should_speak=should_speak
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="vision",
            request_type="describe",
            input_text="Describe this image for accessibility.",
            output_text=result.get("description"),
            provider=result.get("provider"),
            model_name=service.last_model_used,
            confidence=result.get("confidence"),
            is_voice_friendly=voice_friendly,
            should_speak=should_speak,
            metadata_json={
                "language": language,
                "explanation_level": explanation_level,
                "endpoint": "/api/v1/vision/describe",
                "filename": image_file.filename,
                "content_type": image_file.content_type,
                "vision_model": service.last_model_used,
            },
        )

        return VisionDescribeResponse(
            **result
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_vision_error(
            error
        )


@router.post(
    "/assist",
    response_model=VisionAssistResponse
)
async def assist_with_image(
    task: str = Form(...),
    language: str = Form(default="en"),
    explanation_level: str = Form(default="simple"),
    voice_friendly: bool = Form(default=True),
    should_speak: bool = Form(default=True),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = VisionService()

    try:
        result = await service.assist_with_image(
            image_file=image_file,
            task=task,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            should_speak=should_speak
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="vision",
            request_type="assist",
            input_text=task,
            output_text=result.get("answer"),
            provider=result.get("provider"),
            model_name=service.last_model_used,
            confidence=result.get("confidence"),
            is_voice_friendly=voice_friendly,
            should_speak=should_speak,
            metadata_json={
                "language": language,
                "explanation_level": explanation_level,
                "endpoint": "/api/v1/vision/assist",
                "filename": image_file.filename,
                "content_type": image_file.content_type,
                "vision_model": service.last_model_used,
            },
        )

        return VisionAssistResponse(
            **result
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_vision_error(
            error
        )
