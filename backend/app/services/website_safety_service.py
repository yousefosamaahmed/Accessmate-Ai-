import ipaddress
import json
import os
import re
import ssl
import threading
import time
import unicodedata
from difflib import SequenceMatcher
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

import certifi

from app.services.llm_service import LLMService


try:
    from publicsuffix2 import get_sld
except ImportError:
    get_sld = None


class WebsiteSafetyService:
    """
    AccessMate Website Safety Engine V3.

    Free/community threat-intelligence stack:
    - PhishTank: live phishing URL lookup. app_key is optional.
    - OpenPhish Community Feed: local cached phishing feed.
    - URLhaus Community API: malware URL lookup. Free Auth-Key required.

    The service never opens the user-supplied URL itself. It only analyzes
    the URL string and sends it to configured reputation providers.
    """

    ENGINE_VERSION = "website_safety_v3"

    PHISHTANK_ENDPOINT = "https://checkurl.phishtank.com/checkurl/"
    OPENPHISH_COMMUNITY_FEED_URL = (
        "https://raw.githubusercontent.com/openphish/"
        "public_feed/refs/heads/main/feed.txt"
    )
    URLHAUS_LOOKUP_ENDPOINT = "https://urlhaus-api.abuse.ch/v1/url/"

    _openphish_lock = threading.RLock()
    _openphish_urls: set[str] = set()
    _openphish_loaded_at: float = 0.0

    def __init__(self):
        self.llm_service = LLMService()

        self.phishtank_app_key = os.getenv(
            "PHISHTANK_APP_KEY",
            "",
        ).strip()

        self.phishtank_user_agent = os.getenv(
            "PHISHTANK_USER_AGENT",
            "AccessMateAI/1.0",
        ).strip() or "AccessMateAI/1.0"

        self.openphish_enabled = (
            os.getenv("OPENPHISH_ENABLED", "true")
            .strip()
            .lower()
            not in {"0", "false", "no", "off"}
        )

        self.openphish_feed_url = os.getenv(
            "OPENPHISH_COMMUNITY_FEED_URL",
            self.OPENPHISH_COMMUNITY_FEED_URL,
        ).strip()

        self.openphish_refresh_seconds = max(
            3600,
            int(
                os.getenv(
                    "OPENPHISH_REFRESH_SECONDS",
                    str(12 * 60 * 60),
                )
            ),
        )

        self.urlhaus_auth_key = os.getenv(
            "URLHAUS_AUTH_KEY",
            "",
        ).strip()

        self.threat_request_timeout_seconds = max(
            1.0,
            float(
                os.getenv(
                    "WEBSITE_SAFETY_TIMEOUT_SECONDS",
                    "5.0",
                )
            ),
        )

        # Use certifi's maintained Mozilla CA bundle for HTTPS provider
        # verification while keeping TLS certificate checks enabled.
        self.ssl_context = ssl.create_default_context(
            cafile=certifi.where()
        )

        self.shortener_domains = {
            "bit.ly",
            "tinyurl.com",
            "t.co",
            "goo.gl",
            "ow.ly",
            "is.gd",
            "buff.ly",
            "cutt.ly",
            "rebrand.ly",
            "shorturl.at",
            "tiny.cc",
            "rb.gy",
            "lnkd.in",
            "youtu.be",
            "s.id",
            "v.gd",
            "qrco.de",
            "trib.al",
        }

        self.sensitive_keywords = {
            "login",
            "signin",
            "sign-in",
            "verify",
            "verification",
            "account",
            "secure",
            "security",
            "password",
            "wallet",
            "bank",
            "paypal",
            "invoice",
            "payment",
            "update",
            "support",
            "reset",
            "confirm",
            "authentication",
            "authenticate",
            "unlock",
            "recover",
            "billing",
            "gift",
            "bonus",
            "reward",
            "crypto",
            "seed",
            "mnemonic",
            "2fa",
            "otp",
        }

        # TLD alone is never proof of maliciousness.
        self.suspicious_tlds = {
            "zip",
            "mov",
            "top",
            "xyz",
            "click",
            "country",
            "stream",
            "download",
            "loan",
            "win",
            "party",
            "review",
            "work",
            "support",
            "cam",
            "rest",
            "quest",
            "gq",
            "tk",
            "cf",
            "ml",
        }

        self.official_domain_registry = {
            "google": {
                "google.com",
                "googleapis.com",
                "googleusercontent.com",
                "gstatic.com",
                "youtube.com",
            },
            "microsoft": {
                "microsoft.com",
                "live.com",
                "office.com",
                "office365.com",
                "outlook.com",
                "azure.com",
                "windows.com",
                "microsoftonline.com",
            },
            "apple": {
                "apple.com",
                "icloud.com",
            },
            "openai": {
                "openai.com",
                "chatgpt.com",
            },
            "github": {
                "github.com",
                "githubusercontent.com",
            },
            "adobe": {
                "adobe.com",
                "acrobat.com",
            },
            "dropbox": {
                "dropbox.com",
            },
            "zoom": {
                "zoom.us",
            },
            "facebook": {
                "facebook.com",
                "fb.com",
            },
            "instagram": {
                "instagram.com",
            },
            "whatsapp": {
                "whatsapp.com",
                "wa.me",
            },
            "meta": {
                "meta.com",
            },
            "linkedin": {
                "linkedin.com",
            },
            "telegram": {
                "telegram.org",
                "t.me",
            },
            "discord": {
                "discord.com",
                "discord.gg",
            },
            "x": {
                "x.com",
                "twitter.com",
            },
            "tiktok": {
                "tiktok.com",
            },
            "snapchat": {
                "snapchat.com",
            },
            "amazon": {
                "amazon.com",
                "amazon.eg",
                "amazon.sa",
                "amazon.ae",
                "amazon.co.uk",
            },
            "netflix": {
                "netflix.com",
            },
            "spotify": {
                "spotify.com",
            },
            "paypal": {
                "paypal.com",
                "paypalobjects.com",
            },
            "stripe": {
                "stripe.com",
            },
            "visa": {
                "visa.com",
            },
            "mastercard": {
                "mastercard.com",
            },
            "binance": {
                "binance.com",
            },
            "coinbase": {
                "coinbase.com",
            },
            "vodafone": {
                "vodafone.com",
                "vodafone.com.eg",
            },
            "orange": {
                "orange.com",
                "orange.eg",
            },
            "telecom_egypt_we": {
                "te.eg",
            },
            "etisalat_eand": {
                "eand.com",
                "etisalat.ae",
            },
            "cib_egypt": {
                "cibeg.com",
            },
            "national_bank_of_egypt": {
                "nbe.com.eg",
            },
            "banque_misr": {
                "banquemisr.com",
            },
        }

        self._load_extra_official_domains_from_env()

        self.brand_aliases = {
            "google": {"google", "gmail", "youtube"},
            "microsoft": {
                "microsoft",
                "office",
                "office365",
                "outlook",
                "onedrive",
                "azure",
                "windows",
            },
            "apple": {"apple", "icloud", "appleid"},
            "openai": {"openai", "chatgpt"},
            "github": {"github"},
            "adobe": {"adobe", "acrobat"},
            "dropbox": {"dropbox"},
            "zoom": {"zoom"},
            "facebook": {"facebook", "fb"},
            "instagram": {"instagram"},
            "whatsapp": {"whatsapp"},
            "meta": {"meta"},
            "linkedin": {"linkedin"},
            "telegram": {"telegram"},
            "discord": {"discord"},
            "x": {"twitter"},
            "tiktok": {"tiktok"},
            "snapchat": {"snapchat"},
            "amazon": {"amazon"},
            "netflix": {"netflix"},
            "spotify": {"spotify"},
            "paypal": {"paypal"},
            "stripe": {"stripe"},
            "visa": {"visa"},
            "mastercard": {"mastercard"},
            "binance": {"binance"},
            "coinbase": {"coinbase"},
            "vodafone": {"vodafone"},
            "orange": {"orange"},
            "telecom_egypt_we": {"telecomegypt"},
            "etisalat_eand": {"etisalat", "eand"},
            "cib_egypt": {"cib"},
            "national_bank_of_egypt": {"nbe"},
            "banque_misr": {"banquemisr"},
        }

        self.character_substitutions = str.maketrans(
            {
                "0": "o",
                "1": "l",
                "3": "e",
                "4": "a",
                "5": "s",
                "7": "t",
                "@": "a",
                "$": "s",
            }
        )

    # ========================================================
    # CONFIGURATION
    # ========================================================

    def _load_extra_official_domains_from_env(self) -> None:
        raw_value = os.getenv(
            "OFFICIAL_DOMAIN_REGISTRY_JSON",
            "",
        ).strip()

        if not raw_value:
            return

        try:
            parsed = json.loads(raw_value)

            if not isinstance(parsed, dict):
                return

            for brand, domains in parsed.items():
                brand_name = str(brand).strip().lower()

                if not brand_name:
                    continue

                if isinstance(domains, str):
                    domains = [domains]

                if not isinstance(domains, list):
                    continue

                clean_domains = {
                    str(domain).strip().lower().rstrip(".")
                    for domain in domains
                    if str(domain).strip()
                }

                if clean_domains:
                    self.official_domain_registry.setdefault(
                        brand_name,
                        set(),
                    ).update(clean_domains)

        except Exception:
            return

    # ========================================================
    # URL NORMALIZATION / PARSING
    # ========================================================

    def _normalize_url(self, url: str) -> str:
        clean_url = str(url or "").strip()

        if not clean_url:
            raise ValueError("URL is required")

        if len(clean_url) > 4096:
            raise ValueError("URL is too long")

        clean_url = clean_url.strip(" \t\r\n<>\"'")

        if not re.match(
            r"^[a-zA-Z][a-zA-Z0-9+.-]*://",
            clean_url,
        ):
            clean_url = f"https://{clean_url}"

        parsed = urlparse(clean_url)

        if parsed.scheme.lower() not in {"http", "https"}:
            raise ValueError(
                "Only HTTP and HTTPS URLs are supported"
            )

        if not parsed.hostname:
            raise ValueError("Invalid URL format")

        hostname = parsed.hostname.rstrip(".")

        try:
            ascii_hostname = hostname.encode(
                "idna"
            ).decode("ascii")
        except UnicodeError as error:
            raise ValueError(
                "The domain name contains invalid characters"
            ) from error

        username = parsed.username
        password = parsed.password

        host_for_netloc = ascii_hostname

        try:
            port = parsed.port
        except ValueError:
            port = None

        if ":" in ascii_hostname and not ascii_hostname.startswith("["):
            host_for_netloc = f"[{ascii_hostname}]"

        userinfo = ""

        if username is not None:
            userinfo = username

            if password is not None:
                userinfo += f":{password}"

            userinfo += "@"

        if port is not None:
            netloc = f"{userinfo}{host_for_netloc}:{port}"
        else:
            netloc = f"{userinfo}{host_for_netloc}"

        normalized = urlunparse(
            (
                parsed.scheme.lower(),
                netloc,
                parsed.path or "",
                parsed.params or "",
                parsed.query or "",
                "",
            )
        )

        return normalized

    def _extract_domain_parts(
        self,
        normalized_url: str,
    ) -> dict:
        parsed = urlparse(normalized_url)

        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()
        hostname = (
            parsed.hostname.lower().rstrip(".")
            if parsed.hostname
            else ""
        )

        if not scheme or not netloc or not hostname:
            raise ValueError("Invalid URL format")

        if scheme not in {"http", "https"}:
            raise ValueError(
                "Only HTTP and HTTPS URLs are supported"
            )

        domain_parts = hostname.split(".")
        tld = domain_parts[-1] if domain_parts else ""

        registrable_domain = self._get_registrable_domain(
            hostname
        )

        return {
            "parsed": parsed,
            "scheme": scheme,
            "netloc": netloc,
            "hostname": hostname,
            "domain_parts": domain_parts,
            "tld": tld,
            "registrable_domain": registrable_domain,
        }

    def _get_registrable_domain(
        self,
        hostname: str,
    ) -> str:
        is_ip, _ = self._is_ip_address(hostname)

        if is_ip:
            return hostname

        if get_sld is not None:
            try:
                result = get_sld(
                    hostname,
                    strict=False,
                )

                if result:
                    return str(result).lower().rstrip(".")
            except Exception:
                pass

        labels = hostname.split(".")

        if len(labels) <= 2:
            return hostname

        common_two_part_suffixes = {
            "co.uk",
            "org.uk",
            "ac.uk",
            "gov.uk",
            "com.eg",
            "net.eg",
            "org.eg",
            "edu.eg",
            "gov.eg",
            "com.sa",
            "com.ae",
            "co.za",
            "com.au",
            "com.br",
            "co.jp",
            "co.in",
        }

        suffix = ".".join(labels[-2:])

        if (
            suffix in common_two_part_suffixes
            and len(labels) >= 3
        ):
            return ".".join(labels[-3:])

        return ".".join(labels[-2:])

    def _canonicalize_for_feed(
        self,
        url: str,
    ) -> str:
        try:
            parsed = urlparse(url.strip())

            if not parsed.scheme or not parsed.hostname:
                return url.strip()

            hostname = parsed.hostname.lower().rstrip(".")

            try:
                port = parsed.port
            except ValueError:
                port = None

            if ":" in hostname and not hostname.startswith("["):
                hostname = f"[{hostname}]"

            if (
                port is not None
                and not (
                    parsed.scheme.lower() == "http"
                    and port == 80
                )
                and not (
                    parsed.scheme.lower() == "https"
                    and port == 443
                )
            ):
                netloc = f"{hostname}:{port}"
            else:
                netloc = hostname

            path = parsed.path or "/"

            canonical = urlunparse(
                (
                    parsed.scheme.lower(),
                    netloc,
                    path,
                    "",
                    parsed.query or "",
                    "",
                )
            )

            if (
                canonical.endswith("/")
                and not parsed.query
            ):
                canonical = canonical[:-1]

            return canonical

        except Exception:
            return url.strip()

    # ========================================================
    # SIGNAL HELPERS
    # ========================================================

    def _add_signal(
        self,
        signals: list[dict],
        signal: str,
        severity: str,
        description: str,
        source: str = "heuristic",
    ) -> None:
        signals.append(
            {
                "signal": signal,
                "severity": severity,
                "description": description,
                "source": source,
            }
        )

    def _score_signal(
        self,
        severity: str,
    ) -> int:
        scores = {
            "critical": 40,
            "high": 25,
            "medium": 14,
            "low": 6,
            "info": 0,
        }

        return scores.get(severity, 0)

    def _calculate_risk_level(
        self,
        score: int,
    ) -> str:
        if score >= 75:
            return "dangerous"

        if score >= 45:
            return "suspicious"

        if score >= 20:
            return "caution"

        return "low"

    def _recommended_action(
        self,
        risk_level: str,
        is_known_threat: bool,
    ) -> str:
        if is_known_threat or risk_level == "dangerous":
            return "block"

        if risk_level == "suspicious":
            return "warn"

        if risk_level == "caution":
            return "caution"

        return "allow"

    def _truthy(self, value) -> bool:
        if isinstance(value, bool):
            return value

        if value is None:
            return False

        return str(value).strip().lower() in {
            "1",
            "true",
            "yes",
            "y",
            "on",
        }

    # ========================================================
    # IP / NETWORK
    # ========================================================

    def _is_ip_address(
        self,
        hostname: str,
    ) -> tuple[bool, bool]:
        try:
            ip = ipaddress.ip_address(hostname)

            is_private_or_local = (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            )

            return True, is_private_or_local

        except ValueError:
            return False, False

    # ========================================================
    # UNICODE / PUNYCODE / HOMOGRAPH
    # ========================================================

    def _looks_like_punycode(
        self,
        hostname: str,
    ) -> bool:
        return any(
            label.startswith("xn--")
            for label in hostname.split(".")
        )

    def _decode_hostname_unicode(
        self,
        hostname: str,
    ) -> str:
        decoded_labels = []

        for label in hostname.split("."):
            try:
                decoded_labels.append(
                    label.encode("ascii").decode("idna")
                )
            except Exception:
                decoded_labels.append(label)

        return ".".join(decoded_labels)

    def _character_script(
        self,
        character: str,
    ) -> str | None:
        if character.isdigit() or character in {"-", "."}:
            return None

        try:
            name = unicodedata.name(character)
        except ValueError:
            return None

        for script in (
            "LATIN",
            "CYRILLIC",
            "GREEK",
            "ARABIC",
            "HEBREW",
            "HIRAGANA",
            "KATAKANA",
            "HANGUL",
            "CJK",
        ):
            if script in name:
                return script

        return None

    def _has_mixed_scripts(
        self,
        hostname: str,
    ) -> bool:
        unicode_hostname = self._decode_hostname_unicode(
            hostname
        )

        for label in unicode_hostname.split("."):
            scripts = {
                script
                for character in label
                if (
                    script := self._character_script(
                        character
                    )
                )
            }

            if len(scripts) > 1:
                return True

        return False

    # ========================================================
    # URL HEURISTICS
    # ========================================================

    def _contains_suspicious_keyword(
        self,
        hostname: str,
        path: str,
        query: str,
    ) -> list[str]:
        combined = (
            f"{hostname} {path} {query}"
        ).lower()

        return sorted(
            {
                keyword
                for keyword in self.sensitive_keywords
                if keyword in combined
            }
        )

    def _has_excessive_encoding(
        self,
        normalized_url: str,
    ) -> bool:
        percent_encoded = re.findall(
            r"%[0-9a-fA-F]{2}",
            normalized_url,
        )

        return len(percent_encoded) >= 6

    def _has_suspicious_query_density(
        self,
        query: str,
    ) -> bool:
        if not query:
            return False

        try:
            pairs = parse_qsl(
                query,
                keep_blank_values=True,
            )
        except Exception:
            return False

        return len(pairs) >= 10

    # ========================================================
    # OFFICIAL DOMAINS / BRAND IMPERSONATION
    # ========================================================

    def _domain_matches_root(
        self,
        hostname: str,
        root_domain: str,
    ) -> bool:
        hostname = hostname.lower().rstrip(".")
        root_domain = root_domain.lower().rstrip(".")

        return (
            hostname == root_domain
            or hostname.endswith(
                f".{root_domain}"
            )
        )

    def _find_official_domain(
        self,
        hostname: str,
        registrable_domain: str,
    ) -> tuple[str | None, str | None]:
        for brand, official_roots in (
            self.official_domain_registry.items()
        ):
            for root_domain in official_roots:
                if (
                    self._domain_matches_root(
                        hostname,
                        root_domain,
                    )
                    or registrable_domain == root_domain
                ):
                    return brand, root_domain

        return None, None

    def _brand_root_label(
        self,
        root_domain: str,
    ) -> str:
        registrable = self._get_registrable_domain(
            root_domain
        )

        labels = registrable.split(".")

        return labels[0] if labels else registrable

    def _normalize_similarity_text(
        self,
        value: str,
    ) -> str:
        value = (
            value.lower()
            .translate(
                self.character_substitutions
            )
        )

        return re.sub(
            r"[^a-z0-9]",
            "",
            value,
        )

    def _brand_impersonation_analysis(
        self,
        hostname: str,
        registrable_domain: str,
    ) -> dict:
        official_brand, official_root = (
            self._find_official_domain(
                hostname,
                registrable_domain,
            )
        )

        if official_brand and official_root:
            return {
                "status": "official",
                "brand": official_brand,
                "official_root_domain": official_root,
                "registrable_domain": registrable_domain,
                "is_official_domain": True,
                "is_trusted_domain": False,
                "is_possible_impersonation": False,
                "similarity_score": 1.0,
            }

        candidate_label = self._brand_root_label(
            registrable_domain
        )

        candidate_normalized = (
            self._normalize_similarity_text(
                candidate_label
            )
        )

        host_tokens = {
            self._normalize_similarity_text(token)
            for token in re.split(
                r"[-._]+",
                self._decode_hostname_unicode(
                    hostname
                ),
            )
            if token
        }

        best_match = None

        for brand, aliases in self.brand_aliases.items():
            official_roots = (
                self.official_domain_registry.get(
                    brand,
                    set(),
                )
            )

            for alias in aliases:
                alias_normalized = (
                    self._normalize_similarity_text(
                        alias
                    )
                )

                if len(alias_normalized) < 3:
                    continue

                similarity = SequenceMatcher(
                    None,
                    candidate_normalized,
                    alias_normalized,
                ).ratio()

                exact_brand_token = False

                for token in host_tokens:
                    if len(token) < 3:
                        continue

                    if token == alias_normalized:
                        exact_brand_token = True

                    similarity = max(
                        similarity,
                        SequenceMatcher(
                            None,
                            token,
                            alias_normalized,
                        ).ratio(),
                    )

                # For a non-official domain, an exact brand token is a
                # strong signal but not a 100% whole-domain similarity.
                if exact_brand_token:
                    similarity = max(
                        min(similarity, 0.96),
                        0.96,
                    )

                if similarity < 0.78:
                    continue

                official_root_candidate = (
                    sorted(official_roots)[0]
                    if official_roots
                    else None
                )

                candidate = {
                    "status": "possible_impersonation",
                    "brand": brand,
                    "official_root_domain": (
                        official_root_candidate
                    ),
                    "registrable_domain": (
                        registrable_domain
                    ),
                    "is_official_domain": False,
                    "is_trusted_domain": False,
                    "is_possible_impersonation": True,
                    "similarity_score": round(
                        min(similarity, 0.99),
                        4,
                    ),
                }

                if (
                    best_match is None
                    or candidate["similarity_score"]
                    > best_match["similarity_score"]
                ):
                    best_match = candidate

        if best_match:
            return best_match

        return {
            "status": "unknown",
            "brand": None,
            "official_root_domain": None,
            "registrable_domain": registrable_domain,
            "is_official_domain": False,
            "is_trusted_domain": False,
            "is_possible_impersonation": False,
            "similarity_score": None,
        }

    # ========================================================
    # PHISHTANK
    # ========================================================

    def _check_phishtank(
        self,
        normalized_url: str,
    ) -> dict:
        provider_result = {
            "provider": "phishtank",
            "status": "not_checked",
            "matched": False,
            "threat_types": [],
            "details": None,
        }

        form_data = {
            "url": normalized_url,
            "format": "json",
        }

        if self.phishtank_app_key:
            form_data["app_key"] = self.phishtank_app_key

        request = Request(
            self.PHISHTANK_ENDPOINT,
            data=urlencode(form_data).encode("utf-8"),
            method="POST",
            headers={
                "Accept": "application/json",
                "Content-Type": (
                    "application/x-www-form-urlencoded"
                ),
                "User-Agent": self.phishtank_user_agent,
            },
        )

        try:
            with urlopen(
                request,
                timeout=self.threat_request_timeout_seconds,
                context=self.ssl_context,
            ) as response:
                raw_body = response.read().decode(
                    "utf-8",
                    errors="replace",
                )

            payload = json.loads(raw_body or "{}")
            results = payload.get("results", {})

            if not isinstance(results, dict):
                results = {}

            in_database = self._truthy(
                results.get("in_database")
            )
            verified = self._truthy(
                results.get("verified")
            )
            valid = self._truthy(
                results.get("valid")
            )

            matched = (
                in_database
                and verified
                and valid
            )

            if matched:
                provider_result.update(
                    {
                        "status": "matched",
                        "matched": True,
                        "threat_types": [
                            "verified_phishing"
                        ],
                        "details": (
                            "PhishTank reports this URL as a "
                            "verified and currently valid phishing URL."
                        ),
                    }
                )

            elif in_database:
                provider_result.update(
                    {
                        "status": "clean",
                        "matched": False,
                        "threat_types": [],
                        "details": (
                            "The URL exists in PhishTank, but it is "
                            "not currently both verified and valid."
                        ),
                    }
                )

            else:
                provider_result.update(
                    {
                        "status": "clean",
                        "matched": False,
                        "threat_types": [],
                        "details": (
                            "PhishTank returned no current database "
                            "match for this URL. This is not proof "
                            "that the URL is safe."
                        ),
                    }
                )

        except HTTPError as error:
            if error.code == 509:
                provider_result.update(
                    {
                        "status": "unavailable",
                        "details": (
                            "PhishTank rate limit was reached. "
                            "Configure PHISHTANK_APP_KEY for a "
                            "higher request limit."
                        ),
                    }
                )
            else:
                provider_result.update(
                    {
                        "status": "error",
                        "details": (
                            "PhishTank HTTP error "
                            f"{error.code}."
                        ),
                    }
                )

        except (
            URLError,
            TimeoutError,
            ValueError,
            json.JSONDecodeError,
        ) as error:
            provider_result.update(
                {
                    "status": "unavailable",
                    "details": (
                        "PhishTank is currently unavailable: "
                        f"{str(error)}"
                    ),
                }
            )

        except Exception as error:
            provider_result.update(
                {
                    "status": "error",
                    "details": (
                        "PhishTank lookup failed: "
                        f"{str(error)}"
                    ),
                }
            )

        return provider_result

    # ========================================================
    # OPENPHISH COMMUNITY FEED
    # ========================================================

    def _download_openphish_feed(
        self,
    ) -> set[str]:
        request = Request(
            self.openphish_feed_url,
            method="GET",
            headers={
                "Accept": "text/plain",
                "User-Agent": "AccessMateAI/1.0",
            },
        )

        with urlopen(
            request,
            timeout=max(
                self.threat_request_timeout_seconds,
                8.0,
            ),
            context=self.ssl_context,
        ) as response:
            raw_body = response.read().decode(
                "utf-8",
                errors="replace",
            )

        urls: set[str] = set()

        for line in raw_body.splitlines():
            candidate = line.strip()

            if not candidate:
                continue

            if candidate.startswith("#"):
                continue

            if not re.match(
                r"^https?://",
                candidate,
                re.IGNORECASE,
            ):
                continue

            urls.add(
                self._canonicalize_for_feed(
                    candidate
                )
            )

        return urls

    def _ensure_openphish_cache(
        self,
    ) -> tuple[bool, str | None]:
        if not self.openphish_enabled:
            return False, "OpenPhish Community Feed is disabled."

        now = time.time()

        with self._openphish_lock:
            cache_age = (
                now - self._openphish_loaded_at
                if self._openphish_loaded_at
                else None
            )

            if (
                self._openphish_urls
                and cache_age is not None
                and cache_age
                < self.openphish_refresh_seconds
            ):
                return True, None

            try:
                fresh_urls = (
                    self._download_openphish_feed()
                )

                if not fresh_urls:
                    raise ValueError(
                        "OpenPhish feed was empty"
                    )

                self.__class__._openphish_urls = (
                    fresh_urls
                )
                self.__class__._openphish_loaded_at = (
                    now
                )

                return True, None

            except Exception as error:
                if self._openphish_urls:
                    return (
                        False,
                        (
                            "OpenPhish refresh failed; a stale "
                            f"cache is available: {str(error)}"
                        ),
                    )

                return (
                    False,
                    (
                        "OpenPhish feed could not be loaded: "
                        f"{str(error)}"
                    ),
                )

    def _check_openphish(
        self,
        normalized_url: str,
    ) -> dict:
        provider_result = {
            "provider": "openphish_community",
            "status": "not_checked",
            "matched": False,
            "threat_types": [],
            "details": None,
        }

        cache_fresh, cache_error = (
            self._ensure_openphish_cache()
        )

        if (
            not self.openphish_enabled
        ):
            provider_result["details"] = (
                "OpenPhish Community Feed is disabled."
            )
            return provider_result

        canonical_url = self._canonicalize_for_feed(
            normalized_url
        )

        with self._openphish_lock:
            matched = (
                canonical_url
                in self._openphish_urls
            )

            cache_loaded = bool(
                self._openphish_urls
            )

            cache_age_seconds = (
                max(
                    0,
                    int(
                        time.time()
                        - self._openphish_loaded_at
                    ),
                )
                if self._openphish_loaded_at
                else None
            )

        if matched:
            provider_result.update(
                {
                    "status": "matched",
                    "matched": True,
                    "threat_types": [
                        "phishing"
                    ],
                    "details": (
                        "The URL appears in the OpenPhish "
                        "Community Feed."
                    ),
                }
            )

            if not cache_fresh and cache_error:
                provider_result["details"] += (
                    " The match came from the last cached "
                    "feed because refresh failed."
                )

            return provider_result

        if cache_fresh and cache_loaded:
            provider_result.update(
                {
                    "status": "clean",
                    "matched": False,
                    "threat_types": [],
                    "details": (
                        "The current OpenPhish Community Feed "
                        "did not contain an exact match for this "
                        "URL. This is not proof that the URL is safe."
                    ),
                }
            )

            if cache_age_seconds is not None:
                provider_result["details"] += (
                    f" Cache age: {cache_age_seconds} seconds."
                )

            return provider_result

        if cache_loaded:
            provider_result.update(
                {
                    "status": "unavailable",
                    "matched": False,
                    "threat_types": [],
                    "details": (
                        cache_error
                        or (
                            "OpenPhish cache exists, but it could "
                            "not be refreshed. No stale non-match "
                            "is treated as a clean result."
                        )
                    ),
                }
            )

            return provider_result

        provider_result.update(
            {
                "status": "unavailable",
                "matched": False,
                "threat_types": [],
                "details": (
                    cache_error
                    or "OpenPhish Community Feed is unavailable."
                ),
            }
        )

        return provider_result

    # ========================================================
    # URLHAUS
    # ========================================================

    def _check_urlhaus(
        self,
        normalized_url: str,
    ) -> dict:
        provider_result = {
            "provider": "urlhaus",
            "status": "not_checked",
            "matched": False,
            "threat_types": [],
            "details": None,
        }

        if not self.urlhaus_auth_key:
            provider_result["details"] = (
                "URLHAUS_AUTH_KEY is not configured."
            )

            return provider_result

        request_body = urlencode(
            {
                "url": normalized_url,
            }
        ).encode("utf-8")

        request = Request(
            self.URLHAUS_LOOKUP_ENDPOINT,
            data=request_body,
            method="POST",
            headers={
                "Auth-Key": self.urlhaus_auth_key,
                "Accept": "application/json",
                "Content-Type": (
                    "application/x-www-form-urlencoded"
                ),
                "User-Agent": "AccessMateAI/1.0",
            },
        )

        try:
            with urlopen(
                request,
                timeout=self.threat_request_timeout_seconds,
                context=self.ssl_context,
            ) as response:
                payload = json.loads(
                    response.read().decode(
                        "utf-8",
                        errors="replace",
                    )
                    or "{}"
                )

            query_status = str(
                payload.get(
                    "query_status",
                    "",
                )
            ).lower()

            if query_status == "ok":
                threat_name = str(
                    payload.get(
                        "threat",
                        "malware_url",
                    )
                )

                tags = payload.get(
                    "tags",
                    [],
                )

                threat_types = [
                    threat_name
                ]

                if isinstance(tags, list):
                    threat_types.extend(
                        str(tag)
                        for tag in tags
                        if tag
                    )

                provider_result.update(
                    {
                        "status": "matched",
                        "matched": True,
                        "threat_types": sorted(
                            set(threat_types)
                        ),
                        "details": (
                            "URLhaus reports this URL in its "
                            "malware URL database."
                        ),
                    }
                )

            elif query_status == "no_results":
                provider_result.update(
                    {
                        "status": "clean",
                        "matched": False,
                        "threat_types": [],
                        "details": (
                            "URLhaus returned no malware URL "
                            "match. This is not proof that the "
                            "URL is safe."
                        ),
                    }
                )

            else:
                provider_result.update(
                    {
                        "status": "error",
                        "details": (
                            "URLhaus returned status: "
                            f"{query_status or 'unknown'}"
                        ),
                    }
                )

        except HTTPError as error:
            provider_result.update(
                {
                    "status": "error",
                    "details": (
                        "URLhaus HTTP error "
                        f"{error.code}."
                    ),
                }
            )

        except (
            URLError,
            TimeoutError,
            ValueError,
            json.JSONDecodeError,
        ) as error:
            provider_result.update(
                {
                    "status": "unavailable",
                    "details": (
                        "URLhaus is currently unavailable: "
                        f"{str(error)}"
                    ),
                }
            )

        except Exception as error:
            provider_result.update(
                {
                    "status": "error",
                    "details": (
                        "URLhaus lookup failed: "
                        f"{str(error)}"
                    ),
                }
            )

        return provider_result

    # ========================================================
    # THREAT INTELLIGENCE AGGREGATOR
    # ========================================================

    def _collect_threat_intelligence(
        self,
        normalized_url: str,
    ) -> dict:
        sources = [
            self._check_phishtank(
                normalized_url
            ),
            self._check_openphish(
                normalized_url
            ),
            self._check_urlhaus(
                normalized_url
            ),
        ]

        checked = any(
            item.get("status") in {
                "clean",
                "matched",
            }
            for item in sources
        )

        is_known_threat = any(
            bool(
                item.get("matched")
            )
            for item in sources
        )

        return {
            "checked": checked,
            "is_known_threat": is_known_threat,
            "sources": sources,
        }

    # ========================================================
    # VERDICT / RECOMMENDATION
    # ========================================================

    def _build_verdict(
        self,
        risk_level: str,
        is_known_threat: bool,
        official_info: dict,
    ) -> str:
        if is_known_threat:
            return (
                "This URL matches at least one configured "
                "phishing or malware intelligence source."
            )

        if official_info.get(
            "is_possible_impersonation"
        ):
            brand = (
                official_info.get(
                    "brand"
                )
                or "a known brand"
            )

            return (
                "This domain may be impersonating "
                f"{brand}."
            )

        if risk_level == "dangerous":
            return (
                "This link shows multiple high-risk signs. "
                "Do not enter passwords or personal information."
            )

        if risk_level == "suspicious":
            return (
                "This link has suspicious signs. Be careful "
                "before opening it or entering information."
            )

        if risk_level == "caution":
            return (
                "This link has some caution signs. "
                "Check the domain carefully."
            )

        if official_info.get(
            "is_official_domain"
        ):
            brand = (
                official_info.get(
                    "brand"
                )
                or "the recognized service"
            )

            return (
                "The domain matches a recognized official "
                f"domain for {brand}, and no major URL-level "
                "risk signs were found."
            )

        return (
            "No major URL-level risk signs were found, and "
            "the threat sources that completed returned no match."
        )

    def _build_recommendation(
        self,
        risk_level: str,
        is_known_threat: bool,
        official_info: dict,
    ) -> str:
        if is_known_threat or risk_level == "dangerous":
            return (
                "Do not log in, do not download files, and do "
                "not enter payment, password, recovery-code, "
                "or personal information. Open the official "
                "website manually instead."
            )

        if official_info.get(
            "is_possible_impersonation"
        ):
            official_root = official_info.get(
                "official_root_domain"
            )

            if official_root:
                return (
                    "Do not enter sensitive information. "
                    "Open the known official domain manually: "
                    f"{official_root}"
                )

            return (
                "Do not enter sensitive information until "
                "you verify the domain from an official source."
            )

        if risk_level == "suspicious":
            return (
                "Avoid entering sensitive information. Verify "
                "the domain from an official source before "
                "continuing."
            )

        if risk_level == "caution":
            return (
                "Proceed carefully. Confirm the domain spelling "
                "and avoid entering sensitive information until "
                "you trust the site."
            )

        return (
            "No obvious risk was detected, but this result is "
            "not proof that the website is safe. Continue only "
            "if you trust the destination and expected content."
        )

    # ========================================================
    # ACCESSIBLE EXPLANATION
    # ========================================================

    def _generate_simple_explanation(
        self,
        url: str,
        domain: str,
        registrable_domain: str,
        risk_score: int,
        risk_level: str,
        signals: list[dict],
        official_info: dict,
        threat_intelligence: dict,
        recommendation: str,
        language: str,
        explanation_level: str,
        voice_friendly: bool,
    ) -> str:
        signal_summary = "\n".join(
            [
                (
                    f"- {item['severity']}: "
                    f"{item['description']}"
                )
                for item in signals
            ]
        )

        if not signal_summary:
            signal_summary = (
                "- No major suspicious URL signs were found."
            )

        source_statuses = []

        for source in threat_intelligence.get(
            "sources",
            [],
        ):
            source_statuses.append(
                (
                    f"- {source.get('provider')}: "
                    f"status={source.get('status')}; "
                    f"matched={source.get('matched')}; "
                    f"threat_types="
                    f"{source.get('threat_types', [])}"
                )
            )

        threat_summary_text = (
            "\n".join(source_statuses)
            or "- No live threat provider is configured."
        )

        completed_providers = [
            source.get("provider")
            for source in threat_intelligence.get(
                "sources",
                [],
            )
            if source.get("status") in {
                "clean",
                "matched",
            }
        ]

        incomplete_providers = [
            source.get("provider")
            for source in threat_intelligence.get(
                "sources",
                [],
            )
            if source.get("status") in {
                "not_checked",
                "unavailable",
                "error",
            }
        ]

        system_prompt = f"""
You are AccessMate AI, an accessibility-first website safety assistant.

Your job:
Explain website-safety results clearly for blind users,
low-vision users, users with cognitive difficulty, and general users.

Rules:
- Use the requested language: {language}
- Explanation level: {explanation_level}
- Be precise and calm.
- This is a risk estimate, not absolute proof.
- Never claim a website is definitely safe.
- A clean provider result means only that provider returned no match.
- If a provider did not run or failed, do not describe it as clean.
- If all external providers failed or were not configured, explicitly say
  live threat intelligence could not be fully verified.
- If a phishing/malware provider matched, clearly warn the user.
- If the domain appears to impersonate a known brand, state that clearly.
- If the domain is recognized as official, say it matches the configured
  official-domain registry, but do not guarantee all content is safe.
- Use short sentences.
- If voice_friendly is true, make the response easy to listen to.
- Do not mention internal scoring rules.
""".strip()

        user_prompt = f"""
URL checked:
{url}

Hostname:
{domain}

Registrable domain:
{registrable_domain}

Official-domain analysis:
{json.dumps(official_info, ensure_ascii=False)}

Threat provider statuses:
{threat_summary_text}

Completed providers:
{completed_providers or 'none'}

Incomplete providers:
{incomplete_providers or 'none'}

Risk score:
{risk_score}/100

Risk level:
{risk_level}

Signals:
{signal_summary}

Recommendation:
{recommendation}

voice_friendly:
{voice_friendly}

Give a short accessible explanation followed by the practical action
the user should take.
""".strip()

        return self.llm_service.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.1,
            max_tokens=500,
        )

    def _fallback_explanation(
        self,
        domain: str,
        risk_level: str,
        recommendation: str,
        language: str,
        is_known_threat: bool,
        official_info: dict,
        threat_intelligence: dict,
    ) -> str:
        completed_count = sum(
            1
            for source in threat_intelligence.get(
                "sources",
                [],
            )
            if source.get("status") in {
                "clean",
                "matched",
            }
        )

        if language == "ar":
            if is_known_threat:
                return (
                    f"تم فحص النطاق {domain}. "
                    "ظهر الرابط في أحد مصادر التصيد أو البرمجيات "
                    "الضارة المفعلة. "
                    f"{recommendation}"
                )

            if official_info.get(
                "is_possible_impersonation"
            ):
                brand = (
                    official_info.get(
                        "brand"
                    )
                    or "علامة تجارية معروفة"
                )

                return (
                    f"النطاق {domain} قد يكون منتحلًا لهوية {brand}. "
                    f"{recommendation}"
                )

            if completed_count == 0:
                return (
                    f"تم فحص النطاق {domain}. "
                    f"مستوى الخطورة التقديري هو {risk_level}. "
                    "تعذر التحقق من مصادر التهديدات الخارجية حاليًا. "
                    f"{recommendation}"
                )

            return (
                f"تم فحص النطاق {domain}. "
                f"مستوى الخطورة التقديري هو {risk_level}. "
                "مصادر التهديدات التي اكتمل فحصها لم ترجع مطابقة "
                "معروفة، لكن هذا لا يضمن أن الموقع آمن. "
                f"{recommendation}"
            )

        if is_known_threat:
            return (
                f"The checked domain is {domain}. "
                "A configured phishing or malware source returned "
                "a threat match. "
                f"{recommendation}"
            )

        if official_info.get(
            "is_possible_impersonation"
        ):
            brand = (
                official_info.get(
                    "brand"
                )
                or "a known brand"
            )

            return (
                f"The domain {domain} may be impersonating {brand}. "
                f"{recommendation}"
            )

        if completed_count == 0:
            return (
                f"The checked domain is {domain}. "
                f"The estimated risk level is {risk_level}. "
                "External threat intelligence could not be verified. "
                f"{recommendation}"
            )

        return (
            f"The checked domain is {domain}. "
            f"The estimated risk level is {risk_level}. "
            "The threat providers that completed returned no known match, "
            "but that does not prove the website is safe. "
            f"{recommendation}"
        )

    # ========================================================
    # MAIN CHECK
    # ========================================================

    def check_url(
        self,
        url: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
    ) -> dict:
        normalized_url = self._normalize_url(
            url
        )

        parts = self._extract_domain_parts(
            normalized_url
        )

        scheme = parts["scheme"]
        netloc = parts["netloc"]
        hostname = parts["hostname"]
        domain_parts = parts["domain_parts"]
        tld = parts["tld"]
        parsed = parts["parsed"]
        registrable_domain = parts[
            "registrable_domain"
        ]

        signals: list[dict] = []

        official_info = (
            self._brand_impersonation_analysis(
                hostname=hostname,
                registrable_domain=(
                    registrable_domain
                ),
            )
        )

        is_official = bool(
            official_info.get(
                "is_official_domain"
            )
        )

        if is_official:
            self._add_signal(
                signals,
                signal="recognized_official_domain",
                severity="info",
                description=(
                    "The domain matches a configured "
                    "official-domain registry entry."
                ),
                source="official_domain_registry",
            )

        if official_info.get(
            "is_possible_impersonation"
        ):
            brand = (
                official_info.get(
                    "brand"
                )
                or "a known brand"
            )

            similarity = (
                official_info.get(
                    "similarity_score"
                )
                or 0.0
            )

            severity = (
                "critical"
                if similarity >= 0.90
                else "high"
            )

            self._add_signal(
                signals,
                signal="possible_brand_impersonation",
                severity=severity,
                description=(
                    "The domain resembles a known brand "
                    f"({brand}) but does not match its "
                    "configured official domain."
                ),
                source="brand_detection",
            )

        if (
            parsed.username
            or parsed.password
            or "@" in netloc
        ):
            self._add_signal(
                signals,
                signal="url_contains_credentials_or_at_symbol",
                severity="high",
                description=(
                    "The URL contains credentials or an @ symbol. "
                    "This can be used to hide the real destination."
                ),
            )

        if scheme != "https":
            self._add_signal(
                signals,
                signal="not_https",
                severity="medium",
                description=(
                    "The URL does not use HTTPS. Sensitive data "
                    "may not be protected in transit."
                ),
            )

        try:
            port = parsed.port
        except ValueError:
            port = None

            self._add_signal(
                signals,
                signal="invalid_port",
                severity="high",
                description=(
                    "The URL contains an invalid port value."
                ),
            )

        if port and port not in {80, 443}:
            self._add_signal(
                signals,
                signal="unusual_port",
                severity="low",
                description=(
                    f"The URL uses an uncommon web port: {port}."
                ),
            )

        is_ip, is_private_or_local = (
            self._is_ip_address(
                hostname
            )
        )

        if is_ip:
            self._add_signal(
                signals,
                signal="uses_ip_address",
                severity="high",
                description=(
                    "The URL uses an IP address instead of "
                    "a normal domain name."
                ),
            )

        if is_private_or_local:
            self._add_signal(
                signals,
                signal="private_or_local_address",
                severity="critical",
                description=(
                    "The URL points to a private, local, reserved, "
                    "or otherwise non-public address."
                ),
            )

        if self._looks_like_punycode(
            hostname
        ):
            self._add_signal(
                signals,
                signal="punycode_domain",
                severity="high",
                description=(
                    "The domain uses punycode. Punycode can be "
                    "legitimate, but it is also used in look-alike "
                    "domain attacks."
                ),
            )

        if self._has_mixed_scripts(
            hostname
        ):
            self._add_signal(
                signals,
                signal="mixed_script_domain",
                severity="critical",
                description=(
                    "The domain mixes writing systems inside a label. "
                    "This can indicate a Unicode homograph attack."
                ),
            )

        if (
            hostname in self.shortener_domains
            or registrable_domain
            in self.shortener_domains
        ):
            self._add_signal(
                signals,
                signal="url_shortener",
                severity="medium",
                description=(
                    "The URL uses a link-shortening service, "
                    "which can hide the final destination."
                ),
            )

        if (
            tld in self.suspicious_tlds
            and not is_official
        ):
            self._add_signal(
                signals,
                signal="higher_abuse_tld_indicator",
                severity="low",
                description=(
                    f"The domain uses .{tld}. The TLD alone is "
                    "not proof of abuse, but it adds a weak "
                    "caution signal."
                ),
            )

        if len(hostname) > 60:
            self._add_signal(
                signals,
                signal="very_long_domain",
                severity="medium",
                description=(
                    "The domain is unusually long, making "
                    "manual inspection harder."
                ),
            )

        if hostname.count("-") >= 3:
            self._add_signal(
                signals,
                signal="many_hyphens",
                severity="medium",
                description=(
                    "The domain contains many hyphens, a pattern "
                    "often seen in deceptive URLs."
                ),
            )

        if len(domain_parts) >= 5:
            self._add_signal(
                signals,
                signal="many_subdomains",
                severity="medium",
                description=(
                    "The URL has many subdomains. This can be "
                    "used to make a fake link appear official."
                ),
            )

        suspicious_keywords = (
            self._contains_suspicious_keyword(
                hostname=hostname,
                path=parsed.path,
                query=parsed.query,
            )
        )

        if (
            suspicious_keywords
            and not is_official
        ):
            self._add_signal(
                signals,
                signal="sensitive_keywords",
                severity="low",
                description=(
                    "The URL contains security-sensitive words "
                    "such as: "
                    + ", ".join(
                        suspicious_keywords
                    )
                ),
            )

        if self._has_excessive_encoding(
            normalized_url
        ):
            self._add_signal(
                signals,
                signal="excessive_url_encoding",
                severity="medium",
                description=(
                    "The URL contains unusually heavy percent "
                    "encoding, which can make the destination "
                    "harder to inspect."
                ),
            )

        if self._has_suspicious_query_density(
            parsed.query
        ):
            self._add_signal(
                signals,
                signal="many_query_parameters",
                severity="low",
                description=(
                    "The URL contains an unusually large number "
                    "of query parameters."
                ),
            )

        threat_intelligence = (
            self._collect_threat_intelligence(
                normalized_url
            )
        )

        is_known_threat = bool(
            threat_intelligence.get(
                "is_known_threat"
            )
        )

        for source in threat_intelligence.get(
            "sources",
            [],
        ):
            if source.get("matched"):
                self._add_signal(
                    signals,
                    signal=(
                        "known_threat_match_"
                        f"{source.get('provider')}"
                    ),
                    severity="critical",
                    description=(
                        "A configured phishing or malware "
                        f"provider ({source.get('provider')}) "
                        "matched this URL."
                    ),
                    source=str(
                        source.get(
                            "provider"
                        )
                    ),
                )

        risk_score = sum(
            self._score_signal(
                signal["severity"]
            )
            for signal in signals
        )

        if is_known_threat:
            risk_score = max(
                risk_score,
                95,
            )

        if official_info.get(
            "is_possible_impersonation"
        ):
            similarity = (
                official_info.get(
                    "similarity_score"
                )
                or 0.0
            )

            if similarity >= 0.90:
                risk_score = max(
                    risk_score,
                    80,
                )
            else:
                risk_score = max(
                    risk_score,
                    55,
                )

        risk_score = max(
            0,
            min(
                100,
                int(risk_score),
            ),
        )

        risk_level = (
            self._calculate_risk_level(
                risk_score
            )
        )

        verdict = self._build_verdict(
            risk_level=risk_level,
            is_known_threat=is_known_threat,
            official_info=official_info,
        )

        recommendation = (
            self._build_recommendation(
                risk_level=risk_level,
                is_known_threat=is_known_threat,
                official_info=official_info,
            )
        )

        recommended_action = (
            self._recommended_action(
                risk_level=risk_level,
                is_known_threat=is_known_threat,
            )
        )

        try:
            simple_explanation = (
                self._generate_simple_explanation(
                    url=normalized_url,
                    domain=hostname,
                    registrable_domain=(
                        registrable_domain
                    ),
                    risk_score=risk_score,
                    risk_level=risk_level,
                    signals=signals,
                    official_info=official_info,
                    threat_intelligence=(
                        threat_intelligence
                    ),
                    recommendation=recommendation,
                    language=language,
                    explanation_level=(
                        explanation_level
                    ),
                    voice_friendly=voice_friendly,
                )
            )

        except Exception:
            simple_explanation = (
                self._fallback_explanation(
                    domain=hostname,
                    risk_level=risk_level,
                    recommendation=recommendation,
                    language=language,
                    is_known_threat=is_known_threat,
                    official_info=official_info,
                    threat_intelligence=(
                        threat_intelligence
                    ),
                )
            )

        return {
            "input_url": url,
            "normalized_url": normalized_url,
            "domain": hostname,
            "registrable_domain": registrable_domain,
            "scheme": scheme,
            "official_domain": official_info,
            "threat_intelligence": threat_intelligence,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "verdict": verdict,
            "is_potentially_risky": (
                risk_level
                in {
                    "dangerous",
                    "suspicious",
                    "caution",
                }
            ),
            "is_known_threat": is_known_threat,
            "recommended_action": recommended_action,
            "signals": signals,
            "recommendation": recommendation,
            "simple_explanation": simple_explanation,
            "language": language,
            "explanation_level": explanation_level,
            "voice_friendly": voice_friendly,
            "engine_version": self.ENGINE_VERSION,
        }
