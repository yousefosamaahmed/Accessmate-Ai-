# app/services/sound_awareness_service.py

import asyncio
import csv
import io
import threading
from time import perf_counter
from typing import Any

import numpy as np


class SoundAwarenessService:
    """
    Environmental sound classification using Google YAMNet.

    TensorFlow/TensorFlow Hub are imported lazily so the normal
    Hearing Assistant and the rest of AccessMate can boot even
    before optional sound-model dependencies are installed.
    """

    MODEL_URL = "https://tfhub.dev/google/yamnet/1"
    MODEL_NAME = "YAMNet AudioSet"

    _model: Any = None
    _tf: Any = None
    _class_names: list[str] = []
    _category_indices: dict[str, list[int]] = {}
    _load_lock = threading.Lock()

    CATEGORY_ALIASES = {
        "alarm": (
            "smoke detector",
            "smoke alarm",
            "fire alarm",
            "alarm clock",
            "alarm",
        ),
        "siren": (
            "siren",
        ),
        "doorbell": (
            "doorbell",
            "ding-dong",
        ),
        "baby_cry": (
            "baby cry",
            "infant cry",
        ),
        "knock": (
            "knock",
        ),
        "beep": (
            "beep",
            "bleep",
            "telephone bell ringing",
        ),
    }

    DISPLAY_LABELS = {
        "alarm": "Alarm",
        "siren": "Siren",
        "doorbell": "Doorbell",
        "baby_cry": "Baby Cry",
        "knock": "Knocking",
        "beep": "Alert Beep",
    }

    def _ensure_loaded(self) -> None:
        if self.__class__._model is not None:
            return

        with self.__class__._load_lock:
            if self.__class__._model is not None:
                return

            try:
                import tensorflow as tf
                import tensorflow_hub as hub
            except ImportError as error:
                raise RuntimeError(
                    "Sound Awareness dependencies are not installed. "
                    "Run: pip install tensorflow tensorflow-hub scipy"
                ) from error

            model = hub.load(
                self.MODEL_URL
            )

            class_map_path = (
                model.class_map_path().numpy()
            )

            if isinstance(
                class_map_path,
                bytes,
            ):
                class_map_path = (
                    class_map_path.decode(
                        "utf-8"
                    )
                )

            class_names: list[str] = []

            with tf.io.gfile.GFile(
                class_map_path
            ) as csv_file:
                reader = csv.DictReader(
                    csv_file
                )

                for row in reader:
                    class_names.append(
                        str(
                            row["display_name"]
                        )
                    )

            category_indices: dict[
                str,
                list[int],
            ] = {}

            for (
                category,
                aliases,
            ) in self.CATEGORY_ALIASES.items():
                indices: list[int] = []

                for (
                    index,
                    class_name,
                ) in enumerate(
                    class_names
                ):
                    normalized = (
                        class_name.lower()
                    )

                    if any(
                        alias
                        in normalized
                        for alias
                        in aliases
                    ):
                        indices.append(
                            index
                        )

                category_indices[
                    category
                ] = indices

            self.__class__._tf = tf
            self.__class__._model = model
            self.__class__._class_names = (
                class_names
            )
            self.__class__._category_indices = (
                category_indices
            )

    async def classify(
        self,
        audio_bytes: bytes,
        threshold: float = 0.22,
    ) -> dict:
        if not audio_bytes:
            raise ValueError(
                "Audio sample is empty."
            )

        threshold = max(
            0.10,
            min(
                0.95,
                float(
                    threshold
                ),
            ),
        )

        started = perf_counter()

        result = await asyncio.to_thread(
            self._classify_sync,
            audio_bytes,
            threshold,
        )

        result["latency_ms"] = int(
            (perf_counter() - started)
            * 1000
        )

        return result

    def _classify_sync(
        self,
        audio_bytes: bytes,
        threshold: float,
    ) -> dict:
        self._ensure_loaded()

        try:
            from scipy import signal
            from scipy.io import wavfile
        except ImportError as error:
            raise RuntimeError(
                "SciPy is required for Sound Awareness. "
                "Run: pip install scipy"
            ) from error

        sample_rate, wav_data = (
            wavfile.read(
                io.BytesIO(
                    audio_bytes
                )
            )
        )

        wav_data = np.asarray(
            wav_data
        )

        if wav_data.ndim > 1:
            wav_data = wav_data.mean(
                axis=1
            )

        if np.issubdtype(
            wav_data.dtype,
            np.integer,
        ):
            max_value = float(
                np.iinfo(
                    wav_data.dtype
                ).max
            )

            waveform = (
                wav_data.astype(
                    np.float32
                )
                / max_value
            )

        else:
            waveform = (
                wav_data.astype(
                    np.float32
                )
            )

        if (
            sample_rate
            != 16000
        ):
            desired_length = int(
                round(
                    float(
                        len(
                            waveform
                        )
                    )
                    / float(
                        sample_rate
                    )
                    * 16000.0
                )
            )

            waveform = signal.resample(
                waveform,
                desired_length,
            ).astype(
                np.float32
            )

            sample_rate = 16000

        if (
            len(
                waveform
            )
            < 8000
        ):
            raise ValueError(
                "Sound sample is too short."
            )

        waveform = np.clip(
            waveform,
            -1.0,
            1.0,
        ).astype(
            np.float32
        )

        tf = self.__class__._tf
        model = self.__class__._model

        scores, _, _ = model(
            tf.convert_to_tensor(
                waveform,
                dtype=tf.float32,
            )
        )

        mean_scores = (
            scores
            .numpy()
            .mean(
                axis=0
            )
        )

        monitored_scores: dict[
            str,
            float,
        ] = {}

        for (
            category,
            indices,
        ) in (
            self.__class__
            ._category_indices
            .items()
        ):
            if not indices:
                monitored_scores[
                    category
                ] = 0.0
                continue

            monitored_scores[
                category
            ] = float(
                max(
                    mean_scores[
                        index
                    ]
                    for index
                    in indices
                )
            )

        if not monitored_scores:
            raise RuntimeError(
                "YAMNet category mapping could not be initialized."
            )

        best_category = max(
            monitored_scores,
            key=monitored_scores.get,
        )

        confidence = float(
            monitored_scores[
                best_category
            ]
        )

        detected = (
            confidence
            >= threshold
        )

        return {
            "detected": detected,
            "category": (
                best_category
                if detected
                else None
            ),
            "label": (
                self.DISPLAY_LABELS[
                    best_category
                ]
                if detected
                else None
            ),
            "confidence": confidence,
            "threshold": threshold,
            "model": self.MODEL_NAME,
            "latency_ms": 0,
            "monitored_scores": (
                monitored_scores
            ),
        }
