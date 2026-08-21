from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.caregiver import Caregiver
from app.models.user import User
from app.schemas.caregiver import CaregiverCreate, CaregiverOut, CaregiverUpdate


router = APIRouter(prefix="/caregivers", tags=["Caregivers"])


@router.post("", response_model=CaregiverOut, status_code=status.HTTP_201_CREATED)
def create_caregiver(
    payload: CaregiverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.is_primary:
        db.query(Caregiver).filter(
            Caregiver.user_id == current_user.id,
            Caregiver.is_primary.is_(True),
        ).update({"is_primary": False})

    caregiver = Caregiver(
        user_id=current_user.id,
        full_name=payload.full_name,
        relationship=payload.relationship,
        phone_number=payload.phone_number,
        telegram_chat_id=payload.telegram_chat_id,
        whatsapp_number=payload.whatsapp_number,
        preferred_channel=payload.preferred_channel,
        is_primary=payload.is_primary,
        is_active=payload.is_active,
    )

    db.add(caregiver)
    db.commit()
    db.refresh(caregiver)

    return caregiver


@router.get("", response_model=list[CaregiverOut])
def get_my_caregivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Caregiver)
        .filter(Caregiver.user_id == current_user.id)
        .order_by(Caregiver.is_primary.desc(), Caregiver.created_at.desc())
        .all()
    )


@router.get("/{caregiver_id}", response_model=CaregiverOut)
def get_caregiver(
    caregiver_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.id == caregiver_id)
        .filter(Caregiver.user_id == current_user.id)
        .first()
    )

    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    return caregiver


@router.patch("/{caregiver_id}", response_model=CaregiverOut)
def update_caregiver(
    caregiver_id: UUID,
    payload: CaregiverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.id == caregiver_id)
        .filter(Caregiver.user_id == current_user.id)
        .first()
    )

    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    data = payload.model_dump(exclude_unset=True)

    if data.get("is_primary") is True:
        db.query(Caregiver).filter(
            Caregiver.user_id == current_user.id,
            Caregiver.is_primary.is_(True),
            Caregiver.id != caregiver_id,
        ).update({"is_primary": False})

    for field, value in data.items():
        setattr(caregiver, field, value)

    db.commit()
    db.refresh(caregiver)

    return caregiver


@router.delete("/{caregiver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_caregiver(
    caregiver_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caregiver = (
        db.query(Caregiver)
        .filter(Caregiver.id == caregiver_id)
        .filter(Caregiver.user_id == current_user.id)
        .first()
    )

    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    db.delete(caregiver)
    db.commit()

    return None