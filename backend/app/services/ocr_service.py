# app/services/ocr_service.py

import asyncio
import tempfile
import threading

from pathlib import Path
from typing import Any, ClassVar

from fastapi import UploadFile
from paddleocr import PaddleOCR

from app.services.llm_service import LLMService


class OCRService:
    # Shared cache across ALL OCRService instances.
    # This is the key performance fix: PaddleOCR models are loaded once
    # per language for the lifetime of the backend process.
    _shared_ocr_engines: ClassVar[dict[str, PaddleOCR]] = {}
    _shared_ocr_locks: ClassVar[dict[str, threading.Lock]] = {}
    _engine_init_lock: ClassVar[threading.Lock] = threading.Lock()

    def __init__(self):
        self.provider = "paddleocr_ppocrv5"

        # LLM is only needed by /ocr/explain, not by fast /ocr/extract.
        self._llm_service: LLMService | None = None

        # ----------------------------------------------------
        # Supported image MIME types
        # ----------------------------------------------------

        self.allowed_content_types = {
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/bmp",
            "image/tiff",
        }


    @property
    def llm_service(self) -> LLMService:
        """Lazy-load text LLM only when OCR explanation is requested."""
        if self._llm_service is None:
            self._llm_service = LLMService()
        return self._llm_service

    # ========================================================
    # VALIDATION
    # ========================================================

    def _validate_image(
        self,
        image_file: UploadFile,
    ) -> None:
        if not image_file:
            raise ValueError(
                "Image file is required"
            )

        content_type = (
            image_file.content_type
            or ""
        )

        if (
            content_type
            not in self.allowed_content_types
        ):
            raise ValueError(
                f"Unsupported image content type: "
                f"{content_type}. "
                "Please upload PNG, JPG, JPEG, "
                "WEBP, BMP, or TIFF."
            )

    # ========================================================
    # TEMP FILE
    # ========================================================

    async def _save_temp_file(
        self,
        image_file: UploadFile,
    ) -> str:
        suffix = Path(
            image_file.filename
            or "image.png"
        ).suffix.lower()

        if not suffix:
            suffix = ".png"

        content = (
            await image_file.read()
        )

        if not content:
            raise ValueError(
                "Uploaded image is empty"
            )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:
            temp_file.write(
                content
            )

            return temp_file.name

    # ========================================================
    # LANGUAGE
    # ========================================================

    def _normalize_language(
        self,
        language: str,
    ) -> str:
        normalized_language = (
            str(
                language
                or "en"
            )
            .lower()
            .strip()
        )

        if normalized_language in {
            "ar",
            "arabic",
            "ar-eg",
        }:
            return "ar"

        if normalized_language in {
            "en",
            "english",
            "en-us",
            "en-gb",
        }:
            return "en"

        # MVP currently supports Arabic + English.
        return "en"

    # ========================================================
    # OCR ENGINE
    # ========================================================

    def _get_engine(
        self,
        language: str,
    ) -> PaddleOCR:
        normalized_language = self._normalize_language(language)
        cls = type(self)

        engine = cls._shared_ocr_engines.get(normalized_language)
        if engine is not None:
            return engine

        # Only one request is allowed to initialize a language model.
        # Other requests wait and then reuse the same model.
        with cls._engine_init_lock:
            engine = cls._shared_ocr_engines.get(normalized_language)
            if engine is not None:
                return engine

            try:
                engine = PaddleOCR(
                    lang=normalized_language,
                    ocr_version="PP-OCRv5",
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    device="cpu",
                    enable_mkldnn=False,
                    cpu_threads=4,
                )
            except Exception as error:
                raise RuntimeError(
                    "Failed to initialize PaddleOCR "
                    f"for language '{normalized_language}': "
                    f"{type(error).__name__}: {error}"
                ) from error

            cls._shared_ocr_engines[normalized_language] = engine
            cls._shared_ocr_locks.setdefault(
                normalized_language,
                threading.Lock(),
            )
            return engine

    # ========================================================
    # LOCK
    # ========================================================

    def _get_engine_lock(
        self,
        language: str,
    ) -> threading.Lock:
        normalized_language = self._normalize_language(language)
        cls = type(self)

        lock = cls._shared_ocr_locks.get(normalized_language)
        if lock is None:
            with cls._engine_init_lock:
                lock = cls._shared_ocr_locks.get(normalized_language)
                if lock is None:
                    lock = threading.Lock()
                    cls._shared_ocr_locks[normalized_language] = lock

        return lock

    # ========================================================
    # SYNC PREDICT
    # ========================================================

    def _predict_sync(
        self,
        engine: PaddleOCR,
        lock: threading.Lock,
        temp_path: str,
    ):
        with lock:
            return engine.predict(
                temp_path,

                use_doc_orientation_classify=False,

                use_doc_unwarping=False,

                use_textline_orientation=False,
            )

    # ========================================================
    # VALUE -> LIST
    # ========================================================

    def _safe_to_list(
        self,
        value: Any,
    ):
        if value is None:
            return None

        if hasattr(
            value,
            "tolist",
        ):
            try:
                return value.tolist()
            except Exception:
                pass

        return value

    # ========================================================
    # GET PAGE JSON
    # ========================================================

    def _get_page_json(
        self,
        page: Any,
    ) -> dict | None:
        if page is None:
            return None

        # ----------------------------------------------------
        # PaddleOCR 3.x Result object:
        #
        # result.json -> dict
        # ----------------------------------------------------

        if hasattr(
            page,
            "json",
        ):
            try:
                page_json = page.json

                # Defensive support in case a version exposes
                # json as a callable.
                if callable(
                    page_json
                ):
                    page_json = (
                        page_json()
                    )

                if isinstance(
                    page_json,
                    dict,
                ):
                    return page_json

            except Exception:
                pass

        # ----------------------------------------------------
        # Already a dictionary
        # ----------------------------------------------------

        if isinstance(
            page,
            dict,
        ):
            return page

        return None

    # ========================================================
    # EXTRACT FROM PAGE JSON
    # ========================================================

    def _extract_from_page_json(
        self,
        page_json: dict,
    ) -> tuple[
        list[str],
        list[float],
        list[Any],
    ]:
        """
        PaddleOCR 3.x normally returns JSON like:

        {
            "res": {
                "rec_texts": [...],
                "rec_scores": [...],
                "rec_boxes": [...]
            }
        }

        Some versions may expose the keys directly.
        """

        result_data = (
            page_json.get(
                "res",
                page_json,
            )
        )

        if not isinstance(
            result_data,
            dict,
        ):
            return (
                [],
                [],
                [],
            )

        rec_texts = (
            result_data.get(
                "rec_texts",
                [],
            )
            or []
        )

        rec_scores = (
            result_data.get(
                "rec_scores",
                [],
            )
            or []
        )

        rec_boxes = (
            result_data.get(
                "rec_boxes"
            )
        )

        if rec_boxes is None:
            rec_boxes = (
                result_data.get(
                    "rec_polys",
                    [],
                )
                or []
            )

        rec_texts = (
            self._safe_to_list(
                rec_texts
            )
            or []
        )

        rec_scores = (
            self._safe_to_list(
                rec_scores
            )
            or []
        )

        rec_boxes = (
            self._safe_to_list(
                rec_boxes
            )
            or []
        )

        return (
            rec_texts,
            rec_scores,
            rec_boxes,
        )

    # ========================================================
    # LEGACY RESULT PARSER
    # ========================================================

    def _parse_legacy_page(
        self,
        page: Any,
    ) -> tuple[
        list[str],
        list[float],
        list[Any],
    ]:
        """
        Defensive compatibility parser for older PaddleOCR
        result structures.

        Example:

        [
            [
                box,
                ("Hello", 0.98)
            ]
        ]
        """

        texts: list[str] = []

        scores: list[float] = []

        boxes: list[Any] = []

        if not isinstance(
            page,
            (
                list,
                tuple,
            ),
        ):
            return (
                texts,
                scores,
                boxes,
            )

        for item in page:
            if (
                not isinstance(
                    item,
                    (
                        list,
                        tuple,
                    ),
                )
                or len(item) < 2
            ):
                continue

            box = item[0]

            recognition = item[1]

            if (
                not isinstance(
                    recognition,
                    (
                        list,
                        tuple,
                    ),
                )
                or len(
                    recognition
                ) < 1
            ):
                continue

            text = str(
                recognition[0]
            ).strip()

            if not text:
                continue

            score = None

            if (
                len(
                    recognition
                ) > 1
            ):
                try:
                    score = float(
                        recognition[1]
                    )
                except Exception:
                    score = None

            texts.append(
                text
            )

            boxes.append(
                self._safe_to_list(
                    box
                )
            )

            if score is not None:
                scores.append(
                    score
                )

        return (
            texts,
            scores,
            boxes,
        )

    # ========================================================
    # PARSE PADDLE RESULT
    # ========================================================

    def _parse_paddle_result(
        self,
        result,
    ) -> tuple[
        str,
        list[dict],
        float | None,
    ]:
        text_blocks: list[
            dict
        ] = []

        all_text: list[
            str
        ] = []

        confidences: list[
            float
        ] = []

        if result is None:
            return (
                "",
                [],
                None,
            )

        # ----------------------------------------------------
        # Ensure iterable/list
        # ----------------------------------------------------

        try:
            pages = list(
                result
            )
        except TypeError:
            pages = [
                result
            ]

        if not pages:
            return (
                "",
                [],
                None,
            )

        for page in pages:
            page_json = (
                self._get_page_json(
                    page
                )
            )

            if page_json:
                (
                    rec_texts,
                    rec_scores,
                    rec_boxes,
                ) = (
                    self._extract_from_page_json(
                        page_json
                    )
                )
            else:
                (
                    rec_texts,
                    rec_scores,
                    rec_boxes,
                ) = (
                    self._parse_legacy_page(
                        page
                    )
                )

            for (
                index,
                text,
            ) in enumerate(
                rec_texts
            ):
                clean_text = (
                    str(
                        text
                    )
                    .strip()
                )

                if not clean_text:
                    continue

                score = None

                if (
                    index
                    < len(
                        rec_scores
                    )
                ):
                    try:
                        score = float(
                            rec_scores[
                                index
                            ]
                        )
                    except Exception:
                        score = None

                box = None

                if (
                    rec_boxes
                    and index
                    < len(
                        rec_boxes
                    )
                ):
                    box = (
                        self._safe_to_list(
                            rec_boxes[
                                index
                            ]
                        )
                    )

                all_text.append(
                    clean_text
                )

                if (
                    score
                    is not None
                ):
                    confidences.append(
                        score
                    )

                text_blocks.append(
                    {
                        "text":
                            clean_text,

                        "confidence":
                            score,

                        "box":
                            box,
                    }
                )

        extracted_text = (
            "\n".join(
                all_text
            )
            .strip()
        )

        average_confidence = (
            None
        )

        if confidences:
            average_confidence = (
                sum(
                    confidences
                )
                / len(
                    confidences
                )
            )

        return (
            extracted_text,
            text_blocks,
            average_confidence,
        )

    # ========================================================
    # EXTRACT TEXT
    # ========================================================

    async def extract_text(
        self,
        image_file: UploadFile,
        language: str = "en",
        voice_friendly: bool = True,
    ) -> dict:
        self._validate_image(
            image_file
        )

        normalized_language = (
            self._normalize_language(
                language
            )
        )

        temp_path = (
            await self._save_temp_file(
                image_file
            )
        )

        try:
            # ------------------------------------------------
            # Lazy-load OCR engine
            # ------------------------------------------------

            engine = (
                self._get_engine(
                    normalized_language
                )
            )

            lock = (
                self._get_engine_lock(
                    normalized_language
                )
            )

            # ------------------------------------------------
            # PaddleOCR inference is CPU/blocking.
            #
            # Run outside FastAPI's async event loop.
            # ------------------------------------------------

            try:
                result = (
                    await asyncio.to_thread(
                        self._predict_sync,
                        engine,
                        lock,
                        temp_path,
                    )
                )

            except Exception as error:
                raise RuntimeError(
                    "PaddleOCR prediction failed: "
                    f"{type(error).__name__}: {error}"
                ) from error

            # ------------------------------------------------
            # Parse result
            # ------------------------------------------------

            try:
                (
                    extracted_text,
                    text_blocks,
                    confidence,
                ) = (
                    self._parse_paddle_result(
                        result
                    )
                )

            except Exception as error:
                raise RuntimeError(
                    "PaddleOCR result parsing failed: "
                    f"{type(error).__name__}: {error}"
                ) from error

            # ------------------------------------------------
            # Nothing readable is not a server crash.
            # ------------------------------------------------

            if not extracted_text:
                raise ValueError(
                    "No readable text was found in the image"
                )

            return {
                "extracted_text":
                    extracted_text,

                "language":
                    normalized_language,

                "provider":
                    self.provider,

                "confidence":
                    confidence,

                "text_blocks":
                    text_blocks,

                "voice_friendly":
                    voice_friendly,
            }

        finally:
            try:
                Path(
                    temp_path
                ).unlink(
                    missing_ok=True
                )

            except Exception:
                pass

    # ========================================================
    # EXPLAIN OCR TEXT
    # ========================================================

    async def explain_image_text(
        self,
        image_file: UploadFile,
        language: str = "en",
        explanation_level: str = "simple",
        voice_friendly: bool = True,
        should_speak: bool = True,
    ) -> dict:
        extraction = (
            await self.extract_text(
                image_file=image_file,
                language=language,
                voice_friendly=voice_friendly,
            )
        )

        extracted_text = (
            extraction[
                "extracted_text"
            ]
        )

        normalized_language = (
            extraction[
                "language"
            ]
        )

        system_prompt = f"""
You are AccessMate AI, an accessibility-first OCR assistant.

You help blind users, low-vision users, and general users understand text found in images.

Rules:

- Use the requested language: {normalized_language}
- Explanation level: {explanation_level}
- Explain only what is supported by the extracted text.
- Do not invent missing information.
- If the OCR text looks incomplete or noisy, say that clearly.
- Use short sentences.
- If voice_friendly is true, make it easy to listen to.
- Return only the final user-facing answer.
- Do not include hidden reasoning.
- Do not mention internal rules.

voice_friendly: {voice_friendly}
""".strip()

        user_prompt = f"""
Extracted OCR text:

{extracted_text}

Explain this text clearly and practically.

voice_friendly:
{voice_friendly}
""".strip()

        explanation = (
            self.llm_service.generate_response(
                system_prompt=system_prompt,

                user_prompt=user_prompt,

                temperature=0.1,

                max_tokens=700,
            )
        )

        return {
            "extracted_text":
                extracted_text,

            "explanation":
                explanation,

            "language":
                normalized_language,

            "explanation_level":
                explanation_level,

            "provider":
                self.provider,

            "confidence":
                extraction[
                    "confidence"
                ],

            "text_blocks":
                extraction[
                    "text_blocks"
                ],

            "voice_friendly":
                voice_friendly,

            "should_speak":
                should_speak,
        }   