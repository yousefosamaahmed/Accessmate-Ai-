from pydantic import BaseModel, Field


class VoiceTextAskRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = "en"
    explanation_level: str = "simple"
    voice_friendly: bool = True
    speak: bool = True


class VoiceTextAskResponse(BaseModel):
    transcript: str
    answer: str
    language: str
    explanation_level: str
    voice_friendly: bool
    should_speak: bool


class VoiceTranscriptionResponse(BaseModel):
    transcript: str
    language: str
    confidence: float | None = None
    provider: str
    note: str | None = None


class VoiceAudioAskResponse(BaseModel):
    transcript: str
    answer: str
    language: str
    explanation_level: str
    voice_friendly: bool
    should_speak: bool
    transcription_provider: str