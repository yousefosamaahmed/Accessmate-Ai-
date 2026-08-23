# AccessMate YAMNet Confusion Matrix Evaluation

This evaluation measures the **six environmental sound categories monitored by AccessMate**, not all 521 raw AudioSet labels exposed by YAMNet.

Target categories:

1. Alarm
2. Siren
3. Doorbell
4. Baby Cry
5. Knocking
6. Alert Beep

`no_detection` is included as an additional prediction outcome when the highest monitored score stays below the application threshold.

## Run

From the backend directory with `.venv` active:

```powershell
cd "D:\AccessMate Ai Project\backend"
python evaluation\yamnet\evaluate_yamnet.py
```

The script writes:

```text
backend/evaluation/yamnet/results.json
frontend/src/data/yamnetEvaluation.ts
```

The generated frontend module is displayed by the Model Evaluation section in `HearingAssistant.tsx`.

## Metrics

The evaluator reports:

- Accuracy
- Macro Precision
- Macro Recall
- Macro F1
- Per-class Precision / Recall / F1
- Raw confusion matrix counts
- Row-normalized confusion matrix
- No-detection count/rate
- Per-sample predictions, confidence, latency, and monitored scores

## Important

Do not manually edit results to make them look better. The academic value comes from showing a reproducible evaluation of the exact model pipeline used by the application.
