import pyotp


class TwoFactorService:
    def __init__(self, issuer_name: str = "AccessMate AI"):
        self.issuer_name = issuer_name

    def generate_secret(self) -> str:
        return pyotp.random_base32()

    def build_provisioning_uri(
        self,
        email: str,
        secret: str
    ) -> str:
        totp = pyotp.TOTP(secret)

        return totp.provisioning_uri(
            name=email,
            issuer_name=self.issuer_name
        )

    def verify_code(
        self,
        secret: str,
        code: str
    ) -> bool:
        if not secret:
            return False

        if not code or not code.strip():
            return False

        clean_code = code.strip().replace(" ", "")

        if not clean_code.isdigit():
            return False

        totp = pyotp.TOTP(secret)

        return totp.verify(
            clean_code,
            valid_window=1
        )