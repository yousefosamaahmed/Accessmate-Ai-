# backend/app/api/v1/conversations.py

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.conversation_service import ConversationService

from app.schemas.conversation_schema import (
    ConversationCreate,
    ConversationMineCreate,
    ConversationUpdate,
    ConversationResponse,
)

from app.schemas.message_schema import (
    MessageCreate,
    MessageMineCreate,
    MessageUpdate,
    MessageResponse,
)

from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"],
)


# =========================================================
# Helpers
# =========================================================

def get_owned_conversation(
    service: ConversationService,
    conversation_id: UUID,
    current_user: User,
):
    """
    Return a conversation only if it belongs to
    the currently authenticated user.
    """

    try:
        conversation = service.get_conversation_by_id(
            conversation_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    if conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to access "
                "this conversation"
            ),
        )

    return conversation


def get_owned_message(
    service: ConversationService,
    message_id: UUID,
    current_user: User,
):
    """
    Return a message only if its parent conversation
    belongs to the currently authenticated user.
    """

    try:
        message = service.get_message_by_id(
            message_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    get_owned_conversation(
        service=service,
        conversation_id=message.conversation_id,
        current_user=current_user,
    )

    return message


# =========================================================
# Create conversation
#
# Authenticated compatibility endpoint.
# user_id must match current JWT user.
# =========================================================

@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if conversation_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You cannot create a conversation "
                "for another user"
            ),
        )

    service = ConversationService(db)

    try:
        return service.create_conversation(
            conversation_data
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# =========================================================
# Create conversation for current user
#
# Frontend does NOT send user_id.
# It comes from JWT.
# =========================================================

@router.post(
    "/me",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_conversation(
    conversation_data: ConversationMineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    payload = ConversationCreate(
        user_id=current_user.id,
        **conversation_data.model_dump(),
    )

    try:
        return service.create_conversation(
            payload
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# =========================================================
# Get current user's conversations
# =========================================================

@router.get(
    "/me",
    response_model=list[ConversationResponse],
)
def get_my_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    try:
        return service.get_user_conversations(
            current_user.id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Get conversations by user ID
#
# Compatibility endpoint.
# Protected so a user cannot request another
# user's conversation list.
# =========================================================

@router.get(
    "/user/{user_id}",
    response_model=list[ConversationResponse],
)
def get_user_conversations(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not allowed to view another "
                "user's conversations"
            ),
        )

    service = ConversationService(db)

    try:
        return service.get_user_conversations(
            user_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Get conversation by ID
# =========================================================

@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
def get_conversation_by_id(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    return get_owned_conversation(
        service=service,
        conversation_id=conversation_id,
        current_user=current_user,
    )


# =========================================================
# Update conversation
#
# Supports:
# - title
# - conversation_type
# - is_archived
# =========================================================

@router.patch(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
def update_conversation(
    conversation_id: UUID,
    conversation_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_conversation(
        service=service,
        conversation_id=conversation_id,
        current_user=current_user,
    )

    try:
        return service.update_conversation(
            conversation_id,
            conversation_data,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Delete conversation
# =========================================================

@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_conversation(
        service=service,
        conversation_id=conversation_id,
        current_user=current_user,
    )

    try:
        service.delete_conversation(
            conversation_id
        )

        return None

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Add message to current user's conversation
#
# IMPORTANT:
# conversation_id comes from the URL.
# Frontend does NOT send it in the JSON body.
# =========================================================

@router.post(
    "/me/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_my_message_to_conversation(
    conversation_id: UUID,
    message_data: MessageMineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    # Confirm ownership first.
    get_owned_conversation(
        service=service,
        conversation_id=conversation_id,
        current_user=current_user,
    )

    # Convert the frontend-safe payload into the
    # internal MessageCreate schema required by service.
    payload = MessageCreate(
        conversation_id=conversation_id,
        **message_data.model_dump(),
    )

    try:
        return service.add_message_to_conversation(
            payload
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# =========================================================
# Get messages from current user's conversation
# =========================================================

@router.get(
    "/me/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_my_conversation_messages(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_conversation(
        service=service,
        conversation_id=conversation_id,
        current_user=current_user,
    )

    try:
        return service.get_conversation_messages(
            conversation_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Add message
#
# Backward-compatible endpoint.
# conversation_id is explicitly provided in body.
# Still protected by ownership validation.
# =========================================================

@router.post(
    "/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_message_to_conversation(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_conversation(
        service=service,
        conversation_id=message_data.conversation_id,
        current_user=current_user,
    )

    try:
        return service.add_message_to_conversation(
            message_data
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# =========================================================
# Get conversation messages
#
# Backward-compatible protected endpoint.
# =========================================================

@router.get(
    "/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_conversation_messages(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_conversation(
        service=service,
        conversation_id=conversation_id,
        current_user=current_user,
    )

    try:
        return service.get_conversation_messages(
            conversation_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Get message by ID
# =========================================================

@router.get(
    "/messages/{message_id}",
    response_model=MessageResponse,
)
def get_message_by_id(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    return get_owned_message(
        service=service,
        message_id=message_id,
        current_user=current_user,
    )


# =========================================================
# Update message
# =========================================================

@router.patch(
    "/messages/{message_id}",
    response_model=MessageResponse,
)
def update_message(
    message_id: UUID,
    message_data: MessageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_message(
        service=service,
        message_id=message_id,
        current_user=current_user,
    )

    try:
        return service.update_message(
            message_id,
            message_data,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# =========================================================
# Delete message
# =========================================================

@router.delete(
    "/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_message(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ConversationService(db)

    get_owned_message(
        service=service,
        message_id=message_id,
        current_user=current_user,
    )

    try:
        service.delete_message(
            message_id
        )

        return None

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )