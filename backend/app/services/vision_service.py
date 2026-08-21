# app/services/vision_service.py

from fastapi import UploadFile

from app.services.vision_model_service import (
    VisionModelService,
)


class VisionService:
    """
    Fast visual assistant.

    - Image description goes directly to a multimodal model.
    - OCR is NOT run before Vision.
    - OCR text extraction remains a separate /ocr/extract path.
    - Gemini is the primary vision provider.
    - Existing Groq Vision is the automatic fallback.
    """

    def __init__(self):
        self.vision_model_service = (
            VisionModelService()
        )

        self.provider = (
            self.vision_model_service
            .primary_provider
        )

        self.last_model_used = (
            self.vision_model_service
            .primary_model
        )

    def _sync_provider_metadata(
        self,
    ) -> None:
        self.provider = (
            self.vision_model_service
            .last_provider_used
        )

        self.last_model_used = (
            self.vision_model_service
            .last_model_used
        )

    async def describe_image(
        self,
        image_file: UploadFile,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        should_speak: bool = True,
    ) -> dict:
        task = """
Describe this image for a blind or low-vision user.

Focus on the most important visible objects, layout, actions, and context.
Mention visible text only when it is useful.
Keep the answer concise, clear, and practical.
""".strip()

        description = (
            await self
            .vision_model_service
            .analyze_image(
                image_file=
                    image_file,

                prompt=
                    task,

                language=
                    language,

                explanation_level=
                    explanation_level,

                voice_friendly=
                    voice_friendly,
            )
        )

        self._sync_provider_metadata()

        return {
            "description":
                description,

            "extracted_text":
                "",

            "language":
                language,

            "explanation_level":
                explanation_level,

            "provider":
                self.provider,

            "confidence":
                None,

            "text_blocks":
                [],

            "voice_friendly":
                voice_friendly,

            "should_speak":
                should_speak,
        }

    async def assist_with_image(
        self,
        image_file: UploadFile,
        task: str,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        should_speak: bool = True,
    ) -> dict:
        clean_task = (
            task
            or ""
        ).strip()

        if not clean_task:
            clean_task = (
                "Describe this image clearly and practically "
                "for accessibility."
            )

        vision_task = f"""
User task:
{clean_task}

Answer directly from the image.
Use visible text when it helps answer the task.
Keep the response concise and practical unless the user explicitly asks for detail.
""".strip()

        answer = (
            await self
            .vision_model_service
            .analyze_image(
                image_file=
                    image_file,

                prompt=
                    vision_task,

                language=
                    language,

                explanation_level=
                    explanation_level,

                voice_friendly=
                    voice_friendly,
            )
        )

        self._sync_provider_metadata()

        return {
            "answer":
                answer,

            "extracted_text":
                "",

            "language":
                language,

            "task":
                clean_task,

            "explanation_level":
                explanation_level,

            "provider":
                self.provider,

            "confidence":
                None,

            "text_blocks":
                [],

            "voice_friendly":
                voice_friendly,

            "should_speak":
                should_speak,
        }
