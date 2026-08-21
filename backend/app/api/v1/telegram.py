import hashlib
import hmac
import time
from typing import Any
from urllib.parse import quote
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.settings import settings
from app.database import get_db
from app.models.caregiver import Caregiver
from app.models.user import User
from app.services.telegram_service import TelegramService


router = APIRouter(
    prefix="/telegram",
    tags=["Telegram"],
)


# ============================================================
# CONSTANTS
# ============================================================

CONNECT_TOKEN_TTL_SECONDS = (
    15 * 60
)

CONNECT_TOKEN_CLOCK_SKEW_SECONDS = (
    60
)


# ============================================================
# RESPONSE SCHEMAS
# ============================================================

class TelegramConnectLinkOut(BaseModel):
    status: str
    connected: bool
    telegram_bot_username: str
    connect_token: str
    connect_url: str
    telegram_chat_id: str | None = None
    caregiver_id: UUID | None = None
    instructions_ar: str
    instructions_en: str


class TelegramSyncOut(BaseModel):
    connected: bool
    status: str
    telegram_chat_id: str | None = None
    caregiver_id: UUID | None = None
    message: str


class TelegramWebhookOut(BaseModel):
    ok: bool
    linked: bool = False
    message: str


# ============================================================
# BOT / SECURITY HELPERS
# ============================================================

def _bot_username() -> str:
    username = (
        getattr(
            settings,
            "TELEGRAM_BOT_USERNAME",
            None,
        )
        or "accessmate_care_alerts_bot"
    )

    return username.lstrip(
        "@"
    )


def _webhook_secret() -> str | None:
    """
    Optional Telegram webhook secret.

    In production, configure TELEGRAM_WEBHOOK_SECRET and pass the
    same value to Telegram's setWebhook(secret_token=...).

    Local-development sync via getUpdates does not require this.
    """

    value = getattr(
        settings,
        "TELEGRAM_WEBHOOK_SECRET",
        None,
    )

    if not value:
        return None

    normalized = str(
        value
    ).strip()

    return (
        normalized
        or None
    )


def _connect_signature(
    user_id: UUID | str,
    issued_at: int,
) -> str:
    user_id_str = str(
        user_id
    )

    secret = (
        settings.SECRET_KEY
        .encode(
            "utf-8"
        )
    )

    message = (
        f"{user_id_str}:{issued_at}"
        .encode(
            "utf-8"
        )
    )

    return (
        hmac.new(
            secret,
            message,
            hashlib.sha256,
        )
        .hexdigest()[:12]
    )


def make_connect_token(
    user_id: UUID | str,
) -> str:
    """
    Create a short-lived Telegram deep-link token.

    Format:
        UUID_timestamp_signature

    The resulting token remains short enough for Telegram's
    /start deep-link payload and expires after 15 minutes.
    """

    issued_at = int(
        time.time()
    )

    signature = (
        _connect_signature(
            user_id=user_id,
            issued_at=issued_at,
        )
    )

    return (
        f"{user_id}_"
        f"{issued_at}_"
        f"{signature}"
    )


def parse_connect_token(
    token: str,
) -> UUID:
    """
    Validate signature and expiry, then return the linked user ID.
    """

    normalized_token = (
        str(
            token
            or ""
        )
        .strip()
    )

    try:
        user_id_str, issued_at_str, signature = (
            normalized_token
            .rsplit(
                "_",
                2,
            )
        )

        user_id = UUID(
            user_id_str
        )

        issued_at = int(
            issued_at_str
        )

    except Exception as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid Telegram connect token."
            ),
        ) from exc

    expected_signature = (
        _connect_signature(
            user_id=user_id,
            issued_at=issued_at,
        )
    )

    if not hmac.compare_digest(
        signature,
        expected_signature,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid Telegram connect token signature."
            ),
        )

    now = int(
        time.time()
    )

    age = (
        now -
        issued_at
    )

    if (
        age <
        -CONNECT_TOKEN_CLOCK_SKEW_SECONDS
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Telegram connect token timestamp is invalid."
            ),
        )

    if (
        age >
        CONNECT_TOKEN_TTL_SECONDS
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Telegram connect token has expired. "
                "Generate a new connection link."
            ),
        )

    return user_id


# ============================================================
# CAREGIVER HELPERS
# ============================================================

def _primary_or_first_caregiver(
    db: Session,
    user_id: UUID,
) -> Caregiver | None:

    caregiver = (
        db.query(
            Caregiver
        )
        .filter(
            Caregiver.user_id
            == user_id
        )
        .filter(
            Caregiver.is_primary.is_(
                True
            )
        )
        .filter(
            Caregiver.is_active.is_(
                True
            )
        )
        .first()
    )

    if caregiver:
        return caregiver

    return (
        db.query(
            Caregiver
        )
        .filter(
            Caregiver.user_id
            == user_id
        )
        .filter(
            Caregiver.is_active.is_(
                True
            )
        )
        .order_by(
            Caregiver.created_at.asc()
        )
        .first()
    )


def _link_chat_id_to_user(
    db: Session,
    user: User,
    telegram_chat_id: str,
    telegram_name: str | None = None,
) -> Caregiver:
    """
    Link a Telegram private-chat ID to the user's primary
    caregiver record.

    If no caregiver exists, create a primary Telegram caregiver.
    """

    normalized_chat_id = (
        str(
            telegram_chat_id
        )
        .strip()
    )

    if not normalized_chat_id:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Telegram chat_id is empty."
            ),
        )

    caregiver = (
        _primary_or_first_caregiver(
            db,
            user.id,
        )
    )

    if caregiver:

        if (
            caregiver.is_primary
            is not True
        ):
            (
                db.query(
                    Caregiver
                )
                .filter(
                    Caregiver.user_id
                    == user.id
                )
                .filter(
                    Caregiver.is_primary.is_(
                        True
                    )
                )
                .filter(
                    Caregiver.id
                    != caregiver.id
                )
                .update({
                    "is_primary":
                        False
                })
            )

            caregiver.is_primary = (
                True
            )

        caregiver.telegram_chat_id = (
            normalized_chat_id
        )

        caregiver.preferred_channel = (
            "telegram"
        )

        caregiver.is_active = (
            True
        )

        if (
            telegram_name
            and not caregiver.full_name
        ):
            caregiver.full_name = (
                telegram_name
            )

        db.add(
            caregiver
        )

    else:

        display_name = (
            telegram_name
            or user.full_name
            or "Telegram caregiver"
        )

        caregiver = Caregiver(
            user_id=(
                user.id
            ),
            full_name=(
                display_name
            ),
            relationship=(
                "Telegram"
            ),
            telegram_chat_id=(
                normalized_chat_id
            ),
            preferred_channel=(
                "telegram"
            ),
            is_primary=(
                True
            ),
            is_active=(
                True
            ),
        )

        db.add(
            caregiver
        )

    # Optional backward compatibility if the users table still
    # contains this legacy column.
    if hasattr(
        user,
        "telegram_chat_id",
    ):
        setattr(
            user,
            "telegram_chat_id",
            normalized_chat_id,
        )

        db.add(
            user
        )

    db.commit()

    db.refresh(
        caregiver
    )

    return caregiver


# ============================================================
# TELEGRAM UPDATE HELPERS
# ============================================================

def _extract_start_token_from_text(
    text: str | None,
) -> str | None:

    if not text:
        return None

    normalized = (
        text.strip()
    )

    if not normalized.startswith(
        "/start"
    ):
        return None

    parts = (
        normalized.split(
            maxsplit=1
        )
    )

    if (
        len(parts)
        < 2
    ):
        return None

    return (
        parts[1]
        .strip()
    )


def _telegram_name(
    from_obj:
        dict[str, Any]
        | None,
) -> str | None:

    if not from_obj:
        return None

    first_name = (
        from_obj.get(
            "first_name"
        )
        or ""
    )

    last_name = (
        from_obj.get(
            "last_name"
        )
        or ""
    )

    username = (
        from_obj.get(
            "username"
        )
    )

    full_name = (
        f"{first_name} {last_name}"
        .strip()
    )

    if full_name:
        return full_name

    if username:
        return (
            f"@{username}"
        )

    return None


def _extract_private_chat_id(
    message:
        dict[str, Any],
) -> str | None:
    """
    Only private Telegram chats may be linked as caregiver
    destinations by this flow.
    """

    chat = (
        message.get(
            "chat"
        )
        or {}
    )

    chat_type = (
        str(
            chat.get(
                "type"
            )
            or ""
        )
        .strip()
        .lower()
    )

    if (
        chat_type
        and chat_type !=
        "private"
    ):
        return None

    chat_id = (
        chat.get(
            "id"
        )
    )

    if (
        chat_id
        is None
    ):
        return None

    return (
        str(
            chat_id
        )
    )


# ============================================================
# CONNECT LINK
# ============================================================

@router.get(
    "/connect-link",
    response_model=(
        TelegramConnectLinkOut
    ),
)
def get_telegram_connect_link(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    bot_username = (
        _bot_username()
    )

    connect_token = (
        make_connect_token(
            current_user.id
        )
    )

    connect_url = (
        f"https://t.me/"
        f"{bot_username}"
        f"?start="
        f"{quote(connect_token)}"
    )

    caregiver = (
        _primary_or_first_caregiver(
            db,
            current_user.id,
        )
    )

    connected = bool(
        caregiver
        and caregiver.telegram_chat_id
        and str(
            caregiver.preferred_channel
            or ""
        )
        .strip()
        .lower()
        == "telegram"
    )

    return TelegramConnectLinkOut(
        status=(
            "connected"
            if connected
            else "not_connected"
        ),
        connected=(
            connected
        ),
        telegram_bot_username=(
            bot_username
        ),
        connect_token=(
            connect_token
        ),
        connect_url=(
            connect_url
        ),
        telegram_chat_id=(
            caregiver.telegram_chat_id
            if caregiver
            else None
        ),
        caregiver_id=(
            caregiver.id
            if caregiver
            else None
        ),
        instructions_ar=(
            "اضغط على رابط الربط، ثم افتح Telegram "
            "واضغط Start. بعد ذلك ارجع للتطبيق "
            "واضغط تحقق من الربط. رابط الربط صالح "
            "لمدة 15 دقيقة."
        ),
        instructions_en=(
            "Open the connect link, then press Start in Telegram. "
            "After that, return to the app and click Check connection. "
            "The connection link expires after 15 minutes."
        ),
    )


# ============================================================
# LOCAL-DEVELOPMENT SYNC
# ============================================================

@router.post(
    "/sync",
    response_model=(
        TelegramSyncOut
    ),
)
def sync_telegram_connection(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Local-development friendly linking step.

    After the user opens the bot deep link and presses Start,
    this endpoint scans Telegram getUpdates and links a valid,
    non-expired /start token belonging to the current user.

    Telegram getUpdates and webhooks are mutually exclusive.
    Use this endpoint for local development when no webhook is set.
    """

    telegram_service = (
        TelegramService()
    )

    ok, updates_or_error = (
        telegram_service
        .get_updates()
    )

    if not ok:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                updates_or_error
            ),
        )

    updates = (
        updates_or_error
        or []
    )

    for update in reversed(
        updates
    ):

        message = (
            update.get(
                "message"
            )
            or update.get(
                "edited_message"
            )
            or {}
        )

        token = (
            _extract_start_token_from_text(
                message.get(
                    "text"
                )
            )
        )

        if not token:
            continue

        try:
            token_user_id = (
                parse_connect_token(
                    token
                )
            )

        except HTTPException:
            # Ignore expired / invalid tokens belonging to old
            # updates and continue scanning for a newer valid one.
            continue

        if (
            token_user_id
            != current_user.id
        ):
            continue

        chat_id = (
            _extract_private_chat_id(
                message
            )
        )

        if not chat_id:
            continue

        caregiver = (
            _link_chat_id_to_user(
                db=db,
                user=current_user,
                telegram_chat_id=(
                    chat_id
                ),
                telegram_name=(
                    _telegram_name(
                        message.get(
                            "from"
                        )
                    )
                ),
            )
        )

        confirmation_ok, confirmation_error = (
            telegram_service
            .send_message(
                chat_id=(
                    chat_id
                ),
                message=(
                    "✅ <b>AccessMate AI connected successfully.</b>\n\n"
                    "تم ربط تنبيهات AccessMate AI بهذا الحساب بنجاح."
                ),
            )
        )

        confirmation_note = (
            ""
            if confirmation_ok
            else (
                " Connection was saved, but the confirmation "
                f"message failed: {confirmation_error}"
            )
        )

        return TelegramSyncOut(
            connected=(
                True
            ),
            status=(
                "connected"
            ),
            telegram_chat_id=(
                chat_id
            ),
            caregiver_id=(
                caregiver.id
            ),
            message=(
                "Telegram connection linked successfully."
                f"{confirmation_note}"
            ),
        )

    return TelegramSyncOut(
        connected=(
            False
        ),
        status=(
            "waiting_for_start"
        ),
        telegram_chat_id=(
            None
        ),
        caregiver_id=(
            None
        ),
        message=(
            "No matching valid /start message was found. "
            "Open a fresh bot connection link, press Start, "
            "then try again."
        ),
    )


# ============================================================
# DISCONNECT
# ============================================================

@router.post(
    "/disconnect",
    response_model=(
        TelegramSyncOut
    ),
)
def disconnect_telegram(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):
    caregiver = (
        _primary_or_first_caregiver(
            db,
            current_user.id,
        )
    )

    if not caregiver:
        return TelegramSyncOut(
            connected=(
                False
            ),
            status=(
                "not_connected"
            ),
            message=(
                "No caregiver record found."
            ),
        )

    caregiver.telegram_chat_id = (
        None
    )

    db.add(
        caregiver
    )

    # Legacy users-table compatibility.
    if hasattr(
        current_user,
        "telegram_chat_id",
    ):
        setattr(
            current_user,
            "telegram_chat_id",
            None,
        )

        db.add(
            current_user
        )

    db.commit()

    db.refresh(
        caregiver
    )

    return TelegramSyncOut(
        connected=(
            False
        ),
        status=(
            "disconnected"
        ),
        telegram_chat_id=(
            None
        ),
        caregiver_id=(
            caregiver.id
        ),
        message=(
            "Telegram connection disconnected."
        ),
    )


# ============================================================
# PRODUCTION WEBHOOK
# ============================================================

@router.post(
    "/webhook",
    response_model=(
        TelegramWebhookOut
    ),
)
def telegram_webhook(
    payload: dict[
        str,
        Any,
    ],
    db: Session = Depends(
        get_db
    ),
    telegram_secret_header:
        str | None = Header(
            default=None,
            alias=(
                "X-Telegram-Bot-Api-Secret-Token"
            ),
        ),
):
    """
    Production Telegram webhook.

    If TELEGRAM_WEBHOOK_SECRET is configured, the same value
    must be supplied to Telegram's setWebhook(secret_token=...).
    Telegram will then send it in
    X-Telegram-Bot-Api-Secret-Token.
    """

    configured_secret = (
        _webhook_secret()
    )

    if configured_secret:

        if (
            not telegram_secret_header
            or not hmac.compare_digest(
                telegram_secret_header,
                configured_secret,
            )
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Invalid Telegram webhook secret."
                ),
            )

    message = (
        payload.get(
            "message"
        )
        or payload.get(
            "edited_message"
        )
        or {}
    )

    token = (
        _extract_start_token_from_text(
            message.get(
                "text"
            )
        )
    )

    if not token:
        return TelegramWebhookOut(
            ok=(
                True
            ),
            linked=(
                False
            ),
            message=(
                "Ignored non-start message."
            ),
        )

    try:
        user_id = (
            parse_connect_token(
                token
            )
        )

    except HTTPException as exc:
        return TelegramWebhookOut(
            ok=(
                True
            ),
            linked=(
                False
            ),
            message=(
                str(
                    exc.detail
                )
            ),
        )

    user = (
        db.query(
            User
        )
        .filter(
            User.id
            == user_id
        )
        .first()
    )

    if not user:
        return TelegramWebhookOut(
            ok=(
                True
            ),
            linked=(
                False
            ),
            message=(
                "User not found for token."
            ),
        )

    chat_id = (
        _extract_private_chat_id(
            message
        )
    )

    if not chat_id:
        return TelegramWebhookOut(
            ok=(
                True
            ),
            linked=(
                False
            ),
            message=(
                "A private Telegram chat_id was not found."
            ),
        )

    caregiver = (
        _link_chat_id_to_user(
            db=db,
            user=user,
            telegram_chat_id=(
                chat_id
            ),
            telegram_name=(
                _telegram_name(
                    message.get(
                        "from"
                    )
                )
            ),
        )
    )

    confirmation_ok, confirmation_error = (
        TelegramService()
        .send_message(
            chat_id=(
                chat_id
            ),
            message=(
                "✅ <b>AccessMate AI connected successfully.</b>\n\n"
                "تم ربط تنبيهات AccessMate AI بهذا الحساب بنجاح."
            ),
        )
    )

    if confirmation_ok:
        confirmation_message = (
            "Telegram chat linked and confirmation sent."
        )
    else:
        confirmation_message = (
            "Telegram chat linked, but confirmation message failed: "
            f"{confirmation_error}"
        )

    return TelegramWebhookOut(
        ok=(
            True
        ),
        linked=(
            True
        ),
        message=(
            f"Linked Telegram chat to caregiver "
            f"{caregiver.id}. "
            f"{confirmation_message}"
        ),
    )
