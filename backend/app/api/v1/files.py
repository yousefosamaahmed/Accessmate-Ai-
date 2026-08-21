# app/api/v1/files.py

from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document_schema import (
    DocumentCreate,
    DocumentResponse,
)
from app.services.document_service import DocumentService
from app.services.file_service import FileService


router = APIRouter(
    prefix="/files",
    tags=["Files"],
)


# ============================================================
# ALLOWED FILE TYPES
# ============================================================

ALLOWED_EXTENSIONS = [
    # Documents
    ".pdf",
    ".txt",
    ".doc",
    ".docx",
    ".csv",

    # Images / screenshots
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",

    # Audio / voice
    ".mp3",
    ".wav",
    ".m4a",
    ".webm",
    ".ogg",
    ".aac",
]


# ============================================================
# INTERNAL HELPER
# ============================================================

def get_user_document_or_404(
    db: Session,
    user_id: UUID,
    file_id: UUID,
) -> Document:
    """
    Return a document only when it belongs
    to the currently authenticated user.
    """

    document = (
        db.query(Document)
        .filter(Document.id == file_id)
        .filter(Document.user_id == user_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    return document


# ============================================================
# UPLOAD FILE
# ============================================================

@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document_service = DocumentService(db)
    file_service = FileService()

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required",
        )

    original_file_name = file.filename

    try:
        (
            stored_file_name,
            file_path,
            file_size,
        ) = file_service.save_upload_file(
            upload_file=file,
            folder="documents",
            allowed_extensions=ALLOWED_EXTENSIONS,
        )

        document_data = DocumentCreate(
            user_id=current_user.id,

            original_file_name=original_file_name,

            stored_file_name=stored_file_name,

            file_type=file_service.get_file_type(
                original_file_name
            ),

            mime_type=(
                file.content_type
                or "application/octet-stream"
            ),

            file_size=file_size,

            file_path=file_path,
        )

        document = (
            document_service.create_document(
                document_data
            )
        )

        return document

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# ============================================================
# LIST CURRENT USER FILES
# ============================================================

@router.get(
    "",
    response_model=list[DocumentResponse],
)
def list_my_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DocumentService(db)

    return service.get_documents_by_user_id(
        current_user.id
    )


# ============================================================
# PREVIEW / SERVE FILE CONTENT
#
# GET /api/v1/files/{file_id}/content
#
# Used later by Library for:
# - image preview
# - PDF preview
# - audio playback
# ============================================================

@router.get(
    "/{file_id}/content",
)
def get_file_content(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_user_document_or_404(
        db=db,
        user_id=current_user.id,
        file_id=file_id,
    )

    file_path = Path(
        document.file_path
    )

    if (
        not file_path.exists()
        or not file_path.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found",
        )

    return FileResponse(
        path=str(file_path),

        media_type=(
            document.mime_type
            or "application/octet-stream"
        ),
    )


# ============================================================
# DOWNLOAD FILE
#
# GET /api/v1/files/{file_id}/download
#
# Sends the original filename back to browser.
# ============================================================

@router.get(
    "/{file_id}/download",
)
def download_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_user_document_or_404(
        db=db,
        user_id=current_user.id,
        file_id=file_id,
    )

    file_path = Path(
        document.file_path
    )

    if (
        not file_path.exists()
        or not file_path.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found",
        )

    return FileResponse(
        path=str(file_path),

        media_type=(
            document.mime_type
            or "application/octet-stream"
        ),

        filename=document.original_file_name,
    )


# ============================================================
# GET FILE METADATA
#
# GET /api/v1/files/{file_id}
# ============================================================

@router.get(
    "/{file_id}",
    response_model=DocumentResponse,
)
def get_my_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_document_or_404(
        db=db,
        user_id=current_user.id,
        file_id=file_id,
    )


# ============================================================
# DELETE FILE
#
# DELETE /api/v1/files/{file_id}
# ============================================================

@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_file(
    file_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_user_document_or_404(
        db=db,
        user_id=current_user.id,
        file_id=file_id,
    )

    file_path = (
        document.file_path
    )

    document_service = (
        DocumentService(db)
    )

    # --------------------------------------------------------
    # Delete DB record
    # --------------------------------------------------------

    document_service.delete_document(
        document.id
    )

    # --------------------------------------------------------
    # Delete physical file
    #
    # Physical deletion failure must not
    # restore the already-deleted DB record.
    # --------------------------------------------------------

    try:
        FileService().delete_file(
            file_path
        )
    except Exception as error:
        print(
            f"Warning: physical file deletion failed: {error}"
        )

    return None