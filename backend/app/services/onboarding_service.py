from uuid import UUID

from sqlalchemy.orm import Session

from app.models.accessibility_profile import AccessibilityProfile
from app.repositories.user_repository import UserRepository
from app.repositories.accessibility_profile_repository import AccessibilityProfileRepository
from app.schemas.accessibility_profile_schema import AccessibilityProfileCreate, AccessibilityProfileUpdate


class OnboardingService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repository = UserRepository(db)
        self.profile_repository = AccessibilityProfileRepository(db)

    def create_default_profile(self, user_id: UUID) -> AccessibilityProfile:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        existing_profile = self.profile_repository.get_profile_by_user_id(
            user_id
        )

        if existing_profile:
            return existing_profile

        profile_data = AccessibilityProfileCreate(
            user_id=user_id
        )

        profile = self.profile_repository.create_accessibility_profile(
            profile_data
        )

        return profile

    def update_onboarding_preferences(
        self,
        user_id: UUID,
        profile_data: AccessibilityProfileUpdate
    ) -> AccessibilityProfile:
        profile = self.profile_repository.get_profile_by_user_id(user_id)

        if not profile:
            raise ValueError("Accessibility profile not found")

        updated_profile = self.profile_repository.update_accessibility_profile(
            profile,
            profile_data
        )

        return updated_profile