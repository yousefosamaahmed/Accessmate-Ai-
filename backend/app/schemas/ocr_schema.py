from pydantic import BaseModel


class OCRExtractResponse(BaseModel):
    extracted_text: str
    language: str
    provider: str
    confidence: float | None = None
    text_blocks: list[dict]
    voice_friendly: bool


class OCRExplainResponse(BaseModel):
    extracted_text: str
    explanation: str
    language: str
    explanation_level: str
    provider: str
    confidence: float | None = None
    text_blocks: list[dict]
    voice_friendly: bool
    should_speak: bool