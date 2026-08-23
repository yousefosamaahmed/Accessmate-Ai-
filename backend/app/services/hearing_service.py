# app/services/hearing_service.py

from time import perf_counter

from fastapi import UploadFile

from app.services.speech_to_text_service import SpeechToTextService


class HearingService:
    def __init__(self):
        self.speech_to_text_service = (
            SpeechToTextService()
        )

    async def transcribe_chunk(
        self,
        audio_file: UploadFile,
        language: str = "auto",
        sequence: int = 0,
    ) -> dict:
        started_at = perf_counter()

        result = await self.speech_to_text_service.transcribe_audio(
            audio_file=audio_file,
            language=language,
            response_format="verbose_json",
        )

        transcript = str(
            result.get(
                "transcript",
                "",
            )
        ).strip()

        detected_language = self._normalize_language(
            result.get("language")
        )

        # Some Whisper-compatible providers occasionally return
        # an English rendering while correctly reporting that the
        # source speech was Arabic. For AccessMate Chat we need a
        # transcript, not a translation. In that specific case,
        # retry once while explicitly locking transcription to Arabic.
        if (
            detected_language == "ar"
            and transcript
            and not self._contains_arabic(transcript)
        ):
            await audio_file.seek(0)

            retry_result = (
                await self.speech_to_text_service.transcribe_audio(
                    audio_file=audio_file,
                    language="ar",
                    response_format="verbose_json",
                )
            )

            retry_transcript = str(
                retry_result.get(
                    "transcript",
                    "",
                )
            ).strip()

            if retry_transcript:
                result = retry_result
                transcript = retry_transcript
                detected_language = "ar"

        resolved_language = (
            detected_language
            or self._normalize_language(language)
            or str(result.get("language", language))
        )

        return {
            "sequence": sequence,
            "transcript": transcript,
            "language": resolved_language,
            "is_speech": bool(transcript),
            "provider": str(
                result.get(
                    "provider",
                    "unknown",
                )
            ),
            "model": str(
                result.get(
                    "model",
                    "unknown",
                )
            ),
            "latency_ms": int(
                (
                    perf_counter()
                    - started_at
                )
                * 1000
            ),
        }

    @staticmethod
    def _contains_arabic(text: str) -> bool:
        return any(
            "\u0600" <= char <= "\u06ff"
            for char in text
        )

    @staticmethod
    def _normalize_language(value) -> str | None:
        normalized = str(value or "").strip().lower()

        if (
            normalized == "ar"
            or normalized.startswith("ar-")
            or "arabic" in normalized
        ):
            return "ar"

        if (
            normalized == "en"
            or normalized.startswith("en-")
            or "english" in normalized
        ):
            return "en"

        return None
