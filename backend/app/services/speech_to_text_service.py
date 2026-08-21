# app/services/speech_to_text_service.py

import tempfile
import wave
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from openai import APIConnectionError, APIStatusError, AsyncOpenAI, RateLimitError

from app.core.settings import settings


class SpeechToTextService:
    def __init__(self):
        self.provider = settings.STT_PROVIDER.strip().lower()
        self.model = settings.STT_MODEL
        self.openai_api_key = settings.OPENAI_API_KEY
        self.groq_api_key = settings.GROQ_API_KEY
        self.max_audio_size_mb = settings.MAX_AUDIO_SIZE_MB
        self.max_audio_duration_seconds = settings.MAX_AUDIO_DURATION_SECONDS

        self.allowed_content_types = {
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/webm",
            "audio/ogg",
            "audio/mp4",
            "audio/m4a",
            "video/webm",
        }

        self._groq_client = (
            AsyncOpenAI(
                api_key=self.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
            )
            if self.groq_api_key
            else None
        )

        self._openai_client = (
            AsyncOpenAI(api_key=self.openai_api_key)
            if self.openai_api_key
            else None
        )

    async def transcribe_audio(
        self,
        audio_file: UploadFile,
        language: str = "en",
        response_format: str = "json",
    ) -> dict[str, Any]:
        if not audio_file:
            raise ValueError("Audio file is required")

        raw_content_type = audio_file.content_type or ""
        content_type = raw_content_type.split(";", 1)[0].strip().lower()

        if content_type not in self.allowed_content_types:
            raise ValueError(
                f"Unsupported audio type: {raw_content_type}. "
                "Allowed types: mp3, wav, webm, ogg, m4a."
            )

        normalized_format = response_format.strip().lower()
        if normalized_format not in {"json", "verbose_json"}:
            normalized_format = "json"

        suffix = Path(audio_file.filename or "audio.webm").suffix or ".webm"
        temp_path: str | None = None

        try:
            audio_bytes = await audio_file.read()

            if not audio_bytes:
                raise ValueError("Uploaded audio file is empty")

            max_bytes = self.max_audio_size_mb * 1024 * 1024
            if len(audio_bytes) > max_bytes:
                raise ValueError(
                    f"Audio file is too large. Maximum allowed size is "
                    f"{self.max_audio_size_mb} MB."
                )

            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name

            detected_duration = self._get_wav_duration_seconds(temp_path)

            if (
                detected_duration is not None
                and detected_duration > self.max_audio_duration_seconds
            ):
                raise ValueError(
                    f"Audio is too long. Maximum allowed duration is "
                    f"{self.max_audio_duration_seconds} seconds."
                )

            if self.provider == "groq":
                result = await self._transcribe_with_groq(
                    temp_path=temp_path,
                    language=language,
                    response_format=normalized_format,
                )
                provider_name = "groq"

            elif self.provider == "openai":
                result = await self._transcribe_with_openai(
                    temp_path=temp_path,
                    language=language,
                    response_format=normalized_format,
                )
                provider_name = "openai"

            else:
                raise ValueError(
                    f"Unsupported STT provider: {self.provider}. "
                    "Supported providers: groq, openai."
                )

            transcript = getattr(result, "text", "") or ""
            provider_language = getattr(result, "language", None)
            normalized_language = self._normalize_language(language)
            resolved_language = (
                str(provider_language)
                if provider_language
                else normalized_language or "auto"
            )

            provider_duration = getattr(result, "duration", None)

            return {
                "transcript": transcript.strip(),
                "language": resolved_language,
                "confidence": None,
                "provider": provider_name,
                "model": self.model,
                "duration_limit_seconds": self.max_audio_duration_seconds,
                "detected_duration_seconds": (
                    provider_duration
                    if provider_duration is not None
                    else detected_duration
                ),
                "note": None,
            }

        except RateLimitError:
            raise

        except APIStatusError:
            raise

        except APIConnectionError as error:
            raise ValueError(
                "Could not connect to the speech provider. Check the internet connection."
            ) from error

        finally:
            if temp_path:
                Path(temp_path).unlink(missing_ok=True)

    async def _transcribe_with_groq(
        self,
        temp_path: str,
        language: str,
        response_format: str,
    ):
        if not self._groq_client:
            raise ValueError(
                "GROQ_API_KEY is required for Groq speech-to-text."
            )

        return await self._create_transcription(
            client=self._groq_client,
            temp_path=temp_path,
            language=language,
            response_format=response_format,
        )

    async def _transcribe_with_openai(
        self,
        temp_path: str,
        language: str,
        response_format: str,
    ):
        if not self._openai_client:
            raise ValueError(
                "OPENAI_API_KEY is required for OpenAI speech-to-text."
            )

        return await self._create_transcription(
            client=self._openai_client,
            temp_path=temp_path,
            language=language,
            response_format=response_format,
        )

    async def _create_transcription(
        self,
        client: AsyncOpenAI,
        temp_path: str,
        language: str,
        response_format: str,
    ):
        normalized_language = self._normalize_language(language)

        with open(temp_path, "rb") as audio:
            kwargs: dict[str, Any] = {
                "model": self.model,
                "file": audio,
                "response_format": response_format,
                "temperature": 0,
            }

            if normalized_language:
                kwargs["language"] = normalized_language

            if response_format == "verbose_json":
                kwargs["timestamp_granularities"] = ["segment"]

            return await client.audio.transcriptions.create(**kwargs)

    def _normalize_language(self, language: str) -> str | None:
        clean_language = (language or "auto").lower().strip()

        if clean_language in {"", "auto", "detect", "automatic"}:
            return None

        if clean_language.startswith("ar"):
            return "ar"

        if clean_language.startswith("en"):
            return "en"

        if len(clean_language) == 2 and clean_language.isalpha():
            return clean_language

        return None

    def _get_wav_duration_seconds(self, file_path: str) -> float | None:
        try:
            if not file_path.lower().endswith(".wav"):
                return None

            with wave.open(file_path, "rb") as wav_file:
                frames = wav_file.getnframes()
                rate = wav_file.getframerate()

                if rate <= 0:
                    return None

                return frames / float(rate)

        except Exception:
            return None
