from pydantic import BaseModel


class VisionDescribeResponse(BaseModel):
    description: str
    extracted_text: str | None = None
    language: str
    explanation_level: str
    provider: str
    confidence: float | None = None
    text_blocks: list[dict]
    voice_friendly: bool
    should_speak: bool


class VisionAssistResponse(BaseModel):
    answer: str
    extracted_text: str | None = None
    language: str
    task: str
    explanation_level: str
    provider: str
    confidence: float | None = None
    text_blocks: list[dict]
    voice_friendly: bool
    should_speak: bool