import os
from typing import Any

import requests
from dotenv import load_dotenv


load_dotenv()


class TelegramService:
    """
    Small synchronous wrapper around the Telegram Bot API.

    The public method signatures are intentionally kept compatible
    with the existing AccessMate care-alert pipeline.
    """

    API_BASE_URL = "https://api.telegram.org"

    def __init__(self):
        self.bot_token = (
            os.getenv(
                "TELEGRAM_BOT_TOKEN",
                "",
            )
            .strip()
        )

        self.timeout_seconds = 15

    # ========================================================
    # INTERNAL HELPERS
    # ========================================================

    def _build_url(
        self,
        method: str,
    ) -> str:
        return (
            f"{self.API_BASE_URL}/"
            f"bot{self.bot_token}/"
            f"{method}"
        )

    @staticmethod
    def _telegram_error_message(
        response: requests.Response,
        data: Any = None,
    ) -> str:
        """
        Build a concise Telegram API error without exposing
        the bot token.
        """

        if isinstance(
            data,
            dict,
        ):
            description = (
                data.get(
                    "description"
                )
            )

            error_code = (
                data.get(
                    "error_code"
                )
            )

            if description:
                if error_code:
                    return (
                        "Telegram API error "
                        f"{error_code}: "
                        f"{description}"
                    )

                return (
                    "Telegram API error: "
                    f"{description}"
                )

        text = (
            response.text
            or ""
        ).strip()

        if text:
            # Keep unexpected HTML / proxy errors bounded.
            if len(text) > 500:
                text = (
                    text[:500]
                    + "..."
                )

            return (
                "Telegram API error "
                f"{response.status_code}: "
                f"{text}"
            )

        return (
            "Telegram API error "
            f"{response.status_code}."
        )

    # ========================================================
    # SEND MESSAGE
    # ========================================================

    def send_message(
        self,
        chat_id: str | None,
        message: str,
    ) -> tuple[
        bool,
        str | None,
    ]:
        if not self.bot_token:
            return (
                False,
                "TELEGRAM_BOT_TOKEN is not configured.",
            )

        normalized_chat_id = (
            str(
                chat_id
                or ""
            )
            .strip()
        )

        if not normalized_chat_id:
            return (
                False,
                "Telegram chat_id is missing.",
            )

        normalized_message = (
            str(
                message
                or ""
            )
            .strip()
        )

        if not normalized_message:
            return (
                False,
                "Telegram message is empty.",
            )

        url = self._build_url(
            "sendMessage"
        )

        payload = {
            "chat_id":
                normalized_chat_id,

            "text":
                normalized_message,

            "parse_mode":
                "HTML",

            "disable_web_page_preview":
                True,
        }

        try:
            response = (
                requests.post(
                    url,
                    json=payload,
                    timeout=(
                        self.timeout_seconds
                    ),
                )
            )

        except requests.Timeout:
            return (
                False,
                "Telegram request timed out.",
            )

        except requests.ConnectionError as exc:
            return (
                False,
                "Telegram connection failed: "
                f"{exc}",
            )

        except requests.RequestException as exc:
            return (
                False,
                "Telegram request failed: "
                f"{exc}",
            )

        try:
            data = (
                response.json()
            )
        except ValueError:
            data = None

        if (
            response.ok
            and isinstance(
                data,
                dict,
            )
            and data.get(
                "ok"
            )
            is True
        ):
            return (
                True,
                None,
            )

        return (
            False,
            self._telegram_error_message(
                response=response,
                data=data,
            ),
        )

    # ========================================================
    # GET UPDATES
    # ========================================================

    def get_updates(
        self,
        limit: int = 100,
    ) -> tuple[
        bool,
        list[dict] | str,
    ]:
        """
        Read recent bot updates.

        Useful for local development when a webhook is not
        configured. AccessMate can use this after a caregiver
        presses Start on the Telegram bot.
        """

        if not self.bot_token:
            return (
                False,
                "TELEGRAM_BOT_TOKEN is not configured.",
            )

        safe_limit = max(
            1,
            min(
                int(limit),
                100,
            ),
        )

        url = self._build_url(
            "getUpdates"
        )

        params = {
            "limit":
                safe_limit,

            "allowed_updates": [
                "message",
                "edited_message",
            ],
        }

        try:
            response = (
                requests.get(
                    url,
                    params=params,
                    timeout=(
                        self.timeout_seconds
                    ),
                )
            )

        except requests.Timeout:
            return (
                False,
                "Telegram request timed out.",
            )

        except requests.ConnectionError as exc:
            return (
                False,
                "Telegram connection failed: "
                f"{exc}",
            )

        except requests.RequestException as exc:
            return (
                False,
                "Telegram request failed: "
                f"{exc}",
            )

        try:
            data = (
                response.json()
            )
        except ValueError:
            return (
                False,
                self._telegram_error_message(
                    response=response,
                    data=None,
                ),
            )

        if (
            not response.ok
            or not isinstance(
                data,
                dict,
            )
            or data.get(
                "ok"
            )
            is not True
        ):
            return (
                False,
                self._telegram_error_message(
                    response=response,
                    data=data,
                ),
            )

        result = (
            data.get(
                "result",
                [],
            )
        )

        if not isinstance(
            result,
            list,
        ):
            return (
                False,
                "Telegram getUpdates returned an invalid result.",
            )

        return (
            True,
            result,
        )
