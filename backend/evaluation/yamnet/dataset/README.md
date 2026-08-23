# YAMNet Evaluation Dataset

Place labeled **WAV** evaluation clips into these folders:

```text
dataset/
├── alarm/
├── siren/
├── doorbell/
├── baby_cry/
├── knock/
└── beep/
```

## Recommended minimum

- Minimum for a quick academic demonstration: **10 independent clips per class** (60 total).
- Better: **20+ clips per class**, recorded or sourced from varied environments/devices.
- Do not use the same exact clip repeatedly.
- Prefer clips not used to tune thresholds or category mappings.

The evaluator uses the same application threshold (`0.22`) and the exact `SoundAwarenessService`, so the matrix evaluates the behavior users actually receive.

All clips must be valid WAV audio. The production service handles resampling to 16 kHz internally.
