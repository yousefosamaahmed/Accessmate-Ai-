from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.core.settings import settings
from app.models.user import User
from app.schemas.ai_schema import (
    AIChatRequest,
    AIChatResponse,
    SimpleExplanationRequest,
    SimpleExplanationResponse,
)
from app.services.llm_service import LLMService


router = APIRouter(
    prefix="/ai",
    tags=["AI Services"]
)


@router.post(
    "/chat",
    response_model=AIChatResponse
)
def chat(
    request_data: AIChatRequest,
    current_user: User = Depends(get_current_user)
):
    service = LLMService()

    try:
        answer = service.accessibility_chat(
            message=request_data.message,
            language=request_data.language,
            explanation_level=request_data.explanation_level,
            voice_friendly=request_data.voice_friendly
        )

        return AIChatResponse(
            answer=answer,
            language=request_data.language,
            explanation_level=request_data.explanation_level,
            provider=settings.AI_PROVIDER,
            model=settings.AI_MODEL,
            voice_friendly=request_data.voice_friendly
        )

    except Exception as error:
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
            detail=f"AI provider error: {error_text}"
        )

@router.post(
    "/simple-explanation",
    response_model=SimpleExplanationResponse
)
def simple_explanation(
    request_data: SimpleExplanationRequest,
    current_user: User = Depends(get_current_user)
):
    service = LLMService()

    try:
        explanation = service.simple_explanation(
            text=request_data.text,
            language=request_data.language,
            level=request_data.level,
            voice_friendly=request_data.voice_friendly
        )

        return SimpleExplanationResponse(
            explanation=explanation,
            language=request_data.language,
            level=request_data.level,
            provider=settings.AI_PROVIDER,
            model=settings.AI_MODEL,
            voice_friendly=request_data.voice_friendly
        )

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider error: {str(error)}"
        )