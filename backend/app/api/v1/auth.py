import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_email_otp_token,
    decode_token,
    hash_password,
    verify_otp_code,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth_schema import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    EmailOtpVerifyLoginRequest,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirmRequest,
    TwoFactorSetupResponse,
    TwoFactorConfirmRequest,
    TwoFactorVerifyLoginRequest,
    TwoFactorDisableRequest,
)
from app.schemas.user_schema import UserCreate, UserResponse
from app.services.email_service import EmailService
from app.services.user_service import UserService


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


class RegisterResponse(UserResponse):
    pass


class PasswordResetRequestResponse(BaseModel):
    password_reset_token: str | None = None
    message: str


class GenericMessageResponse(BaseModel):
    message: str


class TwoFactorConfirmResponse(BaseModel):
    is_2fa_enabled: bool
    message: str


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def build_access_token_for_user(user: User) -> str:
    return create_access_token(
        subject=str(user.id),
        extra_data={"email": user.email},
    )


def send_email_otp_or_raise(
    user: User,
    token_purpose: str,
    email_purpose: str,
) -> str:
    code = generate_otp_code()

    pending_token = create_email_otp_token(
        subject=str(user.id),
        email=user.email,
        code=code,
        purpose=token_purpose,
    )

    success, error = EmailService().send_otp_email(
        to_email=user.email,
        code=code,
        purpose=email_purpose,
        full_name=user.full_name,
    )

    if not success:
        # Do not continue silently in production-like flows.
        # Your EmailService can print the OTP in DEV when SMTP is not configured.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not send verification email: {error}",
        )

    return pending_token


def update_optional_user_contact_fields(
    db: Session,
    user: User,
    phone_number: str | None = None,
    telegram_chat_id: str | None = None,
) -> User:
    """
    Safe helper: only updates fields if they actually exist on the User model.
    This prevents crashes if the database migration has not added these columns yet.
    """
    changed = False

    if phone_number and hasattr(user, "phone_number"):
        user.phone_number = phone_number
        changed = True

    if telegram_chat_id and hasattr(user, "telegram_chat_id"):
        user.telegram_chat_id = telegram_chat_id
        changed = True

    if changed:
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new AccessMate user.

    The frontend may send phone_number and telegram_chat_id.
    If the User model/database supports these fields, they will be saved.
    If not, registration still works and the user can configure alerts later.
    """
    service = UserService(db)

    try:
        # Keep compatibility with your existing UserCreate schema/service.
        # If UserCreate already supports phone_number/telegram_chat_id, they pass through.
        payload = user_data.model_dump(exclude_none=True)

        try:
            create_payload = UserCreate(**payload)
        except Exception:
            create_payload = UserCreate(
                full_name=user_data.full_name,
                email=user_data.email,
                password=user_data.password,
            )

        user = service.register_user(create_payload)

        user = update_optional_user_contact_fields(
            db=db,
            user=user,
            phone_number=user_data.phone_number,
            telegram_chat_id=user_data.telegram_chat_id,
        )

        return user

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Email OTP login flow.

    Step 1: Validate email/password.
    Step 2: Send a 6-digit OTP to the user's email.
    Step 3: Frontend calls /auth/email-otp/verify-login with token + code.
    """
    service = UserService(db)

    generic_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )

    try:
        user = service.get_user_by_email(str(login_data.email))
    except ValueError:
        raise generic_error

    if service.is_user_locked(user):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked. Try again later.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if not service.verify_user_password(
        user=user,
        password=login_data.password,
    ):
        service.record_failed_login(user)
        raise generic_error

    email_verification_token = send_email_otp_or_raise(
        user=user,
        token_purpose="login",
        email_purpose="login",
    )

    return LoginResponse(
        access_token=None,
        token_type="bearer",
        requires_email_otp=True,
        email_verification_token=email_verification_token,
        requires_2fa=False,
        two_factor_token=None,
        message="Verification code sent to email",
    )


@router.post(
    "/email-otp/verify-login",
    response_model=TokenResponse,
)
def verify_email_otp_login(
    verify_data: EmailOtpVerifyLoginRequest,
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        payload = decode_token(verify_data.email_verification_token)

        if payload.get("token_type") != "email_otp":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification token",
            )

        if payload.get("purpose") != "login":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification purpose",
            )

        if not verify_otp_code(
            code=verify_data.code,
            code_hash=payload.get("otp_hash"),
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification code",
            )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification token",
            )

        user = service.get_user_by_id(UUID(user_id))

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification token",
        )

    if service.is_user_locked(user):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked. Try again later.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    service.record_successful_login(user)

    return TokenResponse(
        access_token=build_access_token_for_user(user),
        token_type="bearer",
    )


@router.post(
    "/password-reset/request",
    response_model=PasswordResetRequestResponse,
)
def request_password_reset(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        user = service.get_user_by_email(str(payload.email))
    except ValueError:
        # Do not reveal whether the email exists.
        return PasswordResetRequestResponse(
            password_reset_token=None,
            message="If this email exists, a reset code has been sent.",
        )

    password_reset_token = send_email_otp_or_raise(
        user=user,
        token_purpose="password_reset",
        email_purpose="password_reset",
    )

    return PasswordResetRequestResponse(
        password_reset_token=password_reset_token,
        message="Password reset code sent to email",
    )


@router.post(
    "/password-reset/confirm",
    response_model=GenericMessageResponse,
)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        token_payload = decode_token(payload.password_reset_token)

        if token_payload.get("token_type") != "email_otp":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid reset token",
            )

        if token_payload.get("purpose") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid reset purpose",
            )

        if token_payload.get("email") != str(payload.email):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Reset token does not match email",
            )

        if not verify_otp_code(
            code=payload.code,
            code_hash=token_payload.get("otp_hash"),
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid reset code",
            )

        user_id = token_payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid reset token",
            )

        user = service.get_user_by_id(UUID(user_id))

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired reset token",
        )

    user.password_hash = hash_password(payload.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None

    db.add(user)
    db.commit()

    return GenericMessageResponse(message="Password reset successfully")


# Legacy authenticator-app 2FA endpoints kept for backward compatibility.
# New frontend should use the Email OTP flow above.
@router.post(
    "/2fa/setup",
    response_model=TwoFactorSetupResponse,
)
def setup_two_factor(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        setup_data = service.setup_two_factor(current_user)

        return TwoFactorSetupResponse(
            secret=setup_data["secret"],
            provisioning_uri=setup_data["provisioning_uri"],
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.post(
    "/2fa/confirm",
    response_model=TwoFactorConfirmResponse,
)
def confirm_two_factor(
    confirm_data: TwoFactorConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        user = service.confirm_two_factor(
            user=current_user,
            code=confirm_data.code,
        )

        return TwoFactorConfirmResponse(
            is_2fa_enabled=user.is_2fa_enabled,
            message="Two-factor authentication enabled successfully",
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.post(
    "/2fa/verify-login",
    response_model=TokenResponse,
)
def verify_two_factor_login(
    verify_data: TwoFactorVerifyLoginRequest,
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        payload = decode_token(verify_data.two_factor_token)

        if payload.get("token_type") != "2fa_pending":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor token",
            )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor token",
            )

        user = service.get_user_by_id(UUID(user_id))

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor token",
        )

    if service.is_user_locked(user):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account temporarily locked. Try again later.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if not user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled",
        )

    is_valid_code = service.verify_two_factor_code(
        user=user,
        code=verify_data.code,
    )

    if not is_valid_code:
        service.record_failed_login(user)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor authentication code",
        )

    service.record_successful_login(user)

    return TokenResponse(
        access_token=build_access_token_for_user(user),
        token_type="bearer",
    )


@router.post(
    "/2fa/disable",
    response_model=TwoFactorConfirmResponse,
)
def disable_two_factor(
    disable_data: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db)

    try:
        user = service.disable_two_factor(
            user=current_user,
            password=disable_data.password,
            code=disable_data.code,
        )

        return TwoFactorConfirmResponse(
            is_2fa_enabled=user.is_2fa_enabled,
            message="Two-factor authentication disabled successfully",
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user
