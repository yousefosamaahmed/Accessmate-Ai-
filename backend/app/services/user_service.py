from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.caregiver import Caregiver
from app.repositories.user_repository import UserRepository
from app.repositories.accessibility_profile_repository import AccessibilityProfileRepository
from app.schemas.user_schema import UserCreate, UserUpdate
from app.schemas.accessibility_profile_schema import AccessibilityProfileCreate
from app.core.security import hash_password, verify_password
from app.services.two_factor_service import TwoFactorService


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repository = UserRepository(db)
        self.profile_repository = AccessibilityProfileRepository(db)
        self.two_factor_service = TwoFactorService()

    def register_user(self, user_data: UserCreate) -> User:
        existing_user = self.user_repository.get_user_by_email(
            str(user_data.email)
        )

        if existing_user:
            raise ValueError("Email already registered")

        user = self.user_repository.create_user(
            full_name=user_data.full_name,
            email=str(user_data.email),
            password_hash=hash_password(user_data.password)
        )

        profile_data = AccessibilityProfileCreate(
            user_id=user.id
        )

        self.profile_repository.create_accessibility_profile(profile_data)

        self._create_primary_caregiver_from_registration(user, user_data)

        return user


    def _create_primary_caregiver_from_registration(
        self,
        user: User,
        user_data: UserCreate,
    ) -> None:
        """
        Creates a primary caregiver/contact record from optional registration fields.

        This keeps the users table stable and uses the existing caregivers table
        for Telegram delivery details. If the registration form does not provide
        phone/Telegram data, nothing is created.
        """
        phone_number = getattr(user_data, "phone_number", None)
        telegram_chat_id = getattr(user_data, "telegram_chat_id", None)

        if not phone_number and not telegram_chat_id:
            return

        caregiver = Caregiver(
            user_id=user.id,
            full_name=user.full_name or "Primary contact",
            relationship="Self / Primary contact",
            phone_number=phone_number,
            telegram_chat_id=telegram_chat_id,
      	    preferred_channel="telegram",
            is_primary=True,
            is_active=True,
        )

        self.db.add(caregiver)
        self.db.commit()

    def get_user_by_id(self, user_id: UUID) -> User:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        return user

    def get_user_by_email(self, email: str) -> User:
        user = self.user_repository.get_user_by_email(email)

        if not user:
            raise ValueError("User not found")

        return user

    def get_users(self) -> list[User]:
        return self.user_repository.get_users()

    def update_user(
        self,
        user_id: UUID,
        user_data: UserUpdate
    ) -> User:
        user = self.get_user_by_id(user_id)

        update_data = user_data.model_dump(exclude_unset=True)

        if "password" in update_data:
            plain_password = update_data.pop("password")
            update_data["password_hash"] = hash_password(plain_password)

        updated_user = self.user_repository.update_user(
            user,
            update_data
        )

        return updated_user

    def deactivate_user(self, user_id: UUID) -> User:
        user = self.get_user_by_id(user_id)

        user.is_active = False

        self.db.commit()
        self.db.refresh(user)

        return user

    def get_user_accessibility_profile(self, user_id: UUID):
        user = self.get_user_by_id(user_id)

        profile = self.profile_repository.get_profile_by_user_id(user.id)

        if not profile:
            raise ValueError("Accessibility profile not found")

        return profile

    def is_user_locked(self, user: User) -> bool:
        if not user.locked_until:
            return False

        return user.locked_until > datetime.utcnow()

    def verify_user_password(
        self,
        user: User,
        password: str
    ) -> bool:
        if not user.password_hash:
            return False

        return verify_password(
            password,
            user.password_hash
        )

    def record_successful_login(self, user: User) -> User:
        return self.user_repository.record_successful_login(user)

    def record_failed_login(self, user: User) -> User:
        return self.user_repository.record_failed_login(user)

    def setup_two_factor(self, user: User) -> dict:
        if user.is_2fa_enabled:
            raise ValueError("Two-factor authentication is already enabled")

        secret = user.totp_secret

        if not secret:
            secret = self.two_factor_service.generate_secret()
            user = self.user_repository.set_two_factor_secret(
                user=user,
                secret=secret
            )

        provisioning_uri = self.two_factor_service.build_provisioning_uri(
            email=user.email,
            secret=secret
        )

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri
        }

    def confirm_two_factor(
        self,
        user: User,
        code: str
    ) -> User:
        if user.is_2fa_enabled:
            raise ValueError("Two-factor authentication is already enabled")

        if not user.totp_secret:
            raise ValueError("Two-factor setup has not been started")

        is_valid = self.two_factor_service.verify_code(
            secret=user.totp_secret,
            code=code
        )

        if not is_valid:
            raise ValueError("Invalid two-factor authentication code")

        return self.user_repository.enable_two_factor(user)

    def verify_two_factor_code(
        self,
        user: User,
        code: str
    ) -> bool:
        if not user.totp_secret:
            return False

        return self.two_factor_service.verify_code(
            secret=user.totp_secret,
            code=code
        )

    def disable_two_factor(
        self,
        user: User,
        password: str,
        code: str
    ) -> User:
        if not user.is_2fa_enabled:
            raise ValueError("Two-factor authentication is not enabled")

        if not self.verify_user_password(user, password):
            raise ValueError("Invalid password or two-factor code")

        is_valid_code = self.verify_two_factor_code(
            user=user,
            code=code
        )

        if not is_valid_code:
            raise ValueError("Invalid password or two-factor code")

        return self.user_repository.disable_two_factor(user)