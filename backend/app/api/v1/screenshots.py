from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(
    prefix="/screenshots",
    tags=["Screenshots"]
)


class ScreenshotAnalyzeRequest(BaseModel):
    user_id: UUID
    screenshot_path: str
    assistant_language: str = "ar"


class ScreenshotAnalyzeResponse(BaseModel):
    user_id: UUID
    screenshot_path: str
    description: str
    detected_text: Optional[str] = None
    assistant_language: str
    status: str


class ScreenshotDocumentRequest(BaseModel):
    user_id: UUID
    original_file_name: str
    stored_file_name: str
    file_path: str
    mime_type: str
    file_size: int


class ScreenshotDocumentResponse(BaseModel):
    user_id: UUID
    original_file_name: str
    stored_file_name: str
    file_path: str
    mime_type: str
    file_size: int
    status: str
    message: str


@router.post(
    "/analyze",
    response_model=ScreenshotAnalyzeResponse
)
def analyze_screenshot(request_data: ScreenshotAnalyzeRequest):
    if not request_data.screenshot_path.strip():
        raise HTTPException(
            status_code=400,
            detail="Screenshot path cannot be empty"
        )

    return ScreenshotAnalyzeResponse(
        user_id=request_data.user_id,
        screenshot_path=request_data.screenshot_path,
        description=(
            "This is a temporary screenshot analysis response. "
            "OCR and computer vision integration will be added later."
        ),
        detected_text=None,
        assistant_language=request_data.assistant_language,
        status="mock_response"
    )


@router.post(
    "/document",
    response_model=ScreenshotDocumentResponse
)
def create_screenshot_document(request_data: ScreenshotDocumentRequest):
    if request_data.file_size <= 0:
        raise HTTPException(
            status_code=400,
            detail="File size must be greater than zero"
        )

    return ScreenshotDocumentResponse(
        user_id=request_data.user_id,
        original_file_name=request_data.original_file_name,
        stored_file_name=request_data.stored_file_name,
        file_path=request_data.file_path,
        mime_type=request_data.mime_type,
        file_size=request_data.file_size,
        status="mock_response",
        message=(
            "This is a temporary screenshot document response. "
            "Real screenshot upload and document creation will be connected later."
        )
    )