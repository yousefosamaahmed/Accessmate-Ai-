from __future__ import annotations

import asyncio
import csv
import io
import json
import math
import threading
from math import gcd
from pathlib import Path
from time import perf_counter
from typing import Any

import numpy as np


class SoundAwarenessService:
    """
    Environmental sound classification using Google YAMNet.

    Improvements over the first AccessMate implementation:
      * YAMNet is still loaded once and cached at class level.
      * Resampling uses scipy.signal.resample_poly (faster for common rates).
      * Short/transient sounds use a top-frame aggregation instead of only
        averaging the whole clip, which avoids diluting knocks/doorbells/beeps.
      * Runtime can use a separate calibrated threshold for each monitored
        category. The evaluator writes sound_thresholds.json.

    The public response shape remains backward-compatible with the existing
    HearingSoundResponse schema.
    """

    MODEL_URL = "https://tfhub.dev/google/yamnet/1"
    MODEL_NAME = "YAMNet AudioSet"

    DEFAULT_THRESHOLD = 0.22
    MIN_THRESHOLD = 0.05
    MAX_THRESHOLD = 0.95

    _model: Any = None
    _tf: Any = None
    _class_names: list[str] = []
    _category_indices: dict[str, list[int]] = {}
    _load_lock = threading.Lock()

    THRESHOLD_CONFIG_PATH = Path(__file__).with_name("sound_thresholds.json")

    CATEGORY_ALIASES = {
        "alarm": (
            "smoke detector",
            "smoke alarm",
            "fire alarm",
            "alarm clock",
            "car alarm",
            "burglar alarm",
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
            "reversing beeps",
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

    # Transient sounds are easily diluted by a plain mean across YAMNet frames.
    # We therefore put more weight on the strongest local frames.
    TRANSIENT_CATEGORIES = {
        "doorbell",
        "knock",
        "beep",
    }

    # Alarm and Alert Beep can overlap acoustically in AudioSet.
    # A secondary conservative resolver uses the sustained Alarm score only
    # when Beep wins but Alarm still has meaningful support. Values are read
    # from sound_thresholds.json so the evaluator can calibrate them.
    DEFAULT_ALARM_BEEP_MIN_ALARM_SCORE = 0.25
    DEFAULT_ALARM_BEEP_MIN_RATIO = 0.30

    @classmethod
    def default_category_thresholds(cls) -> dict[str, float]:
        return {
            key: cls.DEFAULT_THRESHOLD
            for key in cls.CATEGORY_ALIASES
        }

    @classmethod
    def load_category_thresholds(cls) -> dict[str, float]:
        thresholds = cls.default_category_thresholds()

        try:
            if not cls.THRESHOLD_CONFIG_PATH.exists():
                return thresholds

            payload = json.loads(
                cls.THRESHOLD_CONFIG_PATH.read_text(encoding="utf-8")
            )

            raw = payload.get("thresholds", payload)
            if not isinstance(raw, dict):
                return thresholds

            for category in thresholds:
                value = raw.get(category)
                if value is None:
                    continue

                numeric = float(value)
                if math.isfinite(numeric):
                    thresholds[category] = max(
                        cls.MIN_THRESHOLD,
                        min(cls.MAX_THRESHOLD, numeric),
                    )

        except Exception as error:
            # A malformed calibration file must never stop Sound Awareness.
            print(
                "[SoundAwareness] Ignoring invalid sound_thresholds.json:",
                error,
            )

        return thresholds


    @classmethod
    def load_disambiguation_config(cls) -> dict[str, float]:
        config = {
            "alarm_beep_min_alarm_score": cls.DEFAULT_ALARM_BEEP_MIN_ALARM_SCORE,
            "alarm_beep_min_ratio": cls.DEFAULT_ALARM_BEEP_MIN_RATIO,
        }

        try:
            if not cls.THRESHOLD_CONFIG_PATH.exists():
                return config

            payload = json.loads(
                cls.THRESHOLD_CONFIG_PATH.read_text(encoding="utf-8")
            )
            raw = payload.get("disambiguation", {})
            if not isinstance(raw, dict):
                return config

            min_alarm = float(
                raw.get(
                    "alarm_beep_min_alarm_score",
                    config["alarm_beep_min_alarm_score"],
                )
            )
            min_ratio = float(
                raw.get(
                    "alarm_beep_min_ratio",
                    config["alarm_beep_min_ratio"],
                )
            )

            if math.isfinite(min_alarm):
                config["alarm_beep_min_alarm_score"] = max(
                    0.05, min(0.95, min_alarm)
                )
            if math.isfinite(min_ratio):
                config["alarm_beep_min_ratio"] = max(
                    0.05, min(1.0, min_ratio)
                )
        except Exception as error:
            print(
                "[SoundAwareness] Ignoring invalid disambiguation config:",
                error,
            )

        return config

    @classmethod
    def resolve_best_category(
        cls,
        monitored_scores: dict[str, float],
        eligible: list[str],
    ) -> str:
        best_category = max(
            eligible,
            key=lambda category: monitored_scores[category],
        )

        if best_category != "beep":
            return best_category

        alarm_score = float(monitored_scores.get("alarm", 0.0))
        beep_score = float(monitored_scores.get("beep", 0.0))

        if beep_score <= 0.0:
            return best_category

        config = cls.load_disambiguation_config()
        min_alarm = float(config["alarm_beep_min_alarm_score"])
        min_ratio = float(config["alarm_beep_min_ratio"])
        alarm_to_beep_ratio = alarm_score / beep_score

        # Conservative Alarm rescue:
        # - Beep must be the initial winner.
        # - Alarm must have meaningful sustained evidence.
        # - Alarm must not be tiny relative to the Beep score.
        # This targets Alarm/Beep ambiguity without changing the other classes.
        if (
            alarm_score >= min_alarm
            and alarm_to_beep_ratio >= min_ratio
        ):
            return "alarm"

        return best_category

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

            model = hub.load(self.MODEL_URL)
            class_map_path = model.class_map_path().numpy()

            if isinstance(class_map_path, bytes):
                class_map_path = class_map_path.decode("utf-8")

            class_names: list[str] = []

            with tf.io.gfile.GFile(class_map_path) as csv_file:
                reader = csv.DictReader(csv_file)
                for row in reader:
                    class_names.append(str(row["display_name"]))

            category_indices: dict[str, list[int]] = {}

            for category, aliases in self.CATEGORY_ALIASES.items():
                indices: list[int] = []

                for index, class_name in enumerate(class_names):
                    normalized = class_name.lower()
                    if any(alias in normalized for alias in aliases):
                        indices.append(index)

                category_indices[category] = indices

            self.__class__._tf = tf
            self.__class__._model = model
            self.__class__._class_names = class_names
            self.__class__._category_indices = category_indices

    async def warm_up(self) -> dict:
        """Load YAMNet and its class map without running a user sample."""
        started = perf_counter()

        await asyncio.to_thread(
            self._ensure_loaded
        )

        return {
            "ready": self.__class__._model is not None,
            "model": self.MODEL_NAME,
            "class_count": len(self.__class__._class_names),
            "latency_ms": int((perf_counter() - started) * 1000),
        }


    async def classify(
        self,
        audio_bytes: bytes,
        threshold: float | None = None,
    ) -> dict:
        if not audio_bytes:
            raise ValueError("Audio sample is empty.")

        # threshold <= 0 means: use calibrated per-class thresholds.
        global_threshold: float | None = None
        if threshold is not None:
            numeric_threshold = float(threshold)
            if numeric_threshold > 0:
                global_threshold = max(
                    self.MIN_THRESHOLD,
                    min(self.MAX_THRESHOLD, numeric_threshold),
                )

        started = perf_counter()

        result = await asyncio.to_thread(
            self._classify_sync,
            audio_bytes,
            global_threshold,
        )

        result["latency_ms"] = int(
            (perf_counter() - started) * 1000
        )
        return result

    def _decode_waveform(self, audio_bytes: bytes) -> np.ndarray:
        try:
            from scipy import signal
            from scipy.io import wavfile
        except ImportError as error:
            raise RuntimeError(
                "SciPy is required for Sound Awareness. Run: pip install scipy"
            ) from error

        sample_rate, wav_data = wavfile.read(io.BytesIO(audio_bytes))
        wav_data = np.asarray(wav_data)

        if wav_data.ndim > 1:
            wav_data = wav_data.mean(axis=1)

        if np.issubdtype(wav_data.dtype, np.integer):
            max_value = float(np.iinfo(wav_data.dtype).max)
            waveform = wav_data.astype(np.float32) / max_value
        else:
            waveform = wav_data.astype(np.float32)

        if sample_rate != 16000:
            common = gcd(int(sample_rate), 16000)
            up = 16000 // common
            down = int(sample_rate) // common

            waveform = signal.resample_poly(
                waveform,
                up,
                down,
            ).astype(np.float32)

        # YAMNet requires about 0.975 s for its first frame. We keep a little
        # margin so live windows remain valid even after sample-rate rounding.
        if len(waveform) < 15600:
            raise ValueError(
                "Sound sample is too short. Provide at least about 1 second of audio."
            )

        return np.clip(waveform, -1.0, 1.0).astype(np.float32)

    @staticmethod
    def _top_k_mean(values: np.ndarray) -> float:
        if values.size == 0:
            return 0.0

        # Strongest ~40% of frames, minimum 1 and maximum 3.
        top_count = max(
            1,
            min(3, int(math.ceil(values.size * 0.40))),
        )
        top_values = np.partition(values, -top_count)[-top_count:]
        return float(np.mean(top_values))

    def _aggregate_category_score(
        self,
        frame_scores: np.ndarray,
        category: str,
        indices: list[int],
    ) -> float:
        if not indices:
            return 0.0

        # For aliases that map to multiple YAMNet outputs, take the strongest
        # matching alias for each time frame first.
        category_frames = np.max(frame_scores[:, indices], axis=1)

        mean_score = float(np.mean(category_frames))
        p90_score = float(np.percentile(category_frames, 90))
        top_score = self._top_k_mean(category_frames)

        if category in self.TRANSIENT_CATEGORIES:
            # Better for short knocks, chimes and alert beeps.
            combined = (0.80 * top_score) + (0.20 * mean_score)
        else:
            # Sustained classes benefit from temporal consistency.
            combined = (0.55 * mean_score) + (0.45 * p90_score)

        return float(max(0.0, min(1.0, combined)))

    def _classify_sync(
        self,
        audio_bytes: bytes,
        global_threshold: float | None,
    ) -> dict:
        self._ensure_loaded()

        waveform = self._decode_waveform(audio_bytes)

        tf = self.__class__._tf
        model = self.__class__._model

        scores, _, _ = model(
            tf.convert_to_tensor(
                waveform,
                dtype=tf.float32,
            )
        )

        frame_scores = scores.numpy()

        monitored_scores: dict[str, float] = {}

        for category, indices in self.__class__._category_indices.items():
            monitored_scores[category] = self._aggregate_category_score(
                frame_scores,
                category,
                indices,
            )

        if not monitored_scores:
            raise RuntimeError(
                "YAMNet category mapping could not be initialized."
            )

        thresholds = self.load_category_thresholds()
        if global_threshold is not None:
            thresholds = {
                category: global_threshold
                for category in monitored_scores
            }

        eligible = [
            category
            for category, score in monitored_scores.items()
            if score >= thresholds.get(category, self.DEFAULT_THRESHOLD)
        ]

        if eligible:
            best_category = self.resolve_best_category(
                monitored_scores,
                eligible,
            )
            detected = True
        else:
            best_category = max(
                monitored_scores,
                key=monitored_scores.get,
            )
            detected = False

        confidence = float(monitored_scores[best_category])
        effective_threshold = float(
            thresholds.get(best_category, self.DEFAULT_THRESHOLD)
        )

        return {
            "detected": detected,
            "category": best_category if detected else None,
            "label": self.DISPLAY_LABELS[best_category] if detected else None,
            "confidence": confidence,
            "threshold": effective_threshold,
            "model": self.MODEL_NAME,
            "latency_ms": 0,
            "monitored_scores": monitored_scores,
        }
