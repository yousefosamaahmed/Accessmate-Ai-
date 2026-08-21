from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.care_alert import CareAlert
from app.models.caregiver import Caregiver
from app.models.daily_need_action import DailyNeedAction
from app.models.user import User
from app.services.telegram_service import TelegramService


DEFAULT_SIGN_ALERT_COOLDOWN_SECONDS = 30


class CareActionError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "care_action_error",
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


@dataclass
class CareActionResult:
    action: DailyNeedAction
    caregiver: Caregiver | None
    alert: CareAlert | None
    status: str
    duplicate_suppressed: bool = False

    @property
    def alert_sent(self) -> bool:
        return bool(self.alert and self.alert.status == "sent")


def normalize_language(language: str | None) -> str:
    if not language:
        return "ar"
    return "en" if language.strip().lower().startswith("en") else "ar"


def personalize_alert_message(
    message: str,
    user_display_name: str | None = None,
) -> str:
    if not user_display_name:
        return message

    result = message
    for old, new in {
        "المستخدم": user_display_name,
        "The user": user_display_name,
        "the user": user_display_name,
    }.items():
        result = result.replace(old, new)
    return result


def build_alert_message(
    action: DailyNeedAction,
    language: str = "ar",
    user_display_name: str | None = None,
) -> str:
    language = normalize_language(language)
    if language == "en":
        message = action.default_message_en or action.default_message_ar
    else:
        message = action.default_message_ar or action.default_message_en

    return personalize_alert_message(
        message,
        user_display_name=user_display_name,
    )


def get_risk_label(risk_level: str, language: str) -> str:
    risk = str(risk_level or "low").strip().lower()
    if normalize_language(language) == "en":
        return {
            "low": "Low",
            "medium": "Medium",
            "high": "High",
            "emergency": "Emergency",
        }.get(risk, risk)

    return {
        "low": "منخفضة",
        "medium": "متوسطة",
        "high": "عالية",
        "emergency": "طارئة",
    }.get(risk, risk)


def get_source_label(source: str, language: str) -> str:
    source = str(source or "careboard").strip().lower()

    if normalize_language(language) == "en":
        return {
            "careboard": "Daily Needs Board",
            "sign_language": "Sign Language",
            "camera": "Camera",
            "workspace": "AI Workspace",
            "voice": "Voice Assistant",
        }.get(source, source)

    return {
        "careboard": "لوحة الاحتياجات اليومية",
        "sign_language": "لغة الإشارة",
        "camera": "الكاميرا",
        "workspace": "مساحة العمل",
        "voice": "المساعد الصوتي",
    }.get(source, source)


def build_telegram_message(
    alert: CareAlert,
    action: DailyNeedAction | None = None,
    *,
    source: str = "careboard",
    language: str = "ar",
    account_name: str | None = None,
) -> str:
    language = normalize_language(language)
    risk = str(alert.risk_level or "low").strip().lower()

    if language == "ar":
        account_name = account_name or "صاحب الحساب"
        need = (
            getattr(action, "name_ar", None)
            or getattr(action, "name_en", None)
            or alert.intent
            or "طلب رعاية"
        )

        if risk == "emergency":
            title = "🚨 <b>تنبيه طوارئ عاجل - AccessMate AI</b>"
            opening = "<b>يرجى التدخل فورًا.</b>\n\n"
        elif risk == "high":
            title = "⚠️ <b>تنبيه مهم من AccessMate AI</b>"
            opening = "يرجى الاطمئنان على صاحب الحساب في أسرع وقت.\n\n"
        elif risk == "medium":
            title = "<b>تنبيه رعاية من AccessMate AI</b>"
            opening = "يرجى مراجعة الطلب والاطمئنان على صاحب الحساب.\n\n"
        else:
            title = "<b>تنبيه من AccessMate AI</b>"
            opening = ""

        return (
            f"{title}\n\n"
            f"<b>صاحب الحساب:</b> {account_name}\n\n"
            f"{alert.message}\n\n"
            f"{opening}"
            f"<b>الاحتياج:</b> {need}\n"
            f"<b>درجة الخطورة:</b> {get_risk_label(risk, 'ar')}\n"
            f"<b>المصدر:</b> {get_source_label(source, 'ar')}\n"
            f"<b>الحالة:</b> تم الإرسال"
        )

    account_name = account_name or "Account owner"
    need = (
        getattr(action, "name_en", None)
        or getattr(action, "name_ar", None)
        or alert.intent
        or "Care request"
    )

    if risk == "emergency":
        title = "🚨 <b>URGENT EMERGENCY - AccessMate AI</b>"
        opening = "<b>Immediate attention is required.</b>\n\n"
    elif risk == "high":
        title = "⚠️ <b>Important Alert from AccessMate AI</b>"
        opening = "Please check on the account owner as soon as possible.\n\n"
    elif risk == "medium":
        title = "<b>Care Alert from AccessMate AI</b>"
        opening = "Please review the request and check on the account owner.\n\n"
    else:
        title = "<b>AccessMate AI Alert</b>"
        opening = ""

    return (
        f"{title}\n\n"
        f"<b>Account owner:</b> {account_name}\n\n"
        f"{alert.message}\n\n"
        f"{opening}"
        f"<b>Need:</b> {need}\n"
        f"<b>Risk level:</b> {get_risk_label(risk, 'en')}\n"
        f"<b>Source:</b> {get_source_label(source, 'en')}\n"
        f"<b>Status:</b> Sent"
    )


def get_default_caregiver(
    db: Session,
    user_id: UUID,
) -> Caregiver | None:
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.user_id == user_id)
        .filter(Caregiver.is_primary.is_(True))
        .filter(Caregiver.is_active.is_(True))
        .first()
    )
    if caregiver:
        return caregiver

    return (
        db.query(Caregiver)
        .filter(Caregiver.user_id == user_id)
        .filter(Caregiver.is_active.is_(True))
        .order_by(Caregiver.created_at.asc())
        .first()
    )


def resolve_caregiver(
    db: Session,
    user_id: UUID,
    caregiver_id: UUID | None = None,
) -> Caregiver | None:
    if caregiver_id:
        caregiver = (
            db.query(Caregiver)
            .filter(Caregiver.id == caregiver_id)
            .filter(Caregiver.user_id == user_id)
            .filter(Caregiver.is_active.is_(True))
            .first()
        )
        if not caregiver:
            raise CareActionError(
                "Caregiver not found.",
                status_code=404,
                code="caregiver_not_found",
            )
        return caregiver

    return get_default_caregiver(db, user_id)


def send_alert_if_telegram(
    db: Session,
    alert: CareAlert,
    caregiver: Caregiver | None,
    action: DailyNeedAction | None = None,
    *,
    source: str = "careboard",
    user_display_name: str | None = None,
    language: str = "ar",
) -> CareAlert:
    if not caregiver:
        alert.status = "failed"
        alert.error_message = "No caregiver found for this alert."
        alert.sent_at = None
        db.commit()
        db.refresh(alert)
        return alert

    channel = str(caregiver.preferred_channel or "").strip().lower()
    if channel != "telegram":
        alert.status = "pending"
        alert.error_message = None
        alert.sent_at = None
        db.commit()
        db.refresh(alert)
        return alert

    chat_id = str(caregiver.telegram_chat_id or "").strip()
    if not chat_id:
        alert.status = "failed"
        alert.error_message = "Caregiver Telegram Chat ID is missing."
        alert.sent_at = None
        db.commit()
        db.refresh(alert)
        return alert

    message = build_telegram_message(
        alert,
        action,
        source=source,
        language=language,
        account_name=user_display_name,
    )

    try:
        success, error = TelegramService().send_message(
            chat_id=chat_id,
            message=message,
        )
    except Exception as exc:
        success = False
        error = f"Telegram transport error: {type(exc).__name__}: {exc}"

    if success:
        alert.status = "sent"
        alert.sent_at = datetime.now(timezone.utc)
        alert.error_message = None
    else:
        alert.status = "failed"
        alert.sent_at = None
        alert.error_message = str(
            error or "Telegram delivery failed."
        )[:1000]

    db.commit()
    db.refresh(alert)
    return alert


def find_recent_equivalent_alert(
    db: Session,
    *,
    user_id: UUID,
    action_id: UUID,
    source: str,
    cooldown_seconds: int,
) -> CareAlert | None:
    if cooldown_seconds <= 0:
        return None

    cutoff = datetime.now(timezone.utc) - timedelta(
        seconds=cooldown_seconds
    )

    return (
        db.query(CareAlert)
        .filter(CareAlert.user_id == user_id)
        .filter(CareAlert.daily_need_action_id == action_id)
        .filter(CareAlert.source == source)
        .filter(CareAlert.created_at >= cutoff)
        .filter(
            CareAlert.status.in_(
                ["pending", "sent", "acknowledged"]
            )
        )
        .order_by(CareAlert.created_at.desc())
        .first()
    )


def trigger_daily_need_action(
    db: Session,
    user: User,
    action_code: str,
    *,
    caregiver_id: UUID | None = None,
    language: str = "ar",
    source: str = "careboard",
    confidence: float | None = None,
    alert_type: str = "daily_need",
    confirmed_by_user: bool = True,
    suppress_duplicates: bool = False,
    cooldown_seconds: int = DEFAULT_SIGN_ALERT_COOLDOWN_SECONDS,
    require_caregiver: bool = True,
) -> CareActionResult:
    """
    Shared business pipeline:
      DailyNeedAction -> caregiver -> CareAlert -> Telegram.

    For continuous sign recognition set:
      source="sign_language"
      suppress_duplicates=True
      cooldown_seconds=30
    """
    action_code = str(action_code or "").strip().lower()
    source = str(source or "careboard").strip().lower()
    language = normalize_language(language)

    if not action_code:
        raise CareActionError(
            "Daily need action code is required.",
            code="missing_action_code",
        )

    action = (
        db.query(DailyNeedAction)
        .filter(DailyNeedAction.code == action_code)
        .filter(DailyNeedAction.is_active.is_(True))
        .first()
    )
    if not action:
        raise CareActionError(
            "Daily need action not found.",
            status_code=404,
            code="action_not_found",
        )

    caregiver = resolve_caregiver(
        db,
        user.id,
        caregiver_id,
    )

    if not caregiver:
        if require_caregiver:
            raise CareActionError(
                "No active caregiver found. Please add a caregiver first.",
                code="no_caregiver",
            )

        return CareActionResult(
            action=action,
            caregiver=None,
            alert=None,
            status="no_caregiver",
        )

    if suppress_duplicates:
        existing = find_recent_equivalent_alert(
            db,
            user_id=user.id,
            action_id=action.id,
            source=source,
            cooldown_seconds=cooldown_seconds,
        )
        if existing:
            return CareActionResult(
                action=action,
                caregiver=caregiver,
                alert=existing,
                status=existing.status,
                duplicate_suppressed=True,
            )

    alert = CareAlert(
        user_id=user.id,
        caregiver_id=caregiver.id,
        daily_need_action_id=action.id,
        alert_type=alert_type,
        intent=action.intent,
        message=build_alert_message(
            action,
            language=language,
            user_display_name=getattr(user, "full_name", None),
        ),
        channel=caregiver.preferred_channel,
        status="pending",
        risk_level=action.risk_level,
        confidence=confidence,
        source=source,
        confirmed_by_user=confirmed_by_user,
        error_message=None,
        sent_at=None,
        acknowledged_at=None,
        resolved_at=None,
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    alert = send_alert_if_telegram(
        db,
        alert,
        caregiver,
        action,
        source=source,
        user_display_name=getattr(user, "full_name", None),
        language=language,
    )

    return CareActionResult(
        action=action,
        caregiver=caregiver,
        alert=alert,
        status=alert.status,
    )
