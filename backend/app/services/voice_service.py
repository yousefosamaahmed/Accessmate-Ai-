from fastapi import UploadFile

from app.services.llm_service import LLMService
from app.services.speech_to_text_service import SpeechToTextService
from app.services.text_to_speech_service import TextToSpeechService


class VoiceService:
    def __init__(self):
        self.llm_service = LLMService()
        self.speech_to_text_service = SpeechToTextService()
        self.text_to_speech_service = TextToSpeechService()

    def ask_by_text(
        self,
        message: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        speak: bool = True
    ) -> dict:
        answer = self.llm_service.accessibility_chat(
            message=message,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly
        )

        speech_payload = self.text_to_speech_service.build_speech_payload(
            text=answer,
            language=language,
            should_speak=speak
        )

        return {
            "transcript": message,
            "answer": answer,
            "language": language,
            "explanation_level": explanation_level,
            "voice_friendly": voice_friendly,
            "should_speak": speech_payload["should_speak"]
        }

    async def transcribe_audio(
        self,
        audio_file: UploadFile,
        language: str = "en"
    ) -> dict:
        return await self.speech_to_text_service.transcribe_audio(
            audio_file=audio_file,
            language=language
        )

    async def ask_by_audio(
        self,
        audio_file: UploadFile,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        speak: bool = True
    ) -> dict:
        transcription = await self.transcribe_audio(
            audio_file=audio_file,
            language=language
        )

        transcript = transcription.get("transcript", "")

        if not transcript:
            raise ValueError(
                "Audio transcription is not available yet. "
                "Use browser SpeechRecognition or configure Whisper."
            )

        answer_data = self.ask_by_text(
            message=transcript,
            language=language,
            explanation_level=explanation_level,
            voice_friendly=voice_friendly,
            speak=speak
        )

        answer_data["transcription_provider"] = transcription.get(
            "provider",
            "unknown"
        )

        return answer_data