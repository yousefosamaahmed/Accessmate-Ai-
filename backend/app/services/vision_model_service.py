# app/services/vision_model_service.py

import asyncio
import base64
import os
import re

from fastapi import UploadFile
from litellm import acompletion

from app.core.settings import settings


class VisionModelService:
    """
    Fast and resilient AccessMate vision model service.

    Routing:
    1) Gemini 3.5 Flash-Lite -> primary
       - multimodal
       - low latency
       - good fit for image description / visual assistance

    2) Existing Groq vision model -> fallback
       - used only if Gemini fails / times out

    This prevents the current Groq 429 rate limit from blocking
    normal image descriptions.
    """

    def __init__(self):
        # ----------------------------------------------------
        # PRIMARY / FALLBACK
        # ----------------------------------------------------

        self.primary_model = (
            "gemini/gemini-3.5-flash-lite"
        )

        # Keep the existing configured Groq model as fallback.
        self.fallback_model = (
            settings.VISION_MODEL
        )

        self.primary_provider = "gemini"
        self.fallback_provider = (
            settings.VISION_PROVIDER
            or "groq"
        )

        self.last_model_used = (
            self.primary_model
        )

        self.last_provider_used = (
            self.primary_provider
        )

        # ----------------------------------------------------
        # FAST RESPONSE SETTINGS
        # ----------------------------------------------------

        try:
            configured_max_tokens = int(
                settings.VISION_MAX_TOKENS
            )
        except (
            TypeError,
            ValueError,
        ):
            configured_max_tokens = 600

        # Accessibility descriptions normally do not need
        # 1000+ output tokens.
        self.max_tokens = min(
            max(
                configured_max_tokens,
                256,
            ),
            650,
        )

        self.primary_timeout_seconds = 10
        self.fallback_timeout_seconds = 10

        self.max_image_size_bytes = (
            settings.MAX_IMAGE_SIZE_MB
            * 1024
            * 1024
        )

        # ----------------------------------------------------
        # API KEYS
        # ----------------------------------------------------

        if settings.GEMINI_API_KEY:
            os.environ[
                "GEMINI_API_KEY"
            ] = (
                settings.GEMINI_API_KEY
            )

        if settings.GROQ_API_KEY:
            os.environ[
                "GROQ_API_KEY"
            ] = (
                settings.GROQ_API_KEY
            )

        self.allowed_content_types = {
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
        }

    # ========================================================
    # IMAGE VALIDATION
    # ========================================================

    def _validate_image(
        self,
        image_file: UploadFile,
        image_bytes: bytes,
    ) -> None:
        if not image_file:
            raise ValueError(
                "Image file is required"
            )

        content_type = (
            image_file.content_type
            or ""
        )

        if (
            content_type
            not in self.allowed_content_types
        ):
            raise ValueError(
                f"Unsupported image content type: "
                f"{content_type}. "
                "Please upload PNG, JPG, JPEG, or WEBP."
            )

        if not image_bytes:
            raise ValueError(
                "Uploaded image is empty"
            )

        if (
            len(image_bytes)
            > self.max_image_size_bytes
        ):
            raise ValueError(
                "Image is too large. "
                f"Maximum allowed size is "
                f"{settings.MAX_IMAGE_SIZE_MB} MB."
            )

    # ========================================================
    # IMAGE -> DATA URL
    # ========================================================

    def _image_to_data_url(
        self,
        image_file: UploadFile,
        image_bytes: bytes,
    ) -> str:
        content_type = (
            image_file.content_type
            or "image/jpeg"
        )

        encoded_image = (
            base64
            .b64encode(
                image_bytes
            )
            .decode(
                "utf-8"
            )
        )

        return (
            f"data:{content_type};base64,"
            f"{encoded_image}"
        )

    # ========================================================
    # CLEAN MODEL OUTPUT
    # ========================================================

    def _strip_thinking_blocks(
        self,
        text: str,
    ) -> str:
        if not text:
            return ""

        cleaned = (
            text.strip()
        )

        cleaned = re.sub(
            r"<think>.*?</think>",
            "",
            cleaned,
            flags=(
                re.IGNORECASE
                | re.DOTALL
            ),
        ).strip()

        cleaned = re.sub(
            r"</think>",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()

        lower_cleaned = (
            cleaned.lower()
        )

        if (
            "<think>"
            in lower_cleaned
        ):
            cleaned = (
                cleaned[
                    :
                    lower_cleaned.find(
                        "<think>"
                    )
                ]
                .strip()
            )

        return cleaned.strip()

    # ========================================================
    # PROMPTS
    # ========================================================

    def _build_system_prompt(
        self,
        language: str,
        explanation_level: str,
        voice_friendly: bool,
    ) -> str:
        return f"""
You are AccessMate AI, an accessibility-first vision assistant.

Rules:
- Use the requested language: {language}
- Explanation level: {explanation_level}
- Describe only what is supported by the image.
- Do not identify real people.
- Do not guess sensitive personal attributes.
- If something is unclear, say so briefly.
- Mention visible text only when it matters to the task.
- Mention visible safety risks when relevant.
- Be concise by default.
- For a normal image description, prefer 2 to 5 short sentences.
- Give more detail only when the user explicitly asks for it.
- If voice_friendly is true, make the answer natural to hear aloud.
- Return only the final user-facing answer.
- Do not include hidden reasoning.
- Do not include analysis.
- Do not include chain of thought.
- Do not include <think> tags.

voice_friendly: {voice_friendly}
""".strip()

    def _build_user_prompt(
        self,
        prompt: str,
        voice_friendly: bool,
    ) -> str:
        return f"""
Task:
{prompt}

Answer directly and concisely.
Give a complete answer.
Do not include reasoning or analysis.

voice_friendly: {voice_friendly}
""".strip()

    # ========================================================
    # RESPONSE PARSING
    # ========================================================

    def _extract_response(
        self,
        response,
    ) -> tuple[
        str,
        str | None,
    ]:
        try:
            choice = (
                response[
                    "choices"
                ][0]
            )
        except Exception as error:
            raise ValueError(
                "Vision model returned an invalid response structure"
            ) from error

        try:
            finish_reason = (
                choice.get(
                    "finish_reason"
                )
            )
        except Exception:
            finish_reason = (
                getattr(
                    choice,
                    "finish_reason",
                    None,
                )
            )

        try:
            message = (
                choice[
                    "message"
                ]
            )
        except Exception:
            message = (
                getattr(
                    choice,
                    "message",
                    None,
                )
            )

        if message is None:
            raise ValueError(
                "Vision model response does not contain a message"
            )

        try:
            content = (
                message.get(
                    "content"
                )
            )
        except Exception:
            content = (
                getattr(
                    message,
                    "content",
                    None,
                )
            )

        if isinstance(
            content,
            str,
        ):
            return (
                content,
                str(
                    finish_reason
                )
                if finish_reason
                else None,
            )

        if isinstance(
            content,
            list,
        ):
            text_parts: list[
                str
            ] = []

            for item in content:
                if isinstance(
                    item,
                    str,
                ):
                    text_parts.append(
                        item
                    )

                    continue

                if isinstance(
                    item,
                    dict,
                ):
                    value = (
                        item.get(
                            "text"
                        )
                        or item.get(
                            "content"
                        )
                    )

                    if isinstance(
                        value,
                        str,
                    ):
                        text_parts.append(
                            value
                        )

            return (
                "\n".join(
                    text_parts
                ).strip(),
                str(
                    finish_reason
                )
                if finish_reason
                else None,
            )

        return (
            "",
            str(
                finish_reason
            )
            if finish_reason
            else None,
        )

    # ========================================================
    # PROVIDER CALL
    # ========================================================

    async def _run_completion_for_model(
        self,
        *,
        model: str,
        system_prompt: str,
        user_prompt: str,
        image_data_url: str,
        max_tokens: int,
    ) -> tuple[
        str,
        str | None,
    ]:
        kwargs = {
            "model":
                model,

            "messages": [
                {
                    "role":
                        "system",

                    "content":
                        system_prompt,
                },
                {
                    "role":
                        "user",

                    "content": [
                        {
                            "type":
                                "text",

                            "text":
                                user_prompt,
                        },
                        {
                            "type":
                                "image_url",

                            "image_url": {
                                "url":
                                    image_data_url,
                            },
                        },
                    ],
                },
            ],

            "max_tokens":
                max_tokens,
        }

        # Gemini 3.5/3.6+ deprecated the old sampling
        # parameters. Do NOT send temperature to Gemini.
        #
        # The existing Groq vision model can continue
        # using the configured temperature.
        if (
            not model.startswith(
                "gemini/"
            )
        ):
            kwargs[
                "temperature"
            ] = (
                settings
                .VISION_TEMPERATURE
            )

        response = (
            await acompletion(
                **kwargs
            )
        )

        return (
            self._extract_response(
                response
            )
        )

    async def _run_with_timeout(
        self,
        *,
        model: str,
        provider: str,
        timeout_seconds: int,
        system_prompt: str,
        user_prompt: str,
        image_data_url: str,
        max_tokens: int,
    ) -> tuple[
        str,
        str | None,
    ]:
        result = (
            await asyncio.wait_for(
                self._run_completion_for_model(
                    model=
                        model,

                    system_prompt=
                        system_prompt,

                    user_prompt=
                        user_prompt,

                    image_data_url=
                        image_data_url,

                    max_tokens=
                        max_tokens,
                ),
                timeout=
                    timeout_seconds,
            )
        )

        self.last_model_used = (
            model
        )

        self.last_provider_used = (
            provider
        )

        return result

    # ========================================================
    # ANALYZE IMAGE
    # ========================================================

    async def analyze_image(
        self,
        image_file: UploadFile,
        prompt: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
    ) -> str:
        image_bytes = (
            await image_file.read()
        )

        self._validate_image(
            image_file=
                image_file,

            image_bytes=
                image_bytes,
        )

        image_data_url = (
            self._image_to_data_url(
                image_file=
                    image_file,

                image_bytes=
                    image_bytes,
            )
        )

        system_prompt = (
            self._build_system_prompt(
                language=
                    language,

                explanation_level=
                    explanation_level,

                voice_friendly=
                    voice_friendly,
            )
        )

        user_prompt = (
            self._build_user_prompt(
                prompt=
                    prompt,

                voice_friendly=
                    voice_friendly,
            )
        )

        # ----------------------------------------------------
        # 1. GEMINI PRIMARY
        # ----------------------------------------------------

        primary_error = None

        try:
            (
                content,
                finish_reason,
            ) = await self._run_with_timeout(
                model=
                    self.primary_model,

                provider=
                    self.primary_provider,

                timeout_seconds=
                    self.primary_timeout_seconds,

                system_prompt=
                    system_prompt,

                user_prompt=
                    user_prompt,

                image_data_url=
                    image_data_url,

                max_tokens=
                    self.max_tokens,
            )

        except Exception as error:
            primary_error = error

            print(
                "[Vision] Primary Gemini failed. "
                f"Trying Groq fallback. "
                f"{type(error).__name__}: {error}"
            )

            # ------------------------------------------------
            # 2. GROQ FALLBACK
            # ------------------------------------------------

            try:
                (
                    content,
                    finish_reason,
                ) = await self._run_with_timeout(
                    model=
                        self.fallback_model,

                    provider=
                        self.fallback_provider,

                    timeout_seconds=
                        self.fallback_timeout_seconds,

                    system_prompt=
                        system_prompt,

                    user_prompt=
                        user_prompt,

                    image_data_url=
                        image_data_url,

                    max_tokens=
                        self.max_tokens,
                )

            except Exception as fallback_error:
                raise RuntimeError(
                    "All vision providers failed. "
                    "Gemini error: "
                    f"{type(primary_error).__name__}: "
                    f"{primary_error}. "
                    "Groq error: "
                    f"{type(fallback_error).__name__}: "
                    f"{fallback_error}"
                ) from fallback_error

        # ----------------------------------------------------
        # TRUNCATION
        # ----------------------------------------------------

        if (
            finish_reason
            and finish_reason
                .lower()
            == "length"
        ):
            raise ValueError(
                "Vision model response was truncated. "
                "Please ask for a shorter description."
            )

        if (
            not content
            or not content.strip()
        ):
            raise ValueError(
                "Vision model returned an empty response"
            )

        clean_content = (
            self._strip_thinking_blocks(
                content
            )
        )

        if not clean_content:
            raise ValueError(
                "Vision model returned only hidden reasoning "
                "and no final answer"
            )

        return clean_content
