from typing import Literal
from uuid import UUID
import re

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.settings import settings
from app.database import get_db
from app.models.user import User

from app.schemas.document_chunk import (
    DocumentChunkResponse,
    DocumentChunkSearchRequest,
    DocumentChunkSearchResult,
)
from app.schemas.document_schema import (
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
)

from app.services.document_chunking_service import (
    DocumentChunkingService,
)
from app.services.document_extraction_service import (
    DocumentExtractionService,
)
from app.services.document_service import DocumentService
from app.services.embedding_service import EmbeddingService
from app.services.file_service import FileService
from app.services.llm_service import LLMService


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


# ============================================================
# CONSTANTS
# ============================================================

SUMMARY_BATCH_MAX_CHARACTERS = 28000

SUMMARY_SOURCE_PREVIEW_LIMIT = 12

MAX_CONVERSATION_HISTORY_MESSAGES = 6

MAX_HISTORY_MESSAGE_CHARACTERS = 2500


# ============================================================
# LOCAL REQUEST / RESPONSE SCHEMAS
# ============================================================


class DocumentPrepareResponse(BaseModel):
    document_id: UUID

    status: str

    file_name: str

    file_type: str

    extracted_characters: int

    chunks_created: int

    chunks_embedded: int

    embedding_provider: str

    embedding_model: str


class DocumentConversationTurn(BaseModel):
    role: Literal[
        "user",
        "assistant",
    ]

    content: str = Field(
        min_length=1,
        max_length=6000,
    )


class DocumentAskRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=4000,
    )

    language: Literal[
        "ar",
        "en",
    ] = "en"

    explanation_level: str = Field(
        default="simple",
        min_length=1,
        max_length=50,
    )

    voice_friendly: bool = True

    limit: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    mode: Literal[
        "auto",
        "summary",
        "rag",
    ] = "auto"

    recent_history: list[
        DocumentConversationTurn
    ] = Field(
        default_factory=list
    )


class DocumentAskSource(BaseModel):
    chunk_id: UUID

    chunk_index: int

    similarity_score: float | None = None

    content: str


class DocumentAskResponse(BaseModel):
    document_id: UUID

    document_name: str

    question: str

    answer: str

    language: str

    mode: Literal[
        "summary",
        "rag",
    ]

    strategy: str

    retrieval_query: str

    used_conversation_history: bool

    retrieved_chunks: int

    source_chunks_used: int

    sources: list[
        DocumentAskSource
    ]

    provider: str

    model: str


# ============================================================
# TEXT SANITIZATION
# ============================================================


def sanitize_extracted_text(
    text: str | None,
) -> str:
    """
    Remove invalid control characters before storing
    extracted text in PostgreSQL.
    """

    if not text:
        return ""

    cleaned_text = text.replace(
        "\x00",
        "",
    )

    cleaned_text = "".join(
        character
        for character in cleaned_text
        if (
            character
            in (
                "\n",
                "\r",
                "\t",
            )
            or ord(character) >= 32
        )
    )

    return cleaned_text.strip()


# ============================================================
# OWNERSHIP
# ============================================================


def get_owned_document(
    document_service: DocumentService,
    document_id: UUID,
    current_user: User,
):
    try:
        document = (
            document_service
            .get_document_by_id(
                document_id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error

    if (
        document.user_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You are not allowed to access "
                "this document"
            ),
        )

    return document


# ============================================================
# AI ERROR HANDLING
# ============================================================


def handle_document_ai_error(
    error: Exception,
):
    error_text = str(
        error
    )

    lower_error = (
        error_text.lower()
    )

    if (
        "ratelimiterror"
        in lower_error
        or "rate_limit"
        in lower_error
        or "too many requests"
        in lower_error
        or "429"
        in lower_error
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_429_TOO_MANY_REQUESTS
            ),
            detail=(
                "AI provider rate limit exceeded. "
                "Please wait and try again."
            ),
        ) from error

    if (
        "authenticationerror"
        in lower_error
        or "invalid_api_key"
        in lower_error
        or "incorrect api key"
        in lower_error
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid AI provider API key."
            ),
        ) from error

    raise HTTPException(
        status_code=(
            status.HTTP_502_BAD_GATEWAY
        ),
        detail=(
            "Document AI service error: "
            f"{error_text}"
        ),
    ) from error


# ============================================================
# SMART QUERY ROUTER
# ============================================================


def normalize_question(
    question: str,
) -> str:
    return re.sub(
        r"\s+",
        " ",
        question
        .strip()
        .lower(),
    )


def is_full_document_summary_request(
    question: str,
) -> bool:
    """
    Detect requests for a summary of the whole document.

    Targeted summaries such as:
    - Summarize page 4
    - Summarize chapter 2
    - لخص الفصل الثاني

    stay in RAG mode.
    """

    normalized = normalize_question(
        question
    )

    summary_terms = [
        "summarize",
        "summarise",
        "summary",
        "overview",
        "main points",
        "key points",
        "important points",
        "brief overview",
        "short summary",
        "لخص",
        "تلخيص",
        "ملخص",
        "اختصر",
        "أهم النقاط",
        "اهم النقاط",
        "النقاط الرئيسية",
        "اعمل ملخص",
        "اعطني ملخص",
        "اديني ملخص",
    ]

    contains_summary_term = any(
        term in normalized
        for term in summary_terms
    )

    if not contains_summary_term:
        return False

    targeted_patterns = [
        r"\bpage\s*\d+\b",
        r"\bchapter\s*\d+\b",
        r"\bsection\s*\d+\b",
        r"\bpart\s*\d+\b",
        r"\bparagraph\s*\d+\b",

        r"صفحة\s*\d+",
        r"الصفحة\s*\d+",
        r"الفصل\s+",
        r"القسم\s+",
        r"الجزء\s+",
        r"الفقرة\s+",
    ]

    for pattern in targeted_patterns:
        if re.search(
            pattern,
            normalized,
        ):
            return False

    document_scope_terms = [
        "this document",
        "the document",
        "entire document",
        "whole document",
        "this file",
        "the file",
        "entire file",
        "whole file",
        "main points",
        "key points",
        "overview",

        "هذا المستند",
        "المستند",
        "الوثيقة",
        "هذا الملف",
        "الملف",
        "كامل الملف",
        "كل الملف",
        "أهم النقاط",
        "اهم النقاط",
        "النقاط الرئيسية",
    ]

    if any(
        term in normalized
        for term in document_scope_terms
    ):
        return True

    word_count = len(
        normalized.split()
    )

    if word_count <= 5:
        return True

    return False


def resolve_query_mode(
    request_data: DocumentAskRequest,
) -> Literal[
    "summary",
    "rag",
]:
    if (
        request_data.mode
        == "summary"
    ):
        return "summary"

    if (
        request_data.mode
        == "rag"
    ):
        return "rag"

    if is_full_document_summary_request(
        request_data.question
    ):
        return "summary"

    return "rag"


# ============================================================
# CONVERSATION-AWARE QUERY REWRITING
# ============================================================


def clean_history_content(
    value: str,
) -> str:
    cleaned = re.sub(
        r"\s+",
        " ",
        str(
            value or ""
        ),
    ).strip()

    return cleaned[
        :MAX_HISTORY_MESSAGE_CHARACTERS
    ]


def build_recent_history_text(
    history: list[
        DocumentConversationTurn
    ],
) -> str:
    """
    Build a short conversation window used ONLY for
    understanding references such as:

    - it
    - that
    - the second one
    - this
    - دي
    - ده
    - التانية

    It is NOT document evidence.
    """

    if not history:
        return ""

    recent_turns = history[
        -MAX_CONVERSATION_HISTORY_MESSAGES:
    ]

    lines: list[str] = []

    for turn in recent_turns:
        content = clean_history_content(
            turn.content
        )

        if not content:
            continue

        role_label = (
            "User"
            if turn.role == "user"
            else "Assistant"
        )

        lines.append(
            f"{role_label}: {content}"
        )

    return "\n".join(
        lines
    )


def clean_rewritten_query(
    value: str,
    fallback: str,
) -> str:
    cleaned = str(
        value or ""
    ).strip()

    if not cleaned:
        return fallback

    cleaned = cleaned.replace(
        "```text",
        "",
    )

    cleaned = cleaned.replace(
        "```",
        "",
    )

    cleaned = cleaned.strip()

    prefixes = [
        "standalone question:",
        "standalone query:",
        "rewritten question:",
        "rewritten query:",
        "question:",
        "query:",
    ]

    lower_cleaned = (
        cleaned.lower()
    )

    for prefix in prefixes:
        if lower_cleaned.startswith(
            prefix
        ):
            cleaned = cleaned[
                len(prefix):
            ].strip()

            break

    cleaned = cleaned.strip(
        "\"'"
    )

    if not cleaned:
        return fallback

    return cleaned[
        :4000
    ]


def rewrite_question_for_retrieval(
    llm_service: LLMService,
    question: str,
    language: Literal[
        "ar",
        "en",
    ],
    recent_history: list[
        DocumentConversationTurn
    ],
) -> tuple[
    str,
    bool,
]:
    """
    Convert a conversational follow-up into a standalone
    retrieval query.

    Example:

    History:
      User: What is the difference between relational and NoSQL?
      Assistant: ...

    Current:
      What about the second one?

    Rewritten:
      What does the document say about NoSQL databases?

    IMPORTANT:
    - History is only used to resolve references.
    - History is never treated as document evidence.
    - If rewriting fails, the original question is used.
    """

    history_text = (
        build_recent_history_text(
            recent_history
        )
    )

    if not history_text:
        return (
            question,
            False,
        )

    system_prompt = """
You rewrite conversational follow-up questions into standalone
search questions for a document retrieval system.

Your only task is to resolve conversational references.

Examples of references:
- it
- that
- this
- the first one
- the second one
- the latter
- the former
- explain it more
- why is that useful
- دي
- ده
- دي ميزتها ايه
- التانية
- اشرحها اكتر

Rules:
1. Use conversation history ONLY to understand what the user is referring to.
2. Do NOT answer the question.
3. Do NOT add facts from your own knowledge.
4. Do NOT treat the assistant's previous answer as factual evidence.
5. Preserve the meaning of the current user question.
6. Keep the rewritten query concise.
7. Make the query understandable without conversation history.
8. Preserve the language of the current user question when practical.
9. If the reference cannot be resolved confidently, return the original question unchanged.
10. Return ONLY the standalone rewritten question.
11. Do not include labels, JSON, markdown, quotes, or explanation.
""".strip()

    user_prompt = f"""
Conversation history:
{history_text}

Current user question:
{question}

Current question language:
{language}
""".strip()

    try:
        rewritten = (
            llm_service
            .generate_response(
                system_prompt=(
                    system_prompt
                ),
                user_prompt=(
                    user_prompt
                ),
                temperature=0.0,
                max_tokens=200,
            )
        )

        cleaned = (
            clean_rewritten_query(
                rewritten,
                question,
            )
        )

        return (
            cleaned,
            cleaned.strip()
            != question.strip(),
        )

    except Exception as error:
        print(
            "Document contextual query rewrite failed; "
            f"using original question. Error: {error}"
        )

        return (
            question,
            False,
        )


# ============================================================
# SUMMARY HELPERS
# ============================================================


def build_summary_batches(
    chunks,
    max_characters: int = (
        SUMMARY_BATCH_MAX_CHARACTERS
    ),
) -> list[str]:
    ordered_chunks = sorted(
        chunks,
        key=lambda item: (
            item.chunk_index
        ),
    )

    batches: list[str] = []

    current_parts: list[str] = []

    current_length = 0

    for chunk in ordered_chunks:
        chunk_text = (
            f"[Chunk {chunk.chunk_index}]\n"
            f"{chunk.content}"
        )

        chunk_length = len(
            chunk_text
        )

        if (
            current_parts
            and (
                current_length
                + chunk_length
                > max_characters
            )
        ):
            batches.append(
                "\n\n".join(
                    current_parts
                )
            )

            current_parts = []

            current_length = 0

        current_parts.append(
            chunk_text
        )

        current_length += (
            chunk_length
        )

    if current_parts:
        batches.append(
            "\n\n".join(
                current_parts
            )
        )

    return batches


def summarize_document_chunks(
    llm_service: LLMService,
    chunks,
    document_name: str,
    request_data: DocumentAskRequest,
) -> str:
    """
    Hierarchical whole-document summarization.

    Small document:
        all chunks -> one LLM call

    Large document:
        all chunks
          -> batch summaries
          -> final synthesis
    """

    batches = build_summary_batches(
        chunks
    )

    if not batches:
        raise ValueError(
            "Document has no readable chunks "
            "to summarize"
        )

    # --------------------------------------------------------
    # SMALL DOCUMENT
    # --------------------------------------------------------

    if len(batches) == 1:
        message = f"""
{request_data.question}

Create a complete summary of the document "{document_name}".

Requirements:
- Cover the document as a whole.
- Preserve important definitions, facts, concepts,
  examples, relationships, and conclusions.
- Do not invent information that is not present.
- Give priority to the most important information.
- Keep the structure clear and easy to understand.
""".strip()

        return (
            llm_service
            .accessibility_chat(
                message=message,
                language=(
                    request_data.language
                ),
                explanation_level=(
                    request_data
                    .explanation_level
                ),
                voice_friendly=(
                    request_data
                    .voice_friendly
                ),
                extra_context=(
                    batches[0]
                ),
            )
        )

    # --------------------------------------------------------
    # LARGE DOCUMENT — MAP
    # --------------------------------------------------------

    partial_summaries: list[str] = []

    for (
        batch_index,
        batch_context,
    ) in enumerate(
        batches,
        start=1,
    ):
        partial_summary = (
            llm_service
            .accessibility_chat(
                message=(
                    f"Summarize part "
                    f"{batch_index} of "
                    f"{len(batches)} from the "
                    f'document "{document_name}". '
                    "Preserve important facts, "
                    "definitions, concepts, examples, "
                    "relationships, and conclusions. "
                    "Do not add information that is "
                    "not present in the provided text."
                ),
                language=(
                    request_data.language
                ),
                explanation_level=(
                    request_data
                    .explanation_level
                ),
                voice_friendly=(
                    request_data
                    .voice_friendly
                ),
                extra_context=(
                    batch_context
                ),
            )
        )

        partial_summaries.append(
            (
                f"[Document section summary "
                f"{batch_index}]\n"
                f"{partial_summary}"
            )
        )

    # --------------------------------------------------------
    # LARGE DOCUMENT — REDUCE
    # --------------------------------------------------------

    combined_summaries = (
        "\n\n"
        "===================="
        "\n\n"
    ).join(
        partial_summaries
    )

    final_message = f"""
{request_data.question}

You are now creating the final summary of the entire
document "{document_name}".

The context contains summaries of every processed part
of the document.

Create one coherent final summary.

Requirements:
- Represent the whole document, not only one section.
- Merge duplicate information.
- Preserve important facts and definitions.
- Preserve meaningful examples where useful.
- Organize related ideas together.
- Do not invent missing information.
- Do not mention the internal batching process.
""".strip()

    return (
        llm_service
        .accessibility_chat(
            message=final_message,
            language=(
                request_data.language
            ),
            explanation_level=(
                request_data
                .explanation_level
            ),
            voice_friendly=(
                request_data
                .voice_friendly
            ),
            extra_context=(
                combined_summaries
            ),
        )
    )


def build_summary_source_preview(
    chunks,
) -> list[
    DocumentAskSource
]:
    ordered_chunks = sorted(
        chunks,
        key=lambda item: (
            item.chunk_index
        ),
    )

    preview_chunks = ordered_chunks[
        :SUMMARY_SOURCE_PREVIEW_LIMIT
    ]

    return [
        DocumentAskSource(
            chunk_id=(
                chunk.id
            ),
            chunk_index=(
                chunk.chunk_index
            ),
            similarity_score=None,
            content=(
                chunk.content
            ),
        )
        for chunk
        in preview_chunks
    ]


# ============================================================
# CREATE DOCUMENT
# ============================================================


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    document_data: DocumentCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    document_data.user_id = (
        current_user.id
    )

    try:
        return (
            service.create_document(
                document_data
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# CREATE MY DOCUMENT
# ============================================================


@router.post(
    "/me",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_document(
    document_data: DocumentCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    document_data.user_id = (
        current_user.id
    )

    try:
        return (
            service.create_document(
                document_data
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# UPLOAD
# ============================================================


@router.post(
    "/me/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_my_document(
    file: UploadFile = File(
        ...
    ),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    file_service = (
        FileService()
    )

    allowed_extensions = [
        ".pdf",
        ".txt",
        ".docx",
        ".csv",
    ]

    try:
        (
            stored_file_name,
            file_path,
            file_size,
        ) = (
            file_service
            .save_upload_file(
                upload_file=file,
                folder="documents",
                allowed_extensions=(
                    allowed_extensions
                ),
            )
        )

        document_data = (
            DocumentCreate(
                user_id=(
                    current_user.id
                ),
                original_file_name=(
                    file.filename
                ),
                stored_file_name=(
                    stored_file_name
                ),
                file_type=(
                    file_service
                    .get_file_type(
                        file.filename
                    )
                ),
                mime_type=(
                    file.content_type
                    or (
                        "application/"
                        "octet-stream"
                    )
                ),
                file_size=(
                    file_size
                ),
                file_path=(
                    file_path
                ),
            )
        )

        return (
            document_service
            .create_document(
                document_data
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# GET MY DOCUMENTS
# ============================================================


@router.get(
    "/me",
    response_model=list[
        DocumentResponse
    ],
)
def get_my_documents(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    try:
        return (
            service
            .get_documents_by_user_id(
                current_user.id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# GET DOCUMENTS BY USER
# ============================================================


@router.get(
    "/user/{user_id}",
    response_model=list[
        DocumentResponse
    ],
)
def get_documents_by_user_id(
    user_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    if (
        user_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You are not allowed to "
                "access these documents"
            ),
        )

    service = DocumentService(
        db
    )

    try:
        return (
            service
            .get_documents_by_user_id(
                user_id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# EXTRACT
# ============================================================


@router.post(
    "/me/{document_id}/extract-text",
    response_model=DocumentResponse,
)
def extract_my_document_text(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    extraction_service = (
        DocumentExtractionService()
    )

    document = get_owned_document(
        document_service,
        document_id,
        current_user,
    )

    try:
        if not extraction_service.is_supported(
            document.file_type
        ):
            raise ValueError(
                "Text extraction is not "
                "supported for file type: "
                f"{document.file_type}"
            )

        document_service.mark_document_processing(
            document.id
        )

        extracted_text = (
            extraction_service
            .extract_text(
                file_path=(
                    document.file_path
                ),
                file_type=(
                    document.file_type
                ),
            )
        )

        extracted_text = (
            sanitize_extracted_text(
                extracted_text
            )
        )

        if not extracted_text:
            raise ValueError(
                "No readable text was extracted "
                "from this document"
            )

        return (
            document_service
            .mark_document_extracted(
                document_id=(
                    document.id
                ),
                extracted_text=(
                    extracted_text
                ),
                detected_language=(
                    "unknown"
                ),
            )
        )

    except ValueError as error:
        db.rollback()

        try:
            document_service.mark_document_failed(
                document.id
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# CHUNK
# ============================================================


@router.post(
    "/me/{document_id}/chunk",
    response_model=list[
        DocumentChunkResponse
    ],
    status_code=status.HTTP_201_CREATED,
)
def chunk_my_document(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    chunking_service = (
        DocumentChunkingService()
    )

    document = get_owned_document(
        document_service,
        document_id,
        current_user,
    )

    try:
        if not document.extracted_text:
            raise ValueError(
                "Document has no extracted text. "
                "Extract text before chunking."
            )

        (
            document_service
            .chunk_repository
            .delete_chunks_by_document_id(
                document.id
            )
        )

        chunks_data = (
            chunking_service
            .build_document_chunks(
                document_id=(
                    document.id
                ),
                text=(
                    document.extracted_text
                ),
            )
        )

        if not chunks_data:
            raise ValueError(
                "No chunks were generated "
                "from document text"
            )

        return (
            document_service
            .create_document_chunks(
                chunks_data
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# EMBED
# ============================================================


@router.post(
    "/me/{document_id}/embed",
    response_model=list[
        DocumentChunkResponse
    ],
)
def embed_my_document_chunks(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    embedding_service = (
        EmbeddingService()
    )

    document = get_owned_document(
        document_service,
        document_id,
        current_user,
    )

    try:
        chunks = (
            document_service
            .get_document_chunks(
                document.id
            )
        )

        if not chunks:
            raise ValueError(
                "Document has no chunks. "
                "Chunk the document before embedding."
            )

        embedded_chunks = []

        for chunk in chunks:
            (
                embedding_id,
                embedding_vector,
                embedding_metadata,
            ) = (
                embedding_service
                .generate_embedding_payload(
                    chunk.content
                )
            )

            combined_metadata = {
                **(
                    chunk.metadata_json
                    or {}
                ),
                **embedding_metadata,
            }

            updated_chunk = (
                document_service
                .update_chunk_embedding(
                    chunk=chunk,
                    embedding_id=(
                        embedding_id
                    ),
                    embedding_vector=(
                        embedding_vector
                    ),
                    metadata_json=(
                        combined_metadata
                    ),
                )
            )

            embedded_chunks.append(
                updated_chunk
            )

        document_service.mark_document_indexed(
            document.id
        )

        return embedded_chunks

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# PREPARE — EXTRACT + CHUNK + EMBED
# ============================================================


@router.post(
    "/me/{document_id}/prepare",
    response_model=DocumentPrepareResponse,
)
def prepare_my_document(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    extraction_service = (
        DocumentExtractionService()
    )

    chunking_service = (
        DocumentChunkingService()
    )

    embedding_service = (
        EmbeddingService()
    )

    document = get_owned_document(
        document_service,
        document_id,
        current_user,
    )

    try:
        if not extraction_service.is_supported(
            document.file_type
        ):
            raise ValueError(
                "Document preparation is not "
                "supported for file type: "
                f"{document.file_type}"
            )

        document_service.mark_document_processing(
            document.id
        )

        extracted_text = (
            extraction_service
            .extract_text(
                file_path=(
                    document.file_path
                ),
                file_type=(
                    document.file_type
                ),
            )
        )

        extracted_text = (
            sanitize_extracted_text(
                extracted_text
            )
        )

        if not extracted_text:
            raise ValueError(
                "No readable text was extracted "
                "from this document. "
                "If this is a scanned PDF, OCR "
                "processing may be required."
            )

        document_service.mark_document_extracted(
            document_id=(
                document.id
            ),
            extracted_text=(
                extracted_text
            ),
            detected_language=(
                "unknown"
            ),
        )

        (
            document_service
            .chunk_repository
            .delete_chunks_by_document_id(
                document.id
            )
        )

        chunks_data = (
            chunking_service
            .build_document_chunks(
                document_id=(
                    document.id
                ),
                text=(
                    extracted_text
                ),
            )
        )

        if not chunks_data:
            raise ValueError(
                "No document chunks "
                "were generated"
            )

        chunks = (
            document_service
            .create_document_chunks(
                chunks_data
            )
        )

        embedded_count = 0

        for chunk in chunks:
            (
                embedding_id,
                embedding_vector,
                embedding_metadata,
            ) = (
                embedding_service
                .generate_embedding_payload(
                    chunk.content
                )
            )

            combined_metadata = {
                **(
                    chunk.metadata_json
                    or {}
                ),
                **embedding_metadata,
            }

            (
                document_service
                .update_chunk_embedding(
                    chunk=chunk,
                    embedding_id=(
                        embedding_id
                    ),
                    embedding_vector=(
                        embedding_vector
                    ),
                    metadata_json=(
                        combined_metadata
                    ),
                )
            )

            embedded_count += 1

        document_service.mark_document_indexed(
            document.id
        )

        return DocumentPrepareResponse(
            document_id=(
                document.id
            ),
            status="indexed",
            file_name=(
                document.original_file_name
            ),
            file_type=(
                document.file_type
            ),
            extracted_characters=(
                len(
                    extracted_text
                )
            ),
            chunks_created=(
                len(
                    chunks
                )
            ),
            chunks_embedded=(
                embedded_count
            ),
            embedding_provider=(
                embedding_service.provider
            ),
            embedding_model=(
                embedding_service.model_name
            ),
        )

    except HTTPException:
        raise

    except ValueError as error:
        db.rollback()

        try:
            document_service.mark_document_failed(
                document.id
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error

    except Exception as error:
        db.rollback()

        try:
            document_service.mark_document_failed(
                document.id
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Failed to prepare document: "
                f"{str(error)}"
            ),
        ) from error


# ============================================================
# VECTOR SEARCH
# ============================================================


@router.post(
    "/me/{document_id}/search",
    response_model=list[
        DocumentChunkSearchResult
    ],
)
def search_my_document_chunks(
    document_id: UUID,
    search_data: DocumentChunkSearchRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    embedding_service = (
        EmbeddingService()
    )

    document = get_owned_document(
        document_service,
        document_id,
        current_user,
    )

    try:
        query_vector = (
            embedding_service
            .generate_embedding(
                search_data.query
            )
        )

        results = (
            document_service
            .search_document_chunks(
                document_id=(
                    document.id
                ),
                query_vector=(
                    query_vector
                ),
                limit=(
                    search_data.limit
                ),
            )
        )

        search_results = []

        for (
            chunk,
            distance,
        ) in results:
            similarity_score = (
                1
                - float(
                    distance
                )
            )

            search_results.append(
                DocumentChunkSearchResult(
                    id=(
                        chunk.id
                    ),
                    document_id=(
                        chunk.document_id
                    ),
                    chunk_index=(
                        chunk.chunk_index
                    ),
                    content=(
                        chunk.content
                    ),
                    embedding_id=(
                        chunk.embedding_id
                    ),
                    metadata_json=(
                        chunk.metadata_json
                    ),
                    created_at=(
                        chunk.created_at
                    ),
                    distance=(
                        float(
                            distance
                        )
                    ),
                    similarity_score=(
                        similarity_score
                    ),
                )
            )

        return search_results

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# ASK DOCUMENT — CONVERSATION-AWARE RAG
# ============================================================


@router.post(
    "/me/{document_id}/ask",
    response_model=DocumentAskResponse,
)
def ask_my_document(
    document_id: UUID,
    request_data: DocumentAskRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    document_service = (
        DocumentService(
            db
        )
    )

    embedding_service = (
        EmbeddingService()
    )

    llm_service = (
        LLMService()
    )

    document = get_owned_document(
        document_service,
        document_id,
        current_user,
    )

    question = (
        request_data
        .question
        .strip()
    )

    if not question:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Document question is required"
            ),
        )

    try:
        # ----------------------------------------------------
        # LOAD DOCUMENT CHUNKS
        # ----------------------------------------------------

        chunks = (
            document_service
            .get_document_chunks(
                document.id
            )
        )

        if not chunks:
            raise ValueError(
                "Document has not been prepared yet. "
                "Run the prepare endpoint first."
            )

        # ----------------------------------------------------
        # CHECK EMBEDDINGS
        # ----------------------------------------------------

        missing_embeddings = [
            chunk
            for chunk in chunks
            if not chunk.embedding_id
        ]

        if missing_embeddings:
            raise ValueError(
                "Some document chunks do not have "
                "embeddings. Run the prepare "
                "endpoint again."
            )

        # ----------------------------------------------------
        # SMART ROUTER
        # ----------------------------------------------------

        query_mode = (
            resolve_query_mode(
                request_data
            )
        )

        # ====================================================
        # MODE 1 — WHOLE DOCUMENT SUMMARY
        # ====================================================

        if (
            query_mode
            == "summary"
        ):
            answer = (
                summarize_document_chunks(
                    llm_service=(
                        llm_service
                    ),
                    chunks=(
                        chunks
                    ),
                    document_name=(
                        document
                        .original_file_name
                    ),
                    request_data=(
                        request_data
                    ),
                )
            )

            if not answer:
                raise ValueError(
                    "AI returned an empty "
                    "document summary"
                )

            source_preview = (
                build_summary_source_preview(
                    chunks
                )
            )

            return DocumentAskResponse(
                document_id=(
                    document.id
                ),
                document_name=(
                    document
                    .original_file_name
                ),
                question=(
                    question
                ),
                answer=(
                    answer
                ),
                language=(
                    request_data.language
                ),
                mode="summary",
                strategy=(
                    "hierarchical_full_"
                    "document_summary"
                ),
                retrieval_query=(
                    question
                ),
                used_conversation_history=False,
                retrieved_chunks=(
                    len(
                        chunks
                    )
                ),
                source_chunks_used=(
                    len(
                        chunks
                    )
                ),
                sources=(
                    source_preview
                ),
                provider=(
                    settings.AI_PROVIDER
                ),
                model=(
                    settings.AI_MODEL
                ),
            )

        # ====================================================
        # MODE 2 — CONVERSATION-AWARE VECTOR RAG
        # ====================================================

        (
            retrieval_query,
            used_history,
        ) = (
            rewrite_question_for_retrieval(
                llm_service=(
                    llm_service
                ),
                question=(
                    question
                ),
                language=(
                    request_data.language
                ),
                recent_history=(
                    request_data
                    .recent_history
                ),
            )
        )

        # ----------------------------------------------------
        # EMBED THE RESOLVED STANDALONE QUERY
        # ----------------------------------------------------

        query_vector = (
            embedding_service
            .generate_embedding(
                retrieval_query
            )
        )

        # ----------------------------------------------------
        # VECTOR RETRIEVAL
        # ----------------------------------------------------

        results = (
            document_service
            .search_document_chunks(
                document_id=(
                    document.id
                ),
                query_vector=(
                    query_vector
                ),
                limit=(
                    request_data.limit
                ),
            )
        )

        if not results:
            raise ValueError(
                "No relevant document chunks "
                "were found"
            )

        context_parts = []

        source_items = []

        for (
            chunk,
            distance,
        ) in results:
            distance_value = (
                float(
                    distance
                )
            )

            similarity_score = (
                1
                - distance_value
            )

            context_parts.append(
                (
                    "[Document: "
                    f"{document.original_file_name}"
                    "]\n"
                    "[Chunk: "
                    f"{chunk.chunk_index}"
                    "]\n"
                    "[Similarity: "
                    f"{similarity_score:.4f}"
                    "]\n"
                    f"{chunk.content}"
                )
            )

            source_items.append(
                DocumentAskSource(
                    chunk_id=(
                        chunk.id
                    ),
                    chunk_index=(
                        chunk.chunk_index
                    ),
                    similarity_score=(
                        similarity_score
                    ),
                    content=(
                        chunk.content
                    ),
                )
            )

        document_context = (
            "\n\n"
            "--------------------"
            "\n\n"
        ).join(
            context_parts
        )

        # ----------------------------------------------------
        # FINAL GROUNDED ANSWER
        #
        # IMPORTANT:
        #
        # Conversation history is NOT included here as
        # evidence.
        #
        # The final answer receives only retrieved document
        # chunks.
        #
        # The rewritten query is only used to clarify what
        # the user meant.
        # ----------------------------------------------------

        answer_message = f"""
Original user question:
{question}

Resolved meaning for document retrieval:
{retrieval_query}

Answer the original user question.

Use the resolved meaning only to understand references
such as "it", "that", "the second one", "دي", "ده",
or similar expressions.

Base factual claims only on the provided document context.

If the document context does not contain enough
information, say that clearly.
""".strip()

        answer = (
            llm_service
            .accessibility_chat(
                message=(
                    answer_message
                ),
                language=(
                    request_data.language
                ),
                explanation_level=(
                    request_data
                    .explanation_level
                ),
                voice_friendly=(
                    request_data
                    .voice_friendly
                ),
                extra_context=(
                    document_context
                ),
            )
        )

        if not answer:
            raise ValueError(
                "AI returned an empty "
                "document answer"
            )

        return DocumentAskResponse(
            document_id=(
                document.id
            ),
            document_name=(
                document
                .original_file_name
            ),
            question=(
                question
            ),
            answer=(
                answer
            ),
            language=(
                request_data.language
            ),
            mode="rag",
            strategy=(
                "conversation_aware_"
                "vector_rag"
            ),
            retrieval_query=(
                retrieval_query
            ),
            used_conversation_history=(
                used_history
            ),
            retrieved_chunks=(
                len(
                    source_items
                )
            ),
            source_chunks_used=(
                len(
                    source_items
                )
            ),
            sources=(
                source_items
            ),
            provider=(
                settings.AI_PROVIDER
            ),
            model=(
                settings.AI_MODEL
            ),
        )

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error

    except Exception as error:
        handle_document_ai_error(
            error
        )


# ============================================================
# GET ONE DOCUMENT
# ============================================================


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document_by_id(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    return get_owned_document(
        service,
        document_id,
        current_user,
    )


# ============================================================
# UPDATE DOCUMENT
# ============================================================


@router.patch(
    "/{document_id}",
    response_model=DocumentResponse,
)
def update_document(
    document_id: UUID,
    document_data: DocumentUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        return (
            service.update_document(
                document_id,
                document_data,
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# MARK PROCESSING
# ============================================================


@router.patch(
    "/{document_id}/processing",
    response_model=DocumentResponse,
)
def mark_document_processing(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        return (
            service
            .mark_document_processing(
                document_id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# MARK EXTRACTED
# ============================================================


@router.patch(
    "/{document_id}/extracted",
    response_model=DocumentResponse,
)
def mark_document_extracted(
    document_id: UUID,
    extracted_text: str,
    detected_language: str = "unknown",
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        extracted_text = (
            sanitize_extracted_text(
                extracted_text
            )
        )

        if not extracted_text:
            raise ValueError(
                "No readable text was provided"
            )

        return (
            service
            .mark_document_extracted(
                document_id,
                extracted_text,
                detected_language,
            )
        )

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        ) from error


# ============================================================
# MARK INDEXED
# ============================================================


@router.patch(
    "/{document_id}/indexed",
    response_model=DocumentResponse,
)
def mark_document_indexed(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        return (
            service
            .mark_document_indexed(
                document_id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# MARK FAILED
# ============================================================


@router.patch(
    "/{document_id}/failed",
    response_model=DocumentResponse,
)
def mark_document_failed(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        return (
            service
            .mark_document_failed(
                document_id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# GET CHUNKS
# ============================================================


@router.get(
    "/{document_id}/chunks",
    response_model=list[
        DocumentChunkResponse
    ],
)
def get_document_chunks(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        return (
            service
            .get_document_chunks(
                document_id
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error


# ============================================================
# DELETE
# ============================================================


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    document_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = DocumentService(
        db
    )

    get_owned_document(
        service,
        document_id,
        current_user,
    )

    try:
        service.delete_document(
            document_id
        )

        return None

    except ValueError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(error),
        ) from error