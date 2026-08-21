from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.caregiver import Caregiver
from app.models.user import User
from app.schemas.account_schema import AccountResponse, AccountUpdate


router = APIRouter(prefix="/account", tags=["Account"])


def get_primary_or_first_caregiver(db: Session, user_id):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.user_id == user_id)
        .filter(Caregiver.is_primary.is_(True))
        .first()
    )

    if caregiver:
        return caregiver

    return (
        db.query(Caregiver)
        .filter(Caregiver.user_id == user_id)
        .order_by(Caregiver.created_at.asc())
        .first()
    )


def build_account_response(user: User, caregiver: Caregiver | None = None) -> AccountResponse:
    return AccountResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        is_active=user.is_active,
        is_2fa_enabled=user.is_2fa_enabled,
        created_at=user.created_at,
        updated_at=user.updated_at,
        phone_number=caregiver.phone_number if caregiver else None,
        telegram_chat_id=caregiver.telegram_chat_id if caregiver else None,
        avatar_url=None,
        caregiver_id=caregiver.id if caregiver else None,
        caregiver_relationship=caregiver.relationship if caregiver else None,
        preferred_channel=caregiver.preferred_channel if caregiver else None,
        caregiver_is_primary=bool(caregiver.is_primary) if caregiver else False,
    )


@router.get("/me", response_model=AccountResponse)
def get_my_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caregiver = get_primary_or_first_caregiver(db, current_user.id)
    return build_account_response(current_user, caregiver)


@router.patch("/me", response_model=AccountResponse)
def update_my_account(
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"]:
        existing = (
            db.query(User)
            .filter(User.email == str(update_data["email"]))
            .filter(User.id != current_user.id)
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already used by another account.",
            )

        current_user.email = str(update_data["email"])

    if "full_name" in update_data:
        current_user.full_name = update_data.get("full_name")

    caregiver = get_primary_or_first_caregiver(db, current_user.id)

    phone_number = update_data.get("phone_number")
    telegram_chat_id = update_data.get("telegram_chat_id")

    contact_fields_present = "phone_number" in update_data or "telegram_chat_id" in update_data

    if contact_fields_present:
        if not caregiver:
            caregiver = Caregiver(
                user_id=current_user.id,
                full_name=current_user.full_name or "Primary contact",
                relationship="Self / Primary contact",
		preferred_channel="telegram",
                is_primary=True,
                is_active=True,
            )
            db.add(caregiver)

        if "phone_number" in update_data:
            caregiver.phone_number = phone_number

        if "telegram_chat_id" in update_data:
            caregiver.telegram_chat_id = telegram_chat_id
            if telegram_chat_id:
                caregiver.preferred_channel = "telegram"

        if current_user.full_name and (
            not caregiver.full_name or caregiver.full_name == "Primary contact"
        ):
            caregiver.full_name = current_user.full_name

    db.commit()
    db.refresh(current_user)

    if caregiver:
        db.refresh(caregiver)

    return build_account_response(current_user, caregiver)
