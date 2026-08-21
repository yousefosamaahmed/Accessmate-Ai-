import logging
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.extension_event_schema import (
    ExtensionEventCreate,
    ExtensionEventResponse,
)
from app.services.extension_service import ExtensionService


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/extension",
    tags=["Extension"],
)


# ============================================================
# HELPERS
# ============================================================


def build_owned_event_data(
    event_data: ExtensionEventCreate,
    current_user: User,
) -> ExtensionEventCreate:
    """
    Force extension events to belong to the authenticated user.

    Any user_id coming from the client is ignored and replaced
    with current_user.id.
    """

    return event_data.model_copy(
        update={
            "user_id": current_user.id,
        }
    )


def log_event_for_current_user(
    event_data: ExtensionEventCreate,
    current_user: User,
    db: Session,
) -> ExtensionEventResponse:
    """
    Shared implementation used by both the current and legacy
    event-logging endpoints.
    """

    service = ExtensionService(
        db
    )

    owned_event_data = (
        build_owned_event_data(
            event_data=event_data,
            current_user=current_user,
        )
    )

    try:
        return service.log_event(
            owned_event_data
        )

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(error),
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to log browser extension event."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Extension event could not be saved."
            ),
        )


# ============================================================
# LOG EXTENSION EVENT
# ============================================================


@router.post(
    "/me/events",
    response_model=ExtensionEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_my_extension_event(
    event_data: ExtensionEventCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    """
    Preferred authenticated endpoint for the browser extension.
    """

    return log_event_for_current_user(
        event_data=event_data,
        current_user=current_user,
        db=db,
    )


# ============================================================
# LEGACY EVENT ENDPOINT
# ============================================================


@router.post(
    "/events",
    response_model=ExtensionEventResponse,
    status_code=status.HTTP_201_CREATED,
    deprecated=True,
)
def log_extension_event(
    event_data: ExtensionEventCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    """
    Backward-compatible endpoint.

    It is now authenticated and always forces ownership to the
    current user.

    New extension code should use:
        POST /api/v1/extension/me/events
    """

    return log_event_for_current_user(
        event_data=event_data,
        current_user=current_user,
        db=db,
    )


# ============================================================
# CURRENT USER EVENT HISTORY
# ============================================================


@router.get(
    "/me/events",
    response_model=list[
        ExtensionEventResponse
    ],
)
def get_my_extension_events(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    service = ExtensionService(
        db
    )

    try:
        return service.get_user_events(
            current_user.id
        )

    except ValueError:
        # An empty history is valid.
        return []

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to retrieve browser extension events."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Extension event history could not be loaded."
            ),
        )


# ============================================================
# LEGACY USER EVENT HISTORY
# ============================================================


@router.get(
    "/users/{user_id}/events",
    response_model=list[
        ExtensionEventResponse
    ],
    deprecated=True,
)
def get_user_extension_events(
    user_id: UUID,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    """
    Backward-compatible endpoint.

    Users are allowed to request only their own extension events.
    """

    if user_id != current_user.id:
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You are not allowed to access "
                "another user's extension events."
            ),
        )

    service = ExtensionService(
        db
    )

    try:
        return service.get_user_events(
            current_user.id
        )

    except ValueError:
        return []

    except Exception:
        db.rollback()

        logger.exception(
            "Failed to retrieve browser extension events."
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Extension event history could not be loaded."
            ),
        )