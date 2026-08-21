from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.care_alert import CareAlert
from app.models.caregiver import Caregiver
from app.models.daily_need_action import DailyNeedAction
from app.models.user import User
from app.schemas.care_alert import CareAlertCreate, CareAlertOut
from app.services.telegram_service import TelegramService


router = APIRouter(
    prefix="/care-alerts",
    tags=["Care Alerts"],
)


# ============================================================
# HELPERS
# ============================================================

def normalize_language(
    language: str | None,
) -> str:
    if not language:
        return "ar"

    language = language.lower().strip()

    return (
        "en"
        if language.startswith("en")
        else "ar"
    )


def personalize_alert_message(
    message: str,
    user_display_name: str | None = None,
) -> str:
    if not user_display_name:
        return message

    replacements = {
        "المستخدم": user_display_name,
        "The user": user_display_name,
        "the user": user_display_name,
    }

    personalized = message

    for old_value, new_value in replacements.items():
        personalized = personalized.replace(
            old_value,
            new_value,
        )

    return personalized


def build_alert_message(
    action: DailyNeedAction,
    language: str = "ar",
    user_display_name: str | None = None,
) -> str:
    language = normalize_language(
        language
    )

    if language == "en":
        return personalize_alert_message(
            action.default_message_en,
            user_display_name=user_display_name,
        )

    return personalize_alert_message(
        action.default_message_ar,
        user_display_name=user_display_name,
    )


def get_risk_label_ar(
    risk_level: str,
) -> str:
    risk_labels = {
        "low": "منخفضة",
        "medium": "متوسطة",
        "high": "عالية",
        "emergency": "طارئة",
    }

    return risk_labels.get(
        risk_level,
        risk_level,
    )


def get_risk_label_en(
    risk_level: str,
) -> str:
    risk_labels = {
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "emergency": "Emergency",
    }

    return risk_labels.get(
        risk_level,
        risk_level,
    )


def get_source_label(
    source: str,
    language: str = "ar",
) -> str:
    language = normalize_language(
        language
    )

    labels_ar = {
        "careboard": "لوحة الاحتياجات اليومية",
        "hearing_assistant": "مساعد السمع",
        "camera": "الكاميرا",
        "workspace": "مساحة العمل",
        "voice": "المساعد الصوتي",
    }

    labels_en = {
        "careboard": "Daily Needs Board",
        "hearing_assistant": "Hearing Assistant",
        "camera": "Camera",
        "workspace": "AI Workspace",
        "voice": "Voice Assistant",
    }

    if language == "en":
        return labels_en.get(
            source,
            source,
        )

    return labels_ar.get(
        source,
        source,
    )


def build_telegram_message(
    alert: CareAlert,
    action: DailyNeedAction | None = None,
    source: str = "careboard",
    language: str = "ar",
    account_name: str | None = None,
) -> str:
    language = normalize_language(
        language
    )

    if language == "ar":
        account_name = (
            account_name
            or "صاحب الحساب"
        )

        need_name = (
            getattr(
                action,
                "name_ar",
                None,
            )
            or getattr(
                action,
                "name_en",
                None,
            )
            or alert.intent
            or "طلب رعاية"
        )

        risk_label = (
            get_risk_label_ar(
                alert.risk_level
            )
        )

        source_label = (
            get_source_label(
                source,
                language="ar",
            )
        )

        if (
            alert.risk_level
            == "emergency"
        ):
            title = (
                "<b>تنبيه طارئ من AccessMate AI</b>"
            )

            opening_line = (
                "<b>يرجى التدخل فورًا.</b>\n\n"
            )

        elif (
            alert.risk_level
            == "high"
        ):
            title = (
                "<b>تنبيه مهم من AccessMate AI</b>"
            )

            opening_line = (
                "يرجى الاطمئنان على صاحب الحساب "
                "في أسرع وقت.\n\n"
            )

        elif (
            alert.risk_level
            == "medium"
        ):
            title = (
                "<b>تنبيه رعاية من AccessMate AI</b>"
            )

            opening_line = (
                "يرجى مراجعة الطلب والاطمئنان "
                "على صاحب الحساب.\n\n"
            )

        else:
            title = (
                "<b>تنبيه من AccessMate AI</b>"
            )

            opening_line = ""

        return (
            f"{title}\n\n"
            f"<b>صاحب الحساب:</b> {account_name}\n\n"
            f"{alert.message}\n\n"
            f"{opening_line}"
            f"<b>الاحتياج:</b> {need_name}\n"
            f"<b>درجة الخطورة:</b> {risk_label}\n"
            f"<b>المصدر:</b> {source_label}\n"
            f"<b>الحالة:</b> تم الإرسال"
        )

    account_name = (
        account_name
        or "Account owner"
    )

    need_name = (
        getattr(
            action,
            "name_en",
            None,
        )
        or getattr(
            action,
            "name_ar",
            None,
        )
        or alert.intent
        or "Care request"
    )

    risk_label = (
        get_risk_label_en(
            alert.risk_level
        )
    )

    source_label = (
        get_source_label(
            source,
            language="en",
        )
    )

    if (
        alert.risk_level
        == "emergency"
    ):
        title = (
            "<b>Emergency Alert from AccessMate AI</b>"
        )

        opening_line = (
            "<b>Immediate attention is required.</b>\n\n"
        )

    elif (
        alert.risk_level
        == "high"
    ):
        title = (
            "<b>Important Alert from AccessMate AI</b>"
        )

        opening_line = (
            "Please check on the account owner "
            "as soon as possible.\n\n"
        )

    elif (
        alert.risk_level
        == "medium"
    ):
        title = (
            "<b>Care Alert from AccessMate AI</b>"
        )

        opening_line = (
            "Please review the request and check "
            "on the account owner.\n\n"
        )

    else:
        title = (
            "<b>AccessMate AI Alert</b>"
        )

        opening_line = ""

    return (
        f"{title}\n\n"
        f"<b>Account owner:</b> {account_name}\n\n"
        f"{alert.message}\n\n"
        f"{opening_line}"
        f"<b>Need:</b> {need_name}\n"
        f"<b>Risk level:</b> {risk_label}\n"
        f"<b>Source:</b> {source_label}\n"
        f"<b>Status:</b> Sent"
    )


def send_alert_if_telegram(
    db: Session,
    alert: CareAlert,
    caregiver: Caregiver | None,
    action: DailyNeedAction | None = None,
    source: str = "careboard",
    user_display_name: str | None = None,
    language: str = "ar",
) -> CareAlert:
    """
    Send a Telegram message when the selected caregiver uses
    Telegram as the preferred channel.

    Lifecycle after this function:

    successful Telegram delivery:
        pending -> sent

    failed Telegram delivery:
        pending -> failed

    another preferred channel:
        stays pending

    Telegram transport exceptions are converted into a failed
    CareAlert instead of crashing the whole API request.
    """

    language = normalize_language(
        language
    )

    if not caregiver:
        alert.status = "failed"

        alert.error_message = (
            "No caregiver found for this alert."
        )

        db.commit()
        db.refresh(alert)

        return alert

    preferred_channel = (
        str(
            caregiver.preferred_channel
            or ""
        )
        .strip()
        .lower()
    )

    if (
        preferred_channel
        != "telegram"
    ):
        alert.status = "pending"

        alert.error_message = None

        db.commit()
        db.refresh(alert)

        return alert

    telegram_chat_id = (
        str(
            caregiver.telegram_chat_id
            or ""
        )
        .strip()
    )

    if not telegram_chat_id:
        alert.status = "failed"

        alert.error_message = (
            "Caregiver Telegram Chat ID is missing."
        )

        db.commit()
        db.refresh(alert)

        return alert

    telegram_message = (
        build_telegram_message(
            alert=alert,
            action=action,
            source=source,
            account_name=user_display_name,
            language=language,
        )
    )

    try:
        telegram_service = (
            TelegramService()
        )

        success, error = (
            telegram_service.send_message(
                chat_id=telegram_chat_id,
                message=telegram_message,
            )
        )

    except Exception as exc:
        success = False

        error = (
            "Telegram delivery raised an exception: "
            f"{exc}"
        )

    if success:
        alert.status = "sent"

        alert.sent_at = (
            datetime.now(
                timezone.utc
            )
        )

        alert.error_message = None

    else:
        alert.status = "failed"

        alert.sent_at = None

        alert.error_message = (
            str(
                error
                or "Telegram delivery failed."
            )
        )

    db.commit()
    db.refresh(alert)

    return alert


def get_owned_alert(
    db: Session,
    alert_id: UUID,
    user_id: UUID,
) -> CareAlert:
    """
    Returns an alert only when it belongs to the
    currently authenticated user.
    """

    alert = (
        db.query(CareAlert)
        .filter(
            CareAlert.id
            == alert_id
        )
        .filter(
            CareAlert.user_id
            == user_id
        )
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found",
        )

    return alert


# ============================================================
# CREATE ALERT FROM DAILY NEED ACTION
# ============================================================

@router.post(
    "/from-action/{action_code}",
    response_model=CareAlertOut,
    status_code=status.HTTP_201_CREATED,
)
def create_alert_from_action(
    action_code: str,
    caregiver_id: UUID | None = None,
    language: str = "ar",
    source: str = "careboard",
    confirmed_by_user: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    language = normalize_language(
        language
    )

    action = (
        db.query(DailyNeedAction)
        .filter(
            DailyNeedAction.code
            == action_code
        )
        .filter(
            DailyNeedAction.is_active.is_(
                True
            )
        )
        .first()
    )

    if not action:
        raise HTTPException(
            status_code=404,
            detail=(
                "Daily need action "
                "not found"
            ),
        )

    caregiver = None

    # --------------------------------------------------------
    # Explicit caregiver
    # --------------------------------------------------------

    if caregiver_id:
        caregiver = (
            db.query(Caregiver)
            .filter(
                Caregiver.id
                == caregiver_id
            )
            .filter(
                Caregiver.user_id
                == current_user.id
            )
            .filter(
                Caregiver.is_active.is_(
                    True
                )
            )
            .first()
        )

        if not caregiver:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Caregiver not found"
                ),
            )

    # --------------------------------------------------------
    # Primary caregiver
    # --------------------------------------------------------

    if not caregiver:
        caregiver = (
            db.query(Caregiver)
            .filter(
                Caregiver.user_id
                == current_user.id
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

    # --------------------------------------------------------
    # First active caregiver fallback
    # --------------------------------------------------------

    if not caregiver:
        caregiver = (
            db.query(Caregiver)
            .filter(
                Caregiver.user_id
                == current_user.id
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

    if not caregiver:
        raise HTTPException(
            status_code=400,
            detail=(
                "No active caregiver found. "
                "Please add a caregiver first."
            ),
        )

    message = (
        build_alert_message(
            action=action,
            language=language,
            user_display_name=(
                current_user.full_name
            ),
        )
    )

    alert = CareAlert(
        user_id=current_user.id,
        caregiver_id=caregiver.id,
        daily_need_action_id=action.id,
        alert_type="daily_need",
        intent=action.intent,
        message=message,
        channel=(
            caregiver.preferred_channel
        ),
        status="pending",
        risk_level=(
            action.risk_level
        ),
        confidence=None,
        source=source,
        confirmed_by_user=(
            confirmed_by_user
        ),
        error_message=None,
        sent_at=None,
        acknowledged_at=None,
        resolved_at=None,
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    alert = send_alert_if_telegram(
        db=db,
        alert=alert,
        caregiver=caregiver,
        action=action,
        source=source,
        user_display_name=(
            current_user.full_name
        ),
        language=language,
    )

    return alert


# ============================================================
# CREATE CUSTOM ALERT
# ============================================================

@router.post(
    "",
    response_model=CareAlertOut,
    status_code=status.HTTP_201_CREATED,
)
def create_custom_alert(
    payload: CareAlertCreate,
    language: str = "ar",
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Creates a custom Care Alert.

    Lifecycle fields are controlled exclusively by the backend.

    The client cannot create an alert already marked as:
    sent,
    acknowledged,
    resolved,
    failed.
    """

    language = normalize_language(
        language
    )

    caregiver = None
    action = None

    # --------------------------------------------------------
    # Caregiver validation
    # --------------------------------------------------------

    if payload.caregiver_id:
        caregiver = (
            db.query(Caregiver)
            .filter(
                Caregiver.id
                == payload.caregiver_id
            )
            .filter(
                Caregiver.user_id
                == current_user.id
            )
            .filter(
                Caregiver.is_active.is_(
                    True
                )
            )
            .first()
        )

        if not caregiver:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Caregiver not found"
                ),
            )

    # --------------------------------------------------------
    # Daily Need Action validation
    # --------------------------------------------------------

    if payload.daily_need_action_id:
        action = (
            db.query(DailyNeedAction)
            .filter(
                DailyNeedAction.id
                == payload.daily_need_action_id
            )
            .filter(
                DailyNeedAction.is_active.is_(
                    True
                )
            )
            .first()
        )

        if not action:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Daily need action "
                    "not found"
                ),
            )

    alert = CareAlert(
        user_id=current_user.id,
        caregiver_id=(
            caregiver.id
            if caregiver
            else None
        ),
        daily_need_action_id=(
            action.id
            if action
            else None
        ),
        alert_type=payload.alert_type,
        intent=payload.intent,
        message=payload.message,
        channel=payload.channel,
        status="pending",
        risk_level=(
            payload.risk_level
        ),
        confidence=(
            payload.confidence
        ),
        source=payload.source,
        confirmed_by_user=(
            payload.confirmed_by_user
        ),
        error_message=None,
        sent_at=None,
        acknowledged_at=None,
        resolved_at=None,
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    if caregiver:
        alert = (
            send_alert_if_telegram(
                db=db,
                alert=alert,
                caregiver=caregiver,
                action=action,
                source=payload.source,
                user_display_name=(
                    current_user.full_name
                ),
                language=language,
            )
        )

    return alert


# ============================================================
# ALERT LIST
# ============================================================

@router.get(
    "",
    response_model=list[CareAlertOut],
)
def get_my_alerts(
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
    ),
    risk_level: str | None = None,
    source: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Returns the current user's Care Alert history.

    Optional filters:

    status
    risk_level
    source
    """

    query = (
        db.query(CareAlert)
        .filter(
            CareAlert.user_id
            == current_user.id
        )
    )

    if status_filter:
        query = query.filter(
            CareAlert.status
            == status_filter
        )

    if risk_level:
        query = query.filter(
            CareAlert.risk_level
            == risk_level
        )

    if source:
        query = query.filter(
            CareAlert.source
            == source
        )

    return (
        query
        .order_by(
            CareAlert.created_at.desc()
        )
        .limit(limit)
        .all()
    )


# ============================================================
# ALERT DETAILS
# ============================================================

@router.get(
    "/{alert_id}",
    response_model=CareAlertOut,
)
def get_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return get_owned_alert(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )


# ============================================================
# ACKNOWLEDGE ALERT
# ============================================================

@router.patch(
    "/{alert_id}/acknowledge",
    response_model=CareAlertOut,
)
def acknowledge_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Marks an alert as acknowledged.

    Allowed:
        sent -> acknowledged
        pending -> acknowledged

    Idempotent:
        acknowledged -> acknowledged

    Not allowed:
        failed
        resolved
    """

    alert = get_owned_alert(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if (
        alert.status
        == "resolved"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Resolved alerts cannot "
                "be acknowledged again."
            ),
        )

    if (
        alert.status
        == "failed"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Failed alerts cannot "
                "be acknowledged."
            ),
        )

    if (
        alert.status
        == "acknowledged"
    ):
        return alert

    alert.status = "acknowledged"

    alert.acknowledged_at = (
        datetime.now(
            timezone.utc
        )
    )

    alert.error_message = None

    db.commit()
    db.refresh(alert)

    return alert


# ============================================================
# RESOLVE ALERT
# ============================================================

@router.patch(
    "/{alert_id}/resolve",
    response_model=CareAlertOut,
)
def resolve_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Marks an alert as resolved.

    Normal lifecycle:
        sent -> acknowledged -> resolved

    The endpoint also allows sent/pending -> resolved
    so the user can close a request directly when needed.

    Failed alerts cannot be resolved.
    """

    alert = get_owned_alert(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if (
        alert.status
        == "failed"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Failed alerts cannot "
                "be resolved."
            ),
        )

    if (
        alert.status
        == "resolved"
    ):
        return alert

    now = datetime.now(
        timezone.utc
    )

    if (
        alert.acknowledged_at
        is None
    ):
        alert.acknowledged_at = now

    alert.status = "resolved"
    alert.resolved_at = now
    alert.error_message = None

    db.commit()
    db.refresh(alert)

    return alert


# ============================================================
# LEGACY / MANUAL MARK SENT
# ============================================================

@router.patch(
    "/{alert_id}/mark-sent",
    response_model=CareAlertOut,
)
def mark_alert_as_sent(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    alert = get_owned_alert(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if (
        alert.status
        == "resolved"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Resolved alerts cannot "
                "be marked as sent."
            ),
        )

    alert.status = "sent"

    alert.sent_at = (
        datetime.now(
            timezone.utc
        )
    )

    alert.error_message = None

    db.commit()
    db.refresh(alert)

    return alert


# ============================================================
# LEGACY / MANUAL MARK FAILED
# ============================================================

@router.patch(
    "/{alert_id}/mark-failed",
    response_model=CareAlertOut,
)
def mark_alert_as_failed(
    alert_id: UUID,
    error_message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    alert = get_owned_alert(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if (
        alert.status
        == "resolved"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Resolved alerts cannot "
                "be marked as failed."
            ),
        )

    alert.status = "failed"

    alert.error_message = (
        error_message
    )

    db.commit()
    db.refresh(alert)

    return alert


# ============================================================
# DELETE ALERT
# ============================================================

@router.delete(
    "/{alert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    alert = get_owned_alert(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    db.delete(alert)
    db.commit()

    return None