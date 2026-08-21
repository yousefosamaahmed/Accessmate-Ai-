from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.accessibility_profile import AccessibilityProfile
from app.schemas.accessibility_profile_schema import (
    AccessibilityProfileCreate,
    AccessibilityProfileUpdate,
)


class AccessibilityProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_accessibility_profile(
        self,
        profile_data: AccessibilityProfileCreate
    ) -> AccessibilityProfile:
        profile = AccessibilityProfile(**profile_data.model_dump())

        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)

        return profile

    def get_profile_by_id(self, profile_id: UUID) -> Optional[AccessibilityProfile]:
        return (
            self.db.query(AccessibilityProfile)
            .filter(AccessibilityProfile.id == profile_id)
            .first()
        )

    def get_profile_by_user_id(self, user_id: UUID) -> Optional[AccessibilityProfile]:
        return (
            self.db.query(AccessibilityProfile)
            .filter(AccessibilityProfile.user_id == user_id)
            .first()
        )

    def update_accessibility_profile(
        self,
        profile: AccessibilityProfile,
        profile_data: AccessibilityProfileUpdate
    ) -> AccessibilityProfile:
        update_data = profile_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(profile, field, value)

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def delete_accessibility_profile(self, profile: AccessibilityProfile) -> bool:
        self.db.delete(profile)
        self.db.commit()

        return True