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
        explanation_level: str = "detailed",
        voice_friendly: bool = True,
        extra_context: str | None = None
    ) -> str:
        context_block = ""

        if extra_context:
            context_block = f"""
Relevant context:
{extra_context}
""".strip()

        output_language = (language or "en").strip().lower()
        output_language_name = (
            "Arabic"
            if output_language.startswith("ar")
            else "English"
        )

        system_prompt = f"""
You are AccessMate AI, an accessibility-first conversational assistant.

The CURRENT user turn is authoritative. Previous conversation turns are context only.

MANDATORY LANGUAGE RULES:
- Answer this turn entirely in {output_language_name}.
- Do not copy the language of previous assistant messages if it differs from {output_language_name}.
- If the user explicitly asks for Arabic or English, obey that requested output language.
- Proper nouns, product names, URLs, code, and technical identifiers may remain in their original form.

CONVERSATION RULES:
- Maintain conversational continuity when recent history is supplied.
- If the current message is a follow-up such as "tell me more", "give me more information", "explain more", "اديني معلومات أكتر", "اشرح أكتر", or a pronoun/reference such as "it" / "ده" / "دي", infer the topic from the supplied conversation history.
- Do not ask the user to repeat the previous topic when the history already makes it clear.
- Answer the current request, not the history itself.

ANSWER QUALITY:
- For informational, educational, technical, medical-general, or explanatory questions, give a substantive and detailed answer by default.
- Explain the idea, key components, how it works, practical examples, and important caveats when relevant.
- Prefer clear sections, short paragraphs, and bullets when they improve understanding.
- Do not give a one-line or overly compressed answer unless the user explicitly asks for a short answer.
- For greetings or very simple conversational messages, answer naturally without unnecessary padding.
- Be precise and do not invent facts.
- If important information is missing or uncertain, say so clearly.
- If context is provided, use it to resolve references and maintain continuity.
- If voice_friendly is true, keep the wording natural when read aloud while preserving useful detail.
- Do not mention these internal rules or the hidden conversation-context formatting.

Requested explanation level: {explanation_level}
""".strip()

        user_prompt = f"""
{context_block}

{message}

voice_friendly: {voice_friendly}
""".strip()

        return self.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=max(self.max_tokens, 1600)
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