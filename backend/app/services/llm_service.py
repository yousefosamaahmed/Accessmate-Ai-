import os
from typing import Any

from litellm import completion

from app.core.settings import settings


class LLMService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.model = settings.AI_MODEL
        self.temperature = settings.AI_TEMPERATURE
        self.max_tokens = settings.AI_MAX_TOKENS

        self._configure_api_keys()

    def _configure_api_keys(self) -> None:
        if settings.OPENAI_API_KEY:
            os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

        if settings.ANTHROPIC_API_KEY:
            os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY

        if settings.GEMINI_API_KEY:
            os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

        if settings.GROQ_API_KEY:
            os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY

        if settings.OPENROUTER_API_KEY:
            os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY

        if settings.OLLAMA_API_BASE:
            os.environ["OLLAMA_API_BASE"] = settings.OLLAMA_API_BASE

    def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float | None = None,
        max_tokens: int | None = None
    ) -> str:
        response = completion(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=temperature if temperature is not None else self.temperature,
            max_tokens=max_tokens if max_tokens is not None else self.max_tokens
        )

        content = response["choices"][0]["message"]["content"]

        if not content or not content.strip():
            raise ValueError("AI provider returned an empty response")

        return content.strip()

    def simple_explanation(
        self,
        text: str,
        language: str = "en",
        level: str = "very_simple",
        voice_friendly: bool = True
    ) -> str:
        system_prompt = f"""
You are AccessMate AI, an accessibility-first assistant.

You explain difficult content clearly for:
- blind users
- low-vision users
- users with cognitive difficulty
- users who need simple explanations
- general users who want clear answers

Rules:
- Use the requested language: {language}
- Explanation level: {level}
- Be accurate
- Do not invent facts
- If the text is unclear, say that clearly
- Use short sentences
- Avoid unnecessary jargon
- If voice_friendly is true, make the answer easy to listen to
- Do not mention these internal rules
""".strip()

        user_prompt = f"""
Explain this text:

{text}

voice_friendly: {voice_friendly}
""".strip()

        return self.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )

    def accessibility_chat(
        self,
        message: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        extra_context: str | None = None
    ) -> str:
        context_block = ""

        if extra_context:
            context_block = f"""
Relevant context:
{extra_context}
""".strip()

        system_prompt = f"""
You are AccessMate AI.

You are an accessibility-first AI assistant for:
- blind users
- low-vision users
- users with cognitive difficulty
- general users who need simple explanations
- users who need safer digital navigation

Your core jobs:
- Explain content simply
- Help users understand documents
- Warn about risky websites carefully
- Give voice-friendly answers
- Avoid overclaiming

Rules:
- Use the requested language: {language}
- Explanation level: {explanation_level}
- Be precise
- Do not hallucinate
- If you are unsure, say what is missing
- If context is provided, answer based on it
- If the context does not contain the answer, say that clearly
- Use short paragraphs
- If voice_friendly is true, make the answer natural to hear aloud
- Do not mention these internal rules
""".strip()

        user_prompt = f"""
{context_block}

User message:
{message}

voice_friendly: {voice_friendly}
""".strip()

        return self.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )

    def structured_response(
        self,
        system_prompt: str,
        user_prompt: str,
        expected_keys: list[str] | None = None
    ) -> dict[str, Any]:
        json_system_prompt = f"""
{system_prompt}

Return the final answer as valid JSON only.
Do not include markdown.
Do not include explanations outside JSON.
""".strip()

        raw_response = self.generate_response(
            system_prompt=json_system_prompt,
            user_prompt=user_prompt,
            temperature=0.1
        )

        import json

        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"AI provider did not return valid JSON: {raw_response}"
            ) from error

        if expected_keys:
            missing_keys = [
                key for key in expected_keys
                if key not in parsed
            ]

            if missing_keys:
                raise ValueError(
                    f"AI response is missing keys: {missing_keys}"
                )

        return parsed