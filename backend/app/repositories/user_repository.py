from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_user(
        self,
        full_name: str | None,
        email: str,
        password_hash: str
    ) -> User:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.id == user_id)
            .first()
        )

    def get_user_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email)
            .first()
        )

    def get_users(self) -> List[User]:
        return (
            self.db.query(User)
            .order_by(User.created_at.desc())
            .all()
        )

    def update_user(
        self,
        user: User,
        update_data: dict
    ) -> User:
        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)

        return user

    def set_two_factor_secret(
        self,
        user: User,
        secret: str
    ) -> User:
        user.totp_secret = secret

        self.db.commit()
        self.db.refresh(user)

        return user

    def enable_two_factor(
        self,
        user: User
    ) -> User:
        user.is_2fa_enabled = True
        user.two_factor_confirmed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(user)

        return user

    def disable_two_factor(
        self,
        user: User
    ) -> User:
        user.is_2fa_enabled = False
        user.totp_secret = None
        user.two_factor_confirmed_at = None

        self.db.commit()
        self.db.refresh(user)

        return user

    def record_successful_login(
        self,
        user: User
    ) -> User:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(user)

        return user

    def record_failed_login(
        self,
        user: User,
        max_attempts: int = 5,
        lock_minutes: int = 15
    ) -> User:
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1

        if user.failed_login_attempts >= max_attempts:
            user.locked_until = datetime.utcnow() + timedelta(
                minutes=lock_minutes
            )

        self.db.commit()
        self.db.refresh(user)

        return user

    def reset_failed_login_attempts(
        self,
        user: User
    ) -> User:
        user.failed_login_attempts = 0
        user.locked_until = None

        self.db.commit()
        self.db.refresh(user)

        return user

    def delete_user(self, user: User) -> bool:
        self.db.delete(user)
        self.db.commit()

        return True