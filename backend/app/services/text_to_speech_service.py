class TextToSpeechService:
    def build_speech_payload(
        self,
        text: str,
        language: str = "en",
        should_speak: bool = True
    ) -> dict:
        if not text or not text.strip():
            raise ValueError("Text is required for speech payload")

        return {
            "text": text.strip(),
            "language": language,
            "should_speak": should_speak,
            "tts_provider": "browser_speech_synthesis",
            "note": (
                "The frontend should speak this text using the browser "
                "SpeechSynthesis API."
            )
        }