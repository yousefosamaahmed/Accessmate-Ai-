from __future__ import annotations

import argparse
import asyncio
import json
import math
import sys
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.sound_awareness_service import SoundAwarenessService  # noqa: E402

TARGET_CLASSES = [
    "alarm",
    "siren",
    "doorbell",
    "baby_cry",
    "knock",
    "beep",
]

NO_DETECTION = "no_detection"
ALL_LABELS = TARGET_CLASSES + [NO_DETECTION]

DISPLAY_LABELS = {
    "alarm": "Alarm",
    "siren": "Siren",
    "doorbell": "Doorbell",
    "baby_cry": "Baby Cry",
    "knock": "Knocking",
    "beep": "Alert Beep",
    NO_DETECTION: "No Detection",
}

SUPPORTED_EXTENSIONS = {".wav"}
BASELINE_THRESHOLD = 0.22

# Conservative Alarm-vs-Beep secondary resolver. These values are intentionally
# simple and interpretable. The runtime service reads the same values from
# sound_thresholds.json.
ALARM_BEEP_MIN_ALARM_SCORE = 0.25
ALARM_BEEP_MIN_RATIO = 0.30


def safe_div(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def round6(value: float) -> float:
    if not math.isfinite(value):
        return 0.0
    return round(float(value), 6)


def discover_samples(dataset_dir: Path) -> list[tuple[str, Path, int]]:
    samples: list[tuple[str, Path, int]] = []

    for label in TARGET_CLASSES:
        class_dir = dataset_dir / label
        if not class_dir.exists():
            continue

        class_index = 0
        for path in sorted(class_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
                samples.append((label, path, class_index))
                class_index += 1

    return samples


def build_confusion_matrix(
    y_true: list[str],
    y_pred: list[str],
) -> list[list[int]]:
    index = {label: i for i, label in enumerate(ALL_LABELS)}
    matrix = [[0 for _ in ALL_LABELS] for _ in ALL_LABELS]

    for true_label, predicted_label in zip(y_true, y_pred):
        matrix[index[true_label]][index[predicted_label]] += 1

    return matrix


def normalize_rows(matrix: list[list[int]]) -> list[list[float]]:
    normalized: list[list[float]] = []

    for row in matrix:
        total = sum(row)
        if total == 0:
            normalized.append([0.0 for _ in row])
        else:
            normalized.append([round6(value / total) for value in row])

    return normalized


def calculate_metrics(
    matrix: list[list[int]],
    total_samples: int,
) -> tuple[dict[str, Any], dict[str, Any]]:
    label_index = {label: i for i, label in enumerate(ALL_LABELS)}
    per_class: dict[str, Any] = {}

    precision_values: list[float] = []
    recall_values: list[float] = []
    f1_values: list[float] = []
    total_correct = 0

    for label in TARGET_CLASSES:
        i = label_index[label]
        tp = matrix[i][i]
        total_correct += tp

        actual_support = sum(matrix[i])
        predicted_support = sum(row[i] for row in matrix)

        precision = safe_div(tp, predicted_support)
        recall = safe_div(tp, actual_support)
        f1 = safe_div(2.0 * precision * recall, precision + recall)

        precision_values.append(precision)
        recall_values.append(recall)
        f1_values.append(f1)

        per_class[label] = {
            "display_label": DISPLAY_LABELS[label],
            "support": actual_support,
            "predicted_support": predicted_support,
            "true_positive": tp,
            "precision": round6(precision),
            "recall": round6(recall),
            "f1": round6(f1),
        }

    no_detection_index = label_index[NO_DETECTION]
    no_detection_count = sum(
        matrix[label_index[label]][no_detection_index]
        for label in TARGET_CLASSES
    )

    metrics = {
        "accuracy": round6(safe_div(total_correct, total_samples)),
        "macro_precision": round6(
            safe_div(sum(precision_values), len(precision_values))
        ),
        "macro_recall": round6(
            safe_div(sum(recall_values), len(recall_values))
        ),
        "macro_f1": round6(safe_div(sum(f1_values), len(f1_values))),
        "correct_predictions": total_correct,
        "no_detection_count": no_detection_count,
        "no_detection_rate": round6(
            safe_div(no_detection_count, total_samples)
        ),
    }

    return metrics, per_class


def predict_from_scores(
    scores: dict[str, float],
    thresholds: dict[str, float],
    *,
    use_alarm_beep_disambiguation: bool = True,
    alarm_beep_min_alarm_score: float = ALARM_BEEP_MIN_ALARM_SCORE,
    alarm_beep_min_ratio: float = ALARM_BEEP_MIN_RATIO,
) -> str:
    eligible = [
        label
        for label in TARGET_CLASSES
        if float(scores.get(label, 0.0)) >= float(thresholds[label])
    ]

    if not eligible:
        return NO_DETECTION

    best = max(eligible, key=lambda label: float(scores.get(label, 0.0)))

    if use_alarm_beep_disambiguation and best == "beep":
        alarm_score = float(scores.get("alarm", 0.0))
        beep_score = float(scores.get("beep", 0.0))

        if beep_score > 0.0:
            ratio = alarm_score / beep_score
            if (
                alarm_score >= alarm_beep_min_alarm_score
                and ratio >= alarm_beep_min_ratio
            ):
                return "alarm"

    return best


def evaluate_records(
    records: list[dict[str, Any]],
    thresholds: dict[str, float],
    *,
    use_alarm_beep_disambiguation: bool = True,
    alarm_beep_min_alarm_score: float = ALARM_BEEP_MIN_ALARM_SCORE,
    alarm_beep_min_ratio: float = ALARM_BEEP_MIN_RATIO,
) -> tuple[list[list[int]], dict[str, Any], dict[str, Any], list[str]]:
    y_true = [str(item["true_label"]) for item in records]
    y_pred = [
        predict_from_scores(
            item["monitored_scores"],
            thresholds,
            use_alarm_beep_disambiguation=use_alarm_beep_disambiguation,
            alarm_beep_min_alarm_score=alarm_beep_min_alarm_score,
            alarm_beep_min_ratio=alarm_beep_min_ratio,
        )
        for item in records
    ]

    matrix = build_confusion_matrix(y_true, y_pred)
    metrics, per_class = calculate_metrics(matrix, len(records))
    return matrix, metrics, per_class, y_pred


def objective(metrics: dict[str, Any]) -> float:
    # Recall is intentionally weighted: AccessMate should detect important
    # sounds reliably, while macro F1 and accuracy stop us from simply lowering
    # every threshold and creating false positives.
    return (
        0.50 * float(metrics["macro_f1"])
        + 0.25 * float(metrics["macro_recall"])
        + 0.20 * float(metrics["accuracy"])
        + 0.05 * (1.0 - float(metrics["no_detection_rate"]))
    )


def optimize_thresholds(
    records: list[dict[str, Any]],
    *,
    initial: dict[str, float] | None = None,
) -> dict[str, float]:
    thresholds = {
        label: float((initial or {}).get(label, BASELINE_THRESHOLD))
        for label in TARGET_CLASSES
    }

    # Fine enough to meaningfully tune a 60-sample calibration set while still
    # remaining deterministic and fast.
    candidates = [round(value / 100.0, 2) for value in range(5, 51)]

    best_matrix, best_metrics, _, _ = evaluate_records(records, thresholds)
    _ = best_matrix
    best_score = objective(best_metrics)

    # Coordinate descent. Three passes are enough for this six-class problem.
    for _round in range(3):
        changed = False

        for label in TARGET_CLASSES:
            label_best_threshold = thresholds[label]
            label_best_score = best_score

            for candidate in candidates:
                trial = dict(thresholds)
                trial[label] = candidate
                _, trial_metrics, _, _ = evaluate_records(records, trial)
                score = objective(trial_metrics)

                # Tie-breaker: prefer the higher threshold (more conservative).
                if (
                    score > label_best_score + 1e-12
                    or (
                        abs(score - label_best_score) <= 1e-12
                        and candidate > label_best_threshold
                    )
                ):
                    label_best_score = score
                    label_best_threshold = candidate

            if label_best_threshold != thresholds[label]:
                thresholds[label] = label_best_threshold
                best_score = label_best_score
                changed = True

        if not changed:
            break

    return {key: round6(value) for key, value in thresholds.items()}


def write_frontend_module(result: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = json.dumps(result, ensure_ascii=False, indent=2)
    output_path.write_text(
        "// AUTO-GENERATED by backend/evaluation/yamnet/evaluate_yamnet.py\n"
        "// Do not edit metrics manually. Re-run the evaluator instead.\n\n"
        f"const yamnetEvaluation: any = {payload};\n\n"
        "export default yamnetEvaluation;\n",
        encoding="utf-8",
    )


def write_threshold_config(
    thresholds: dict[str, float],
    output_path: Path,
    *,
    selected_mode: str,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": (
            "Selected by AccessMate evaluation. A calibrated configuration is "
            "only deployed when it outperforms the validated global baseline."
        ),
        "selected_mode": selected_mode,
        "thresholds": thresholds,
        "disambiguation": {
            "alarm_beep_min_alarm_score": ALARM_BEEP_MIN_ALARM_SCORE,
            "alarm_beep_min_ratio": ALARM_BEEP_MIN_RATIO,
        },
    }
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


async def collect_raw_records(
    service: SoundAwarenessService,
    samples: list[tuple[str, Path, int]],
    dataset_dir: Path,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    print("Collecting YAMNet scores using the exact AccessMate inference service...")
    print()

    for position, (true_label, path, class_index) in enumerate(samples, start=1):
        prediction = await service.classify(
            audio_bytes=path.read_bytes(),
            threshold=0.01,  # only to expose raw scores; prediction is ignored here
        )

        confidence = float(prediction.get("confidence") or 0.0)
        latency_ms = int(prediction.get("latency_ms") or 0)
        monitored_scores = {
            str(key): round6(float(value))
            for key, value in (prediction.get("monitored_scores") or {}).items()
        }

        top_label = max(
            TARGET_CLASSES,
            key=lambda label: monitored_scores.get(label, 0.0),
        )

        print(
            f"[{position:03d}/{len(samples):03d}] "
            f"true={true_label:<10} top={top_label:<10} "
            f"score={monitored_scores.get(top_label, 0.0):.3f} "
            f"latency={latency_ms:>4}ms  {path.name}"
        )

        records.append(
            {
                "file": str(path.relative_to(dataset_dir)).replace("\\", "/"),
                "true_label": true_label,
                "class_index": class_index,
                "confidence": round6(confidence),
                "latency_ms": latency_ms,
                "monitored_scores": monitored_scores,
            }
        )

    return records


def cross_validated_predictions(
    records: list[dict[str, Any]],
    folds: int,
) -> tuple[list[str], list[str], list[dict[str, float]]]:
    y_true: list[str] = []
    y_pred: list[str] = []
    fold_thresholds: list[dict[str, float]] = []

    for fold in range(folds):
        train = [
            item
            for item in records
            if int(item["class_index"]) % folds != fold
        ]
        validation = [
            item
            for item in records
            if int(item["class_index"]) % folds == fold
        ]

        thresholds = optimize_thresholds(train)
        fold_thresholds.append(thresholds)

        for item in validation:
            y_true.append(str(item["true_label"]))
            y_pred.append(
                predict_from_scores(item["monitored_scores"], thresholds)
            )

    return y_true, y_pred, fold_thresholds


async def evaluate(args: argparse.Namespace) -> dict[str, Any]:
    dataset_dir = Path(args.dataset).resolve()

    if not dataset_dir.exists():
        raise SystemExit(f"Dataset directory does not exist: {dataset_dir}")

    samples = discover_samples(dataset_dir)

    if not samples:
        raise SystemExit(
            "No WAV evaluation files were found. Expected folders: "
            + ", ".join(TARGET_CLASSES)
        )

    counts = {label: 0 for label in TARGET_CLASSES}
    for label, _, _ in samples:
        counts[label] += 1

    missing = [label for label, count in counts.items() if count == 0]
    if missing:
        raise SystemExit(
            "Evaluation cannot be complete because these classes have no WAV files: "
            + ", ".join(missing)
        )

    service = SoundAwarenessService()

    print("AccessMate AI - YAMNet Sound Awareness Evaluation v2")
    print("=" * 72)
    print(f"Dataset: {dataset_dir}")
    print(f"Samples: {len(samples)}")
    print("Scoring: transient-aware YAMNet frame aggregation")
    print()

    records = await collect_raw_records(service, samples, dataset_dir)

    baseline_thresholds = {
        label: BASELINE_THRESHOLD
        for label in TARGET_CLASSES
    }

    # Legacy baseline = the same global threshold and scoring, but without the
    # new Alarm-vs-Beep secondary resolver. This lets the report show the
    # measured gain from the targeted disambiguation step.
    legacy_matrix, legacy_metrics, legacy_per_class, legacy_pred = (
        evaluate_records(
            records,
            baseline_thresholds,
            use_alarm_beep_disambiguation=False,
        )
    )

    baseline_matrix, baseline_metrics, baseline_per_class, baseline_pred = (
        evaluate_records(
            records,
            baseline_thresholds,
            use_alarm_beep_disambiguation=True,
        )
    )

    min_class_samples = min(counts.values())
    folds = min(5, min_class_samples)
    if folds < 2:
        folds = 2

    cv_true, cv_pred, fold_thresholds = cross_validated_predictions(
        records,
        folds,
    )
    cv_matrix = build_confusion_matrix(cv_true, cv_pred)
    cv_metrics, cv_per_class = calculate_metrics(cv_matrix, len(cv_true))

    optimized_thresholds = optimize_thresholds(records)
    runtime_matrix, runtime_metrics, runtime_per_class, runtime_pred = (
        evaluate_records(records, optimized_thresholds)
    )

    # Do not deploy a calibrated configuration that performs worse than the
    # fixed global baseline on this evaluation. The previous evaluator always
    # wrote the calibrated thresholds even when cross-validation was worse.
    baseline_objective = objective(baseline_metrics)
    cv_objective = objective(cv_metrics)

    if cv_objective > baseline_objective + 1e-12:
        selected_mode = "calibrated_per_class"
        selected_thresholds = optimized_thresholds
        selected_metrics = cv_metrics
        selected_per_class = cv_per_class
        selected_matrix = cv_matrix
        selected_predictions = runtime_pred
    else:
        selected_mode = "global_0.22_with_alarm_beep_disambiguation"
        selected_thresholds = dict(baseline_thresholds)
        selected_metrics = baseline_metrics
        selected_per_class = baseline_per_class
        selected_matrix = baseline_matrix
        selected_predictions = baseline_pred

    # Add useful per-sample before/after predictions for auditability.
    sample_results: list[dict[str, Any]] = []
    for item, old_pred, new_pred in zip(records, legacy_pred, selected_predictions):
        sample_results.append(
            {
                **item,
                "legacy_prediction": old_pred,
                "baseline_prediction": baseline_pred[len(sample_results)],
                "runtime_prediction": new_pred,
                "runtime_correct": new_pred == item["true_label"],
            }
        )

    result: dict[str, Any] = {
        "schema_version": 2,
        "status": "evaluated",
        "model": SoundAwarenessService.MODEL_NAME,
        "model_source": SoundAwarenessService.MODEL_URL,
        "evaluation_scope": "AccessMate monitored environmental sound categories",
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "threshold": BASELINE_THRESHOLD,
        "total_samples": len(samples),
        "target_classes": TARGET_CLASSES,
        "labels": ALL_LABELS,
        "display_labels": DISPLAY_LABELS,
        "class_sample_counts": counts,
        "optimized_thresholds": optimized_thresholds,
        "selected_runtime_thresholds": selected_thresholds,
        "selected_runtime_mode": selected_mode,
        "alarm_beep_disambiguation": {
            "enabled": True,
            "min_alarm_score": ALARM_BEEP_MIN_ALARM_SCORE,
            "min_alarm_to_beep_ratio": ALARM_BEEP_MIN_RATIO,
        },
        "cross_validation_folds": folds,
        # Main report reflects the configuration selected for runtime.
        "metrics": selected_metrics,
        "per_class": selected_per_class,
        "confusion_matrix": selected_matrix,
        "normalized_confusion_matrix": normalize_rows(selected_matrix),
        # Legacy is the 0.22 global threshold without Alarm/Beep disambiguation.
        "legacy_baseline_metrics": legacy_metrics,
        "legacy_baseline_per_class": legacy_per_class,
        "legacy_baseline_confusion_matrix": legacy_matrix,
        "legacy_baseline_normalized_confusion_matrix": normalize_rows(legacy_matrix),
        # Baseline includes the new targeted disambiguation but keeps threshold 0.22.
        "baseline_metrics": baseline_metrics,
        "baseline_per_class": baseline_per_class,
        "baseline_confusion_matrix": baseline_matrix,
        "baseline_normalized_confusion_matrix": normalize_rows(baseline_matrix),
        "calibrated_cv_metrics": cv_metrics,
        "calibrated_cv_per_class": cv_per_class,
        "calibrated_cv_confusion_matrix": cv_matrix,
        "calibrated_cv_normalized_confusion_matrix": normalize_rows(cv_matrix),
        "runtime_calibration_metrics": runtime_metrics,
        "runtime_calibration_per_class": runtime_per_class,
        "runtime_calibration_confusion_matrix": runtime_matrix,
        "runtime_calibration_normalized_confusion_matrix": normalize_rows(runtime_matrix),
        "fold_thresholds": fold_thresholds,
        "samples": sample_results,
    }

    output_json = Path(args.output).resolve()
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    frontend_module = Path(args.frontend_module).resolve()
    write_frontend_module(result, frontend_module)

    thresholds_output = Path(args.thresholds_output).resolve()
    write_threshold_config(
        selected_thresholds,
        thresholds_output,
        selected_mode=selected_mode,
    )

    latency_values = [int(item["latency_ms"]) for item in records]
    cold_start_latency = latency_values[0] if latency_values else 0
    steady_latency = latency_values[1:] if len(latency_values) > 1 else latency_values
    steady_avg = safe_div(sum(steady_latency), len(steady_latency))
    steady_median = statistics.median(steady_latency) if steady_latency else 0.0
    steady_sorted = sorted(steady_latency)
    if steady_sorted:
        p95_index = min(
            len(steady_sorted) - 1,
            max(0, math.ceil(len(steady_sorted) * 0.95) - 1),
        )
        steady_p95 = steady_sorted[p95_index]
        steady_min = min(steady_sorted)
        steady_max = max(steady_sorted)
    else:
        steady_p95 = steady_min = steady_max = 0

    latency_report = {
        "cold_start_ms": int(cold_start_latency),
        "steady_state_average_ms": round6(steady_avg),
        "steady_state_median_ms": round6(float(steady_median)),
        "steady_state_p95_ms": int(steady_p95),
        "steady_state_min_ms": int(steady_min),
        "steady_state_max_ms": int(steady_max),
    }
    result["latency"] = latency_report

    # Re-write outputs once latency diagnostics are attached.
    output_json.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_frontend_module(result, frontend_module)

    print()
    print("=" * 72)
    print("LEGACY BASELINE (0.22, before Alarm/Beep resolver)")
    print(f"Accuracy:        {legacy_metrics['accuracy'] * 100:.2f}%")
    print(f"Macro Precision: {legacy_metrics['macro_precision'] * 100:.2f}%")
    print(f"Macro Recall:    {legacy_metrics['macro_recall'] * 100:.2f}%")
    print(f"Macro F1:        {legacy_metrics['macro_f1'] * 100:.2f}%")
    print(f"No detection:    {legacy_metrics['no_detection_count']} / {len(records)}")
    print()
    print("CURRENT BASELINE (0.22 + Alarm/Beep disambiguation)")
    print(f"Accuracy:        {baseline_metrics['accuracy'] * 100:.2f}%")
    print(f"Macro Precision: {baseline_metrics['macro_precision'] * 100:.2f}%")
    print(f"Macro Recall:    {baseline_metrics['macro_recall'] * 100:.2f}%")
    print(f"Macro F1:        {baseline_metrics['macro_f1'] * 100:.2f}%")
    print(f"No detection:    {baseline_metrics['no_detection_count']} / {len(records)}")
    print()
    print(f"PER-CLASS CALIBRATION ({folds}-fold cross-validated)")
    print(f"Accuracy:        {cv_metrics['accuracy'] * 100:.2f}%")
    print(f"Macro Precision: {cv_metrics['macro_precision'] * 100:.2f}%")
    print(f"Macro Recall:    {cv_metrics['macro_recall'] * 100:.2f}%")
    print(f"Macro F1:        {cv_metrics['macro_f1'] * 100:.2f}%")
    print(f"No detection:    {cv_metrics['no_detection_count']} / {len(records)}")
    print()
    print(f"SELECTED RUNTIME: {selected_mode}")
    print("Runtime thresholds:")
    for label in TARGET_CLASSES:
        print(f"  {label:<10} {selected_thresholds[label]:.2f}")
    print(
        "Alarm/Beep resolver: "
        f"alarm >= {ALARM_BEEP_MIN_ALARM_SCORE:.2f}, "
        f"alarm/beep >= {ALARM_BEEP_MIN_RATIO:.2f}"
    )
    print()
    print("Latency:")
    print(f"  Cold start:          {cold_start_latency} ms")
    print(f"  Steady-state avg:    {steady_avg:.1f} ms")
    print(f"  Steady-state median: {steady_median:.1f} ms")
    print(f"  Steady-state p95:    {steady_p95} ms")
    print(f"  Steady-state range:  {steady_min}-{steady_max} ms")
    print()
    print(f"JSON:            {output_json}")
    print(f"Frontend data:   {frontend_module}")
    print(f"Threshold config:{thresholds_output}")
    print("=" * 72)

    return result


def parse_args() -> argparse.Namespace:
    default_dataset = Path(__file__).resolve().parent / "dataset"
    default_output = Path(__file__).resolve().parent / "results.json"
    default_frontend_module = (
        PROJECT_ROOT / "frontend" / "src" / "data" / "yamnetEvaluation.ts"
    )
    default_thresholds_output = (
        BACKEND_ROOT / "app" / "services" / "sound_thresholds.json"
    )

    parser = argparse.ArgumentParser(
        description=(
            "Evaluate and calibrate AccessMate Sound Awareness. The script "
            "produces a cross-validated confusion matrix and per-class runtime "
            "thresholds consumed by SoundAwarenessService."
        )
    )
    parser.add_argument(
        "--dataset",
        default=str(default_dataset),
        help="Dataset directory containing one folder per target class.",
    )
    parser.add_argument(
        "--output",
        default=str(default_output),
        help="Output JSON path.",
    )
    parser.add_argument(
        "--frontend-module",
        default=str(default_frontend_module),
        help="Generated TypeScript module consumed by HearingAssistant.tsx.",
    )
    parser.add_argument(
        "--thresholds-output",
        default=str(default_thresholds_output),
        help="Runtime per-class threshold configuration path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    asyncio.run(evaluate(args))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
