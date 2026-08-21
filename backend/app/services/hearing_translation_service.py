# app/services/hearing_translation_service.py

import os
from time import perf_counter

from litellm import acompletion

from app.core.settings import settings


class HearingTranslationService:
    """
    Short-form translation for live captions.

    Gemini Flash-Lite is used because this path should stay
    independent from the primary chat provider and remain fast.
    """

    MODEL = "gemini/gemini-3.5-flash-lite"

    def __init__(self):
        if settings.GEMINI_API_KEY:
            os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
    ) -> dict:
        clean_text = str(text or "").strip()

        if not clean_text:
            raise ValueError("Text is required for translation.")

        source_language = str(
            source_language or "auto"
        ).strip().lower()

        target_language = str(
            target_language or ""
        ).strip().lower()

        if target_language not in {"en", "ar"}:
            raise ValueError(
                "Target language must be 'en' or 'ar'."
            )

        if source_language == target_language:
            return {
                "translated_text": clean_text,
                "source_language": source_language,
                "target_language": target_language,
                "provider": "local",
                "model": "identity",
                "latency_ms": 0,
            }

        target_name = (
            "Arabic"
            if target_language == "ar"
            else "English"
        )

        source_instruction = (
            "Detect the source language automatically."
            if source_language == "auto"
            else (
                "The source language is Arabic."
                if source_language == "ar"
                else "The source language is English."
            )
        )

        started = perf_counter()

        response = await acompletion(
            model=self.MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a live accessibility caption translator. "
                        "Translate faithfully and naturally. "
                        "Do not explain, summarize, add context, or add quotation marks. "
                        "Return only the translated text."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"{source_instruction}\n"
                        f"Translate to {target_name}:\n\n"
                        f"{clean_text}"
                    ),
                },
            ],
            max_tokens=220,
        )

        try:
            translated = (
                response["choices"][0]["message"]["content"]
                or ""
            ).strip()
        except Exception:
            translated = (
                getattr(
                    getattr(
                        response.choices[0],
                        "message",
                        None,
                    ),
                    "content",
                    "",
                )
                or ""
            ).strip()

        if not translated:
            raise ValueError(
                "Translation provider returned an empty response."
            )

        return {
            "translated_text": translated,
            "source_language": source_language,
            "target_language": target_language,
            "provider": "gemini",
            "model": self.MODEL,
            "latency_ms": int(
                (perf_counter() - started) * 1000
            ),
        }
