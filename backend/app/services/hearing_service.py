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

        return {
            "sequence": sequence,
            "transcript": transcript,
            "language": str(
                result.get(
                    "language",
                    language,
                )
            ),
            "is_speech": bool(
                transcript
            ),
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
