from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.repositories.ai_interaction_repository import AIInteractionRepository
from app.schemas.ocr_schema import OCRExplainResponse, OCRExtractResponse
from app.services.ocr_service import OCRService


router = APIRouter(
    prefix="/ocr",
    tags=["OCR"]
)


def handle_ocr_error(error: Exception):
    error_text = str(error)

    if (
        "RateLimitError" in error_text
        or "rate_limit" in error_text.lower()
        or "too many requests" in error_text.lower()
        or "429" in error_text
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI provider rate limit exceeded. Please wait and try again."
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
        detail=f"OCR service error: {error_text}"
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
    Audit logging must never break the user-facing OCR response.
    If logging fails, rollback and continue.
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
    "/extract",
    response_model=OCRExtractResponse
)
async def extract_ocr_text(
    language: str = Form(default="en"),
    voice_friendly: bool = Form(default=True),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = OCRService()

    try:
        result = await service.extract_text(
            image_file=image_file,
            language=language,
            voice_friendly=voice_friendly
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="ocr",
            request_type="extract",
            input_text=f"Extract readable text from image: {image_file.filename}",
            output_text=result.get("extracted_text"),
            provider=result.get("provider"),
            model_name="paddleocr",
            confidence=result.get("confidence"),
            is_voice_friendly=voice_friendly,
            should_speak=False,
            metadata_json={
                "language": language,
                "endpoint": "/api/v1/ocr/extract",
                "filename": image_file.filename,
                "content_type": image_file.content_type,
                "text_blocks_count": len(result.get("text_blocks", [])),
            },
        )

        return OCRExtractResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_ocr_error(error)


@router.post(
    "/explain",
    response_model=OCRExplainResponse
)
async def explain_ocr_text(
    language: str = Form(default="en"),
    explanation_level: str = Form(default="simple"),
    voice_friendly: bool = Form(default=True),
    should_speak: bool = Form(default=True),
    image_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = OCRService()

    try:
        result = await service.explain_image_text(
            image_file=image_file,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            should_speak=should_speak
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="ocr",
            request_type="explain",
            input_text=result.get("extracted_text"),
            output_text=result.get("explanation"),
            provider=result.get("provider"),
            model_name="paddleocr_plus_llm",
            confidence=result.get("confidence"),
            is_voice_friendly=voice_friendly,
            should_speak=should_speak,
            metadata_json={
                "language": language,
                "explanation_level": explanation_level,
                "endpoint": "/api/v1/ocr/explain",
                "filename": image_file.filename,
                "content_type": image_file.content_type,
                "text_blocks_count": len(result.get("text_blocks", [])),
                "has_extracted_text": bool(result.get("extracted_text")),
            },
        )

        return OCRExplainResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception as error:
        handle_ocr_error(error)