from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.settings import settings
from app.database import get_db
from app.models.user import User
from app.repositories.ai_interaction_repository import AIInteractionRepository
from app.schemas.assistant_schema import (
    AssistantChatRequest,
    AssistantChatResponse,
    DocumentChatRequest,
    DocumentChatResponse,
)
from app.services.assistant_document_service import AssistantDocumentService
from app.services.llm_service import LLMService


router = APIRouter(
    prefix="/assistant",
    tags=["Assistant"]
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
    Audit logging must never break the user-facing assistant response.
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
            status=status_value,
            confidence=confidence,
            is_voice_friendly=is_voice_friendly,
            should_speak=should_speak,
            metadata_json=metadata_json,
        )

    except Exception:
        db.rollback()


def confidence_to_float(confidence_value) -> float | None:
    """
    Convert RAG confidence labels to numeric audit values.

    high      -> 1.0
    medium    -> 0.7
    low       -> 0.4
    very_low  -> 0.15
    none      -> 0.0
    """

    if confidence_value is None:
        return None

    if isinstance(confidence_value, (int, float)):
        return float(confidence_value)

    confidence_text = str(confidence_value).lower().strip()

    mapping = {
        "high": 1.0,
        "medium": 0.7,
        "low": 0.4,
        "very_low": 0.15,
        "none": 0.0,
    }

    return mapping.get(confidence_text)


def handle_assistant_error(error: Exception):
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
        detail=f"Assistant provider error: {error_text}"
    )


@router.post(
    "/chat",
    response_model=AssistantChatResponse
)
def general_assistant_chat(
    request_data: AssistantChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = LLMService()

    try:
        answer = service.accessibility_chat(
            message=request_data.message,
            language=request_data.language,
            explanation_level=request_data.explanation_level,
            voice_friendly=request_data.voice_friendly
        )

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="assistant",
            request_type="chat",
            input_text=request_data.message,
            output_text=answer,
            provider=settings.AI_PROVIDER,
            model_name=settings.AI_MODEL,
            status_value="success",
            confidence=None,
            is_voice_friendly=request_data.voice_friendly,
            should_speak=False,
            metadata_json={
                "endpoint": "/api/v1/assistant/chat",
                "language": request_data.language,
                "explanation_level": request_data.explanation_level,
            },
        )

        return AssistantChatResponse(
            answer=answer,
            language=request_data.language,
            explanation_level=request_data.explanation_level,
            voice_friendly=request_data.voice_friendly
        )

    except Exception as error:
        handle_assistant_error(error)


@router.post(
    "/document-chat",
    response_model=DocumentChatResponse
)
def document_chat(
    request_data: DocumentChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AssistantDocumentService(db)

    try:
        result = service.chat_with_document(
            document_id=request_data.document_id,
            user_id=current_user.id,
            question=request_data.question,
            language=request_data.language,
            explanation_level=request_data.explanation_level,
            voice_friendly=request_data.voice_friendly,
            limit=request_data.limit
        )

        evidence_chunks = result.get("evidence_chunks", [])
        confidence_label = result.get("confidence")
        numeric_confidence = confidence_to_float(confidence_label)

        safe_log_ai_interaction(
            db=db,
            current_user=current_user,
            feature="rag",
            request_type="document_question",
            input_text=request_data.question,
            output_text=result.get("answer"),
            provider=settings.AI_PROVIDER,
            model_name=settings.AI_MODEL,
            status_value="success",
            confidence=numeric_confidence,
            is_voice_friendly=request_data.voice_friendly,
            should_speak=False,
            metadata_json={
                "endpoint": "/api/v1/assistant/document-chat",
                "document_id": str(request_data.document_id),
                "language": request_data.language,
                "explanation_level": request_data.explanation_level,
                "limit": request_data.limit,
                "found_answer": result.get("found_answer"),
                "confidence_label": confidence_label,
                "evidence_chunks_count": (
                    len(evidence_chunks)
                    if isinstance(evidence_chunks, list)
                    else 0
                ),
            },
        )

        return DocumentChatResponse(**result)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error)
        )

    except Exception as error:
        handle_assistant_error(error)