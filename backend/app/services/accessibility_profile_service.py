from uuid import UUID

from sqlalchemy.orm import Session

from app.models.accessibility_profile import AccessibilityProfile
from app.repositories.accessibility_profile_repository import AccessibilityProfileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.accessibility_profile_schema import AccessibilityProfileUpdate


class AccessibilityService:
    def __init__(self, db: Session):
        self.db = db
        self.profile_repository = AccessibilityProfileRepository(db)
        self.user_repository = UserRepository(db)

    def get_profile_by_user_id(self, user_id: UUID) -> AccessibilityProfile:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        profile = self.profile_repository.get_profile_by_user_id(user_id)

        if not profile:
            raise ValueError("Accessibility profile not found")

        return profile

    def update_profile(
        self,
        user_id: UUID,
        profile_data: AccessibilityProfileUpdate
    ) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        updated_profile = self.profile_repository.update_accessibility_profile(
            profile,
            profile_data
        )

        return updated_profile

    def enable_safe_browsing(self, user_id: UUID) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        profile.safe_browsing_enabled = True

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def disable_safe_browsing(self, user_id: UUID) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        profile.safe_browsing_enabled = False

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def enable_voice_guidance(self, user_id: UUID) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        profile.voice_guidance_enabled = True

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def disable_voice_guidance(self, user_id: UUID) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        profile.voice_guidance_enabled = False

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def set_assistant_language(
        self,
        user_id: UUID,
        language: str
    ) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        profile.assistant_language = language

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def set_accessibility_mode(
        self,
        user_id: UUID,
        mode: str
    ) -> AccessibilityProfile:
        profile = self.get_profile_by_user_id(user_id)

        profile.mode = mode

        self.db.commit()
        self.db.refresh(profile)

        return profile