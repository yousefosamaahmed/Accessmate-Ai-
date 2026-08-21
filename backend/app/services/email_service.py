import logging
import smtplib
from email.message import EmailMessage

from app.core.settings import settings


logger = logging.getLogger(__name__)


class EmailService:
    """
    SMTP email service for AccessMate OTP flows.

    Development behavior:
    If SMTP is not configured, the service does not fail the request.
    It logs the OTP to the backend terminal so the flow can still be tested locally.
    """

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        self.smtp_from_name = settings.SMTP_FROM_NAME
        self.smtp_use_tls = settings.SMTP_USE_TLS

    @property
    def is_configured(self) -> bool:
        return bool(
            self.smtp_host
            and self.smtp_port
            and self.smtp_username
            and self.smtp_password
            and self.smtp_from_email
        )

    def send_otp_email(
        self,
        to_email: str,
        code: str,
        purpose: str = "login",
        full_name: str | None = None,
    ) -> tuple[bool, str | None]:
        subject = self._build_subject(purpose)
        body = self._build_body(
            code=code,
            purpose=purpose,
            full_name=full_name,
        )

        if not self.is_configured:
            logger.warning(
                "SMTP is not configured. AccessMate OTP for %s: %s",
                to_email,
                code,
            )
            print(f"\n[AccessMate DEV OTP] {purpose} code for {to_email}: {code}\n")
            return True, None

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = f"{self.smtp_from_name} <{self.smtp_from_email}>"
        message["To"] = to_email
        message.set_content(body)

        try:
            if self.smtp_use_tls:
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=20) as server:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(message)
            else:
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=20) as server:
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(message)

            return True, None

        except Exception as exc:
            logger.exception("Failed to send OTP email")
            return False, str(exc)

    def _build_subject(self, purpose: str) -> str:
        if purpose == "password_reset":
            return "AccessMate AI password reset code"

        return "AccessMate AI login verification code"

    def _build_body(
        self,
        code: str,
        purpose: str,
        full_name: str | None = None,
    ) -> str:
        greeting_name = full_name or "there"

        if purpose == "password_reset":
            action_line = "Use this code to reset your AccessMate AI password."
        else:
            action_line = "Use this code to complete your AccessMate AI login."

        return (
            f"Hello {greeting_name},\n\n"
            f"{action_line}\n\n"
            f"Your verification code is: {code}\n\n"
            "This code expires in 5 minutes. If you did not request this code, you can ignore this email.\n\n"
            "AccessMate AI"
        )
