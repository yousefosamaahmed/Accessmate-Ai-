from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = "en"
    explanation_level: str = "simple"
    voice_friendly: bool = True


class AIChatResponse(BaseModel):
    answer: str
    language: str
    explanation_level: str
    provider: str
    model: str
    voice_friendly: bool


class SimpleExplanationRequest(BaseModel):
    text: str = Field(..., min_length=1)
    language: str = "en"
    level: str = "very_simple"
    voice_friendly: bool = True


class SimpleExplanationResponse(BaseModel):
    explanation: str
    language: str
    level: str
    provider: str
    model: str
    voice_friendly: bool