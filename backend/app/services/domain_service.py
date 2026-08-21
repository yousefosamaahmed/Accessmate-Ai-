from urllib.parse import urlparse


class DomainService:
    def extract_domain(self, url: str) -> str:
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"

        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()

        if domain.startswith("www."):
            domain = domain[4:]

        return domain

    def normalize_domain(self, domain: str) -> str:
        domain = domain.lower().strip()

        if domain.startswith("www."):
            domain = domain[4:]

        return domain

    def has_suspicious_subdomains(self, domain: str) -> bool:
        return domain.count(".") >= 3

    def has_dash(self, domain: str) -> bool:
        return "-" in domain

    def contains_suspicious_keyword(self, domain: str) -> bool:
        suspicious_keywords = [
            "login",
            "verify",
            "secure",
            "account",
            "bank",
            "wallet",
            "password",
            "update",
        ]

        return any(keyword in domain for keyword in suspicious_keywords)