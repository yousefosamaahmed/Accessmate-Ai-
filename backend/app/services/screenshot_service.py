from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.services.document_service import DocumentService
from app.services.file_service import FileService


class ScreenshotService:
    def __init__(self, db: Session):
        self.db = db
        self.document_service = DocumentService(db)
        self.file_service = FileService()

    def create_screenshot_document(
        self,
        user_id: UUID,
        original_file_name: str,
        stored_file_name: str,
        file_path: str,
        mime_type: str,
        file_size: int
    ) -> Document:
        raise NotImplementedError(
            "Screenshot document creation will be connected to DocumentCreate later."
        )

    def analyze_screenshot(self, screenshot_path: str) -> dict:
        raise NotImplementedError(
            "Screenshot analysis is not implemented yet."
        )