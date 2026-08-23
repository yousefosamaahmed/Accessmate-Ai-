# AccessMate AI

> **An accessibility-first, multimodal AI platform for communication, digital independence, safer interaction, and caregiver support.**

AccessMate AI is a full-stack assistive platform that combines conversational AI, speech recognition, live captions, OCR, computer vision, document intelligence, environmental sound awareness, website-safety assistance, caregiver workflows, and bilingual accessibility controls in one unified application.

The product is designed around a simple principle:

> **Accessibility tools should not only expose information — they should help users understand it, communicate, act on it, and request support when needed.**

---

## Project Status

| Item | Status |
|---|---|
| Core product implementation | ✅ Complete for the current scope |
| Local end-to-end QA | ✅ Passed |
| Arabic / English localization | ✅ Passed |
| RTL / LTR | ✅ Passed |
| Frontend production build | ✅ Passed |
| Contextual text + voice chat | ✅ Passed |
| Hearing Assistant | ✅ Passed |
| YAMNet Sound Awareness V4 | ✅ Passed |
| Confusion Matrix / model evaluation | ✅ Implemented |
| Caregiver + Telegram sound alerts | ✅ Implemented |
| Git local checkpoints | ✅ Created |
| GitHub remote | ⏳ Pending deployment phase |
| Production deployment | ⏳ Pending |
| Live demo URL | ⏳ Pending |
| Production API / Swagger URLs | ⏳ Pending |

**Latest tagged baseline:** `v1.0.0`  
**Current local state:** post-`v1.0.0` final pre-deployment build with contextual multilingual voice chat and Sound Awareness V4 improvements.

> After production deployment, only the deployment-specific URLs, screenshots, infrastructure details, and final release tag need to be added to this README.

---

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [Solution](#solution)
- [Main Product Modules](#main-product-modules)
- [AI Models, Algorithms, and Architectures](#ai-models-algorithms-and-architectures)
- [AI Chat and Voice Chat](#ai-chat-and-voice-chat)
- [Hearing Assistant](#hearing-assistant)
- [Sound Awareness V4](#sound-awareness-v4)
- [YAMNet Evaluation](#yamnet-evaluation)
- [Care Center and Telegram Alerts](#care-center-and-telegram-alerts)
- [Vision and OCR](#vision-and-ocr)
- [Document Intelligence and RAG](#document-intelligence-and-rag)
- [Website Safety](#website-safety)
- [Accessibility and Localization](#accessibility-and-localization)
- [Authentication and Security](#authentication-and-security)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Backend API](#backend-api)
- [Database](#database)
- [Local Development](#local-development)
- [Environment Configuration](#environment-configuration)
- [Testing and Validation](#testing-and-validation)
- [Git Milestones](#git-milestones)
- [Known Limitations](#known-limitations)
- [Deployment Checklist](#deployment-checklist)
- [Future Roadmap](#future-roadmap)
- [References](#references)

---

# Overview

AccessMate AI is an accessibility-first digital assistant intended to reduce dependence on fragmented assistive tools.

Instead of requiring separate applications for chat, OCR, image description, document question answering, speech recognition, environmental sound awareness, website safety, and caregiver communication, AccessMate AI connects these capabilities through one authenticated workspace.

The current system supports:

- Context-aware AI chat.
- Persistent conversation history.
- Direct microphone-to-text chat.
- Arabic and English speech recognition.
- Language-aware AI responses.
- Explicit response-language override.
- Image description.
- OCR for Arabic and English.
- File and document management.
- RAG-based document question answering.
- Semantic vector search.
- Live speech-to-text captions.
- Live Arabic/English caption translation.
- Type-to-Speech.
- Environmental sound classification.
- Live sound confidence and automatic sound switching.
- Sound-event persistence.
- Confusion Matrix and model-evaluation dashboard.
- Caregiver management.
- Telegram caregiver notifications.
- Emergency escalation.
- Alert history.
- Website-safety analysis.
- Trusted-domain management.
- Arabic / English interface localization.
- RTL / LTR layouts.
- Accessibility-oriented settings and voice guidance.

---

# Problem

Digital accessibility is often fragmented.

A user may need:

- One tool to understand text.
- Another to extract text from an image.
- Another to describe an image.
- Another to transcribe speech.
- Another to interpret documents.
- Another to recognize important environmental sounds.
- Another to contact a caregiver.
- Another to evaluate suspicious websites.

This fragmentation creates additional cognitive and operational overhead for users who already experience barriers when interacting with digital systems.

---

# Solution

AccessMate AI combines specialized AI models, deterministic algorithms, retrieval systems, browser accessibility APIs, and caregiver automation into one platform.

At a high level:

```text
User
 │
 ▼
React + TypeScript Frontend
 │
 │ HTTPS / REST / JSON / multipart
 ▼
FastAPI Backend
 │
 ├── Authentication
 ├── AI Chat
 ├── Speech-to-Text
 ├── Hearing Assistant
 ├── YAMNet Sound Awareness
 ├── OCR
 ├── Vision
 ├── Documents / RAG
 ├── Website Safety
 ├── Care Center
 ├── Telegram Notifications
 └── User Preferences / History
 │
 ▼
PostgreSQL + pgvector
 │
 ├── Users / profiles
 ├── Conversations / messages
 ├── Documents / chunks / embeddings
 ├── Caregivers / alerts
 ├── Hearing sessions
 ├── Hearing captions
 └── Hearing sound events
```

---

# Main Product Modules

## Active Modules

1. Landing / Public Pages
2. Authentication
3. Dashboard
4. AI Chat
5. Chats Management
6. Archive
7. Library
8. OCR
9. Vision Assistance
10. Website Safety
11. Care Center
12. Hearing Assistant
13. Alert History
14. Settings
15. Account

## Product Scope Change

An earlier experimental **Sign Language Recognition** module was removed from the final runtime product.

It was replaced by the **Hearing Assistant**, which now provides:

- Live captions.
- Live translation.
- Type-to-Speech.
- Environmental sound awareness.
- Caregiver sound notifications.
- Emergency escalation.

Legacy sign-language research artifacts are not part of the current production runtime.

---

# AI Models, Algorithms, and Architectures

AccessMate AI does **not** depend on one model for every task. It uses specialized models and algorithms for different accessibility workflows.

## Main AI Models

| Model / Technology | Type | Used For |
|---|---|---|
| **Llama 3.3 70B via Groq** | Large Language Model | AI chat, contextual answers, simplification |
| **Whisper-compatible STT** | Automatic Speech Recognition | Voice chat and backend speech transcription |
| **Gemini Flash-Lite** | Multimodal / language model | Fast live caption translation and selected vision workflows |
| **Configured Groq vision model** | Vision-language model fallback | Image understanding fallback |
| **PaddleOCR PP-OCRv5** | OCR model / pipeline | Arabic and English text extraction |
| **Multilingual MiniLM** | Sentence embedding model | Semantic document embeddings |
| **YAMNet** | Pretrained environmental audio classifier | Sound Awareness |

### Embedding Model

Current document embeddings use:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
Dimension: 384
Normalization: enabled
Storage: PostgreSQL + pgvector
Similarity: cosine distance
```

## Main Algorithms / Decision Logic

| Algorithm / Mechanism | Used For |
|---|---|
| Self-Attention | Transformer-based language understanding |
| Autoregressive generation | LLM response generation |
| Speech decoding | Speech-to-text transcription |
| Text detection + recognition | OCR |
| Vector similarity search | Document retrieval |
| Top-K retrieval | RAG evidence selection |
| Transient-aware frame aggregation | YAMNet score processing |
| Confidence thresholding | Sound acceptance / rejection |
| Alarm-vs-Beep disambiguation | Reducing similar-class confusion |
| Rolling audio inference | Live environmental sound monitoring |
| Temporal stability logic | Preventing sound-label flicker |
| Sound transition detection | Updating when the environmental sound changes |
| Duplicate suppression | Preventing repeated caregiver alerts |
| Cooldown logic | Notification-rate control |
| URL heuristics + risk scoring | Website Safety |

## Architectures / Pipelines

| Architecture / Pipeline | Role |
|---|---|
| **Transformer** | Core architecture behind language / speech / vision models |
| **RAG** | Retrieval-Augmented Generation for documents |
| **OCR pipeline** | Detection → recognition → structured text |
| **Live speech pipeline** | Microphone → transcription → language-aware AI response |
| **Live Sound Awareness pipeline** | Microphone → YAMNet → stabilization → event → caregiver |
| **Event-driven caregiver pipeline** | Stable event → DB → alert → Telegram |

## Evaluation Methods

The following are evaluation tools, not AI models:

- Confusion Matrix.
- Accuracy.
- Precision.
- Recall.
- F1-score.
- Cross-validation.
- Latency measurement.

---

# AI Chat and Voice Chat

AccessMate AI provides persistent contextual conversations.

## Text Chat

Supported behavior includes:

- Create and continue conversations.
- Persistent messages.
- Context-aware follow-up questions.
- Detailed informational responses.
- Arabic / English responses.
- Explicit language instructions.

Example:

```text
User: Explain neural networks.
Assistant: [English answer]

User: Give me more information.
Assistant: [Continues the same topic using conversation context]

User: Answer in Arabic.
Assistant: [Responds fully in Arabic]
```

## Direct Voice Chat

Microphone input is treated as **speech**, not as a normal uploaded audio attachment.

The final behavior is:

```text
Microphone
   ↓
Record
   ↓
Press Send
   ↓
Stop recording internally
   ↓
Speech-to-Text
   ↓
Transcript becomes normal user message
   ↓
Conversation context
   ↓
AI response
```

The `.webm` recording is not displayed as a user file attachment in the normal voice-chat flow.

## Language Behavior

The chat pipeline is language-aware:

- Arabic voice → Arabic transcript → Arabic AI response.
- English voice → English transcript → English AI response.
- English prompt requesting Arabic → Arabic response.
- Arabic prompt requesting English → English response.
- Follow-up requests preserve conversation context.

The same core behavior is implemented in both:

```text
Dashboard
ChatPage
```

---

# Hearing Assistant

The Hearing Assistant is one of the main accessibility modules in AccessMate AI.

It contains three major workflows:

```text
Conversation
Sound Awareness
Model Evaluation
```

---

## Live Speech-to-Text

The application can display spoken content as live captions.

Supported workflows include:

- Arabic speech.
- English speech.
- Automatic / selected language handling.
- Browser Speech Recognition where available.
- Backend STT fallback.
- Fullscreen caption display.
- Transcript copy.
- Transcript save.
- Transcript download.

The backend STT service is provider-configurable and supports Groq / OpenAI-compatible speech transcription.

---

## Arabic / English Translation

Live caption translation is supported between:

```text
Arabic ↔ English
```

The current backend translation service uses a low-latency Gemini Flash-Lite configuration for short-form caption translation.

---

## Type-to-Speech

Users can type a response and have the browser speak it aloud.

This provides a fast communication option during face-to-face interaction.

The feature uses the browser Speech Synthesis API rather than requiring a separate server-side TTS model.

---

# Sound Awareness V4

Sound Awareness uses **Google YAMNet** as the pretrained environmental sound classifier.

The current AccessMate mapping monitors six product-specific categories:

```text
Alarm
Siren
Doorbell
Baby Cry
Knocking
Alert Beep
```

## Live Flow

```text
Microphone
   ↓
1.2-second rolling audio window
   ↓
Refresh about every 0.6 seconds
   ↓
YAMNet frame-level predictions
   ↓
AccessMate category mapping
   ↓
Transient-aware score aggregation
   ↓
Global confidence threshold
   ↓
Alarm / Beep disambiguation
   ↓
Temporal stability logic
   ↓
Current Sound + Confidence + Top Predictions
   ↓
Sound Event
   ├── Save to database
   ├── Update UI
   └── Notify caregiver / Telegram
```

## Live Detection Features

Sound Awareness V4 includes:

- Continuous listening.
- Automatic current-sound updates.
- Live confidence percentage.
- Top live predictions.
- Inference latency.
- Automatic switching when the sound changes.
- No manual stop/start required when moving between sound types.
- Stable-event filtering.
- Duplicate-alert suppression.
- Same-class cooldown.
- Event persistence.
- Caregiver alert integration.
- Telegram delivery.
- Emergency escalation for high-priority sounds.

Example:

```text
Siren
Confidence: 96%

↓ environment changes

Doorbell
Confidence: 91%

↓ environment changes

Knocking
Confidence: 84%
```

The UI updates automatically as new audio windows are processed.

---

## Model Warm-Up

YAMNet / TensorFlow has a significant one-time cold-start cost.

Sound Awareness V4 therefore includes:

```text
POST /api/v1/hearing/sound-warmup
```

When the user opens the Sound Awareness tab, the model begins loading before monitoring starts.

Frontend state:

```text
Warming YAMNet…
↓
YAMNet ready
```

This avoids forcing the first live audio window to absorb the complete model-load delay.

---

## AccessMate Sound Post-Processing

The internal YAMNet weights were **not retrained**.

Instead, AccessMate improves practical detection through post-processing.

### 1. Transient-Aware Aggregation

Short sounds can be diluted when all frames are averaged.

Transient scoring is applied to:

```text
Doorbell
Knocking
Alert Beep
```

Sustained scoring is retained for:

```text
Alarm
Siren
Baby Cry
```

### 2. Validated Runtime Threshold

The selected runtime uses:

```text
Global threshold = 0.22
```

for all six monitored categories.

### 3. Alarm / Alert Beep Resolver

A targeted rule reduces Alarm ↔ Beep confusion.

Current validated resolver:

```text
Alarm score >= 0.25
AND
Alarm / Beep score ratio >= 0.30
```

when Beep initially wins.

### 4. Temporal Stability

Caregiver events are not generated from every single inference window.

The UI remains responsive while event creation requires stable evidence or very high confidence.

### 5. Cooldown / Duplicate Suppression

The same continuous sound does not repeatedly spam the caregiver.

A sound transition such as:

```text
Siren → Doorbell
```

is treated as a new event.

---

# YAMNet Evaluation

A dedicated **Model Evaluation** tab presents the Sound Awareness evaluation.

The evaluation uses a labeled set of:

```text
60 audio samples
6 classes
10 samples per class
```

Classes:

```text
Alarm
Siren
Doorbell
Baby Cry
Knocking
Alert Beep
```

The evaluator uses the **same AccessMate inference service** used by the application.

Generated artifacts:

```text
backend/evaluation/yamnet/results.json
frontend/src/data/yamnetEvaluation.ts
backend/app/services/sound_thresholds.json
```

## Current Selected Runtime Result

| Metric | Initial Evaluation | Final V3 Runtime |
|---|---:|---:|
| Accuracy | 66.67% | **83.33%** |
| Macro Precision | — | **98.15%** |
| Macro Recall | 66.67% | **83.33%** |
| Macro F1 | 73.49% | **89.85%** |
| No Detection | 17 / 60 | **9 / 60** |

### Improvement

```text
Accuracy: 66.67% → 83.33%
Macro F1: 73.49% → 89.85%
No Detection: 17/60 → 9/60
```

## Runtime Selection

The evaluator compared:

```text
Legacy baseline
Current baseline with Alarm/Beep disambiguation
Per-class cross-validated calibration
```

Final selected runtime:

```text
global_0.22_with_alarm_beep_disambiguation
```

The per-class threshold experiment was **not deployed** because cross-validation produced a lower result than the selected global-threshold runtime.

## Latency

Measured local evaluation:

| Measurement | Result |
|---|---:|
| Cold start | 27,292 ms |
| Steady-state average | **42.9 ms** |
| Steady-state median | **43.0 ms** |
| Steady-state P95 | **67 ms** |
| Steady-state range | **24–74 ms** |

The cold-start time represents one-time TensorFlow/YAMNet loading and is separated from normal inference latency.

## Confusion Matrix

The Model Evaluation tab includes a confusion matrix with:

- Actual classes on rows.
- Predicted classes on columns.
- Correct classifications on the diagonal.
- Misclassifications off the diagonal.
- Count / percentage views.
- Per-class performance.
- Current runtime configuration.

> **Important:** the Confusion Matrix is based on labeled evaluation data. It does not change simply because a live microphone sound changes, because live sound does not have known ground-truth labels. Live sound confidence and diagnostics update separately.

## Evaluation Caveat

The current 60-sample evaluation is useful for project validation and comparison between AccessMate inference versions, but it is **not a large-scale clinical or production benchmark**.

Metrics should therefore be reported as:

> **Performance on the current labeled AccessMate evaluation set**

and should not be generalized to every acoustic environment.

---

# Care Center and Telegram Alerts

Care Center provides trusted-caregiver management and assistive actions.

A caregiver record can include:

- Full name.
- Relationship.
- Phone.
- Telegram chat ID.
- WhatsApp number.
- Primary-caregiver status.
- Preferred communication channel.
- Active / inactive status.

---

## Sound-Based Caregiver Alerts

Sound notifications are **not limited to emergencies**.

Stable events from all six monitored classes can participate in the caregiver workflow.

Current severity mapping:

| Sound | Priority |
|---|---|
| Alarm | High |
| Siren | High |
| Baby Cry | Medium |
| Alert Beep | Medium |
| Doorbell | Low |
| Knocking | Low |

Example flow:

```text
Stable Doorbell
   ↓
Sound event saved
   ↓
Care alert created
   ↓
Telegram notification
```

High-priority sounds such as Alarm and Siren can also expose a separate emergency-escalation step.

## Spam Protection

Notifications use:

- Stable-event checks.
- Confidence requirements.
- Duplicate suppression.
- Same-class cooldown.
- New event on meaningful sound transition.

Default caregiver sound cooldown:

```text
30 seconds
```

---

# Vision and OCR

AccessMate AI separates **text extraction** from **visual understanding**.

---

## OCR

The current OCR service uses:

```text
PaddleOCR
PP-OCRv5
Arabic + English
CPU inference
```

OCR pipeline:

```text
Image
↓
Text detection
↓
Text recognition
↓
Text blocks
↓
Confidence
↓
Optional explanation / accessibility workflow
```

OCR results can be used for:

- Reading visible text.
- Simplification.
- Explanation.
- AI chat.
- Voice-friendly output.

---

## Vision Assistance

The Vision pipeline analyzes the complete visual context rather than only reading text.

Current architecture supports:

```text
Gemini Flash-Lite primary
↓ fallback if needed
Configured Groq vision model
```

OCR and vision can be combined so the application can reason about:

```text
Visible text
+
Visual context
=
More useful accessibility description
```

Representative routes:

```text
POST /api/v1/vision/assist
POST /api/v1/vision/describe
```

---

# Document Intelligence and RAG

The Library supports user document management and document intelligence.

## Processing Pipeline

```text
Upload
↓
Text extraction
↓
Chunking
↓
Embedding
↓
PostgreSQL + pgvector
↓
Semantic retrieval
↓
LLM answer
```

## RAG

RAG stands for:

```text
Retrieval-Augmented Generation
```

RAG is an **architecture**, not a single AI model.

AccessMate performs:

```text
User question
↓
Multilingual MiniLM embedding
↓
Cosine-distance vector search
↓
Top relevant document chunks
↓
Evidence context
↓
LLM
↓
Grounded answer
```

The RAG prompt instructs the language model to answer using the retrieved document evidence and to state when the requested information cannot be found.

## Embeddings

Current embedding implementation:

```text
Model:
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

Dimension:
384

normalize_embeddings:
True

Storage:
PostgreSQL + pgvector
```

---

# Website Safety

Website Safety is a **hybrid decision-support system**, not a standalone trained malicious-URL model.

It combines:

```text
URL validation
+
Local URL/domain heuristics
+
Threat signals
+
Risk scoring
+
User-friendly AI explanation
```

Features include:

- URL checks.
- Safety result.
- Risk evidence.
- Recommendations.
- Check history.
- Trusted domains.
- Add / edit / delete trusted domains.

> Website Safety is decision support and should not be treated as an absolute guarantee that a website is safe or malicious.

---

# Accessibility and Localization

Accessibility is a cross-cutting part of the application, not a single page.

## Languages

The final interface supports:

```text
English
Arabic
```

with:

```text
LTR
RTL
```

The localization work covers the primary workspace and public pages.

## Interface Accessibility

Current capabilities include:

- Larger readable text.
- Arabic / English switching.
- RTL / LTR synchronization.
- Voice-friendly AI output.
- Speech recognition.
- Speech synthesis.
- Fullscreen captions.
- Accessible navigation.
- Light / dark interface support.
- Accessibility preferences.
- Safer browsing assistance.

---

# Authentication and Security

AccessMate AI uses authenticated protected routes.

## Login Flow

```text
Email + Password
      ↓
Email OTP Verification
      ↓
Access Token
      ↓
Protected Application
```

Representative functionality includes:

- Register.
- Login.
- Email OTP verification.
- Current-user retrieval.
- Password reset.
- Protected profile/account operations.
- Optional two-factor-related flows where configured.

---

## Secret Management

Secrets must remain in environment variables.

Never commit:

- Database passwords.
- JWT secrets.
- Groq keys.
- OpenAI keys.
- Gemini keys.
- SMTP credentials.
- Telegram bot tokens.
- Access tokens.
- OTP values.

The local `.env` file is excluded from Git.

---

# System Architecture

```text
┌──────────────────────────────────────────────┐
│            React + TypeScript UI             │
│                                              │
│ Dashboard / Chat / Hearing / Care / Library │
│ Vision / OCR / Safety / Settings            │
└─────────────────────┬────────────────────────┘
                      │ REST / multipart
                      ▼
┌──────────────────────────────────────────────┐
│                FastAPI Backend               │
│                                              │
│ Auth                                         │
│ Conversations                                │
│ LLM orchestration                            │
│ Speech-to-Text                               │
│ Translation                                  │
│ OCR / Vision                                 │
│ RAG                                          │
│ YAMNet                                       │
│ Website Safety                               │
│ Caregiver / Telegram                         │
└─────────────────────┬────────────────────────┘
                      │
        ┌─────────────┴───────────────┐
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ PostgreSQL       │         │ External AI /    │
│ + pgvector       │         │ Communication    │
│                  │         │                  │
│ Users            │         │ Groq             │
│ Messages         │         │ Gemini           │
│ Documents        │         │ OpenAI-compatible│
│ Embeddings       │         │ STT              │
│ Care alerts      │         │ Telegram         │
│ Hearing events   │         │ Email / SMTP     │
└──────────────────┘         └──────────────────┘
```

---

# Technology Stack

## Frontend

| Technology | Role |
|---|---|
| React 19 | UI |
| TypeScript 6 | Type-safe frontend |
| Vite 8 | Development + production bundling |
| React Router | Client routing |
| Axios | API requests |
| Tailwind CSS 4 | Styling |
| Framer Motion | Animation |
| Lucide React | Icons |
| React Markdown | Markdown rendering |
| remark-gfm | GitHub-Flavored Markdown |
| Web Speech API | Browser speech recognition / speech synthesis |

Final validated frontend build environment:

```text
React              19.2.8
React DOM          19.2.8
TypeScript         6.0.3
Vite               8.2.1
React Router DOM   7.18.2
Axios               1.19.0
Framer Motion      13.0.0
Lucide React        1.30.0
Tailwind CSS        4.3.3
React Markdown      10.1.0
remark-gfm          4.0.1
Node.js tested      24.19.0
npm tested          11.17.0
```

## Backend

| Technology | Role |
|---|---|
| Python | Backend runtime |
| FastAPI | REST API |
| Uvicorn | ASGI server |
| SQLAlchemy | ORM |
| PostgreSQL | Main relational database |
| pgvector | Vector similarity storage/search |
| Pydantic | Validation |
| LiteLLM | Multi-provider LLM orchestration |
| Sentence Transformers | Document embeddings |
| PaddleOCR | OCR |
| TensorFlow 2.21 | Audio ML runtime |
| TensorFlow Hub 0.16.1 | YAMNet loading |
| YAMNet | Environmental sound classification |
| SciPy 1.17.1 | Audio resampling / scientific processing |
| tf_keras 2.21.0 | TensorFlow/Keras compatibility |
| ONNX Runtime 1.28.0 | Validated installed runtime dependency |
| setuptools 81.0.0 | Validated TensorFlow Hub compatibility |

> The validated environment intentionally preserved the TensorFlow / TensorFlow Hub dependency combination that was known to work during final local testing.

---

# Project Structure

Simplified repository layout:

```text
AccessMate Ai Project/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   ├── core/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── evaluation/
│   │   └── yamnet/
│   │       ├── evaluate_yamnet.py
│   │       ├── results.json
│   │       └── dataset/          # local evaluation audio, subject to licensing
│   │
│   ├── sql/
│   │   ├── 001_create_hearing_persistence.sql
│   │   └── ROLLBACK_hearing_persistence.sql
│   │
│   ├── requirements-lock.txt
│   ├── requirements-dev.txt
│   └── .env                      # local only / ignored
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── data/
│   │   │   └── yamnetEvaluation.ts
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── index.html
│
├── .gitattributes
├── .gitignore
└── README.md
```

---

# Backend API

Core routes are versioned under:

```text
/api/v1
```

Local Swagger:

```text
http://127.0.0.1:8000/docs
```

Local health:

```text
GET http://127.0.0.1:8000/api/v1/health
```

---

## Authentication

Representative routes:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/email-otp/verify-login
GET  /api/v1/auth/me
POST /api/v1/auth/password-reset/request
POST /api/v1/auth/password-reset/confirm
```

---

## AI

```text
POST /api/v1/ai/chat
POST /api/v1/ai/simple-explanation
GET  /api/v1/ai-interactions
```

---

## Conversations

Representative routes:

```text
POST   /api/v1/conversations
GET    /api/v1/conversations/{conversation_id}
PATCH  /api/v1/conversations/{conversation_id}
DELETE /api/v1/conversations/{conversation_id}

GET    /api/v1/conversations/me
POST   /api/v1/conversations/me

GET    /api/v1/conversations/me/{conversation_id}/messages
POST   /api/v1/conversations/me/{conversation_id}/messages
```

---

## Documents / Files

Representative routes include:

```text
POST /api/v1/files/upload
GET  /api/v1/documents/me
POST /api/v1/documents/me
POST /api/v1/documents/me/upload
```

Document workflows include:

- Extraction.
- Chunking.
- Embedding.
- Search.
- Preparation.
- RAG question answering.

---

## OCR

```text
POST /api/v1/ocr/extract
POST /api/v1/ocr/explain
```

---

## Vision

```text
POST /api/v1/vision/assist
POST /api/v1/vision/describe
```

---

## Hearing Assistant

```text
POST /api/v1/hearing/transcribe-chunk
POST /api/v1/hearing/translate

POST /api/v1/hearing/sound-warmup
POST /api/v1/hearing/classify-sound
POST /api/v1/hearing/sound-alert

POST /api/v1/hearing/sessions
GET  /api/v1/hearing/sessions
GET  /api/v1/hearing/sessions/{session_id}
DELETE /api/v1/hearing/sessions/{session_id}

POST /api/v1/hearing/sound-events
GET  /api/v1/hearing/sound-events
```

Sound events can be linked to Care Alerts.

---

## Caregivers / Alerts

Representative routes:

```text
GET    /api/v1/caregivers
POST   /api/v1/caregivers
GET    /api/v1/caregivers/{id}
PATCH  /api/v1/caregivers/{id}
DELETE /api/v1/caregivers/{id}

POST /api/v1/care-alerts
GET  /api/v1/care-alerts
GET  /api/v1/care-alerts/{id}
```

Care Alert lifecycle operations support sent, failed, acknowledged, and resolved states.

---

## Website Safety

Representative routes:

```text
POST /api/v1/website-safety/check
GET  /api/v1/website-safety/history
GET  /api/v1/website-safety/history/{check_id}

GET    /api/v1/website-safety/trusted-domains
POST   /api/v1/website-safety/trusted-domains
PATCH  /api/v1/website-safety/trusted-domains/{domain_id}
DELETE /api/v1/website-safety/trusted-domains/{domain_id}
```

---

# Database

Primary database:

```text
PostgreSQL
```

Local validated development configuration:

```text
Database:  accessmate_ai
Container: accessmate-postgres
Port:      5432
Image:     pgvector/pgvector:pg16
```

## Hearing Persistence Tables

```text
hearing_sessions
hearing_captions
hearing_sound_events
```

Migration:

```text
backend/sql/001_create_hearing_persistence.sql
```

Current project schema management uses SQLAlchemy plus explicit SQL migration scripts for the hearing persistence layer.

Alembic is not currently required by the project.

---

# Local Development

## Prerequisites

Recommended development environment:

```text
Python 3.11+
Node.js
npm
Docker
PostgreSQL 16 + pgvector
```

---

## 1. Repository

After GitHub publication:

```bash
git clone <GITHUB_REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

Current local project:

```powershell
cd "D:\AccessMate Ai Project"
```

---

## 2. PostgreSQL

Check Docker:

```powershell
docker ps
```

If the local container already exists:

```powershell
docker start accessmate-postgres
```

---

## 3. Backend

```powershell
cd "D:\AccessMate Ai Project\backend"

python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements-lock.txt
```

Development dependencies:

```powershell
python -m pip install -r requirements-dev.txt
```

Validate dependencies:

```powershell
python -m pip check
```

---

## 4. Hearing Database Migration

Apply:

```text
backend/sql/001_create_hearing_persistence.sql
```

to a new database before using hearing persistence.

---

## 5. Run Backend

```powershell
cd "D:\AccessMate Ai Project\backend"
.\.venv\Scripts\Activate.ps1

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Development endpoints:

```text
API:     http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs
Health:  http://127.0.0.1:8000/api/v1/health
```

---

## 6. Frontend

```powershell
cd "D:\AccessMate Ai Project\frontend"

npm install
npm run dev
```

Current local frontend:

```text
http://localhost:8080
```

---

## 7. Production Frontend Build

```powershell
cd "D:\AccessMate Ai Project\frontend"
npm run build
```

Latest validated build:

```text
Vite:               8.2.1
Modules transformed: 2489
Build status:        PASS
Build time:          ~4.28 s
```

Output:

```text
frontend/dist/
```

---

# Environment Configuration

Create:

```text
backend/.env
```

Do **not** commit it.

Typical configuration keys include:

```env
DATABASE_URL=
SECRET_KEY=
FRONTEND_ORIGIN=http://localhost:8080

AI_PROVIDER=
AI_MODEL=
AI_TEMPERATURE=
AI_MAX_TOKENS=

GROQ_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

STT_PROVIDER=
STT_MODEL=

VISION_PROVIDER=
VISION_MODEL=

TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=

# Email / OTP configuration
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

The exact required variables depend on which providers are enabled.

A public repository should contain a sanitized:

```text
.env.example
```

with variable names only and no credentials.

---

# Testing and Validation

## Manual End-to-End QA

The current local build has been manually validated across the main user flows.

```text
Authentication + OTP                 PASS
Dashboard                            PASS
AI Chat                              PASS
Contextual follow-up                 PASS
Voice → normal chat message          PASS
Arabic voice → Arabic response       PASS
English voice → English response     PASS
Explicit language override           PASS
Conversation persistence             PASS
Pin / Archive / Unarchive            PASS
Delete conversation                  PASS
File upload                          PASS
Vision                               PASS
OCR                                  PASS
Library                              PASS
RAG / document workflows             PASS
Website Safety                       PASS
Care Center                          PASS
Hearing Assistant                    PASS
Live Speech-to-Text                  PASS
Translation                          PASS
Type-to-Speech                       PASS
Sound Awareness V4                   PASS
Live sound switching                 PASS
Live confidence                      PASS
YAMNet warm-up                       PASS
Model Evaluation tab                 PASS
Confusion Matrix                     PASS
Sound event persistence              PASS
All-sound caregiver alerts           PASS
Telegram integration                 PASS
Emergency escalation                 PASS
Alert History                        PASS
Settings                             PASS
Account                              PASS
Arabic / English UI                  PASS
RTL / LTR                            PASS
Frontend production build            PASS
```

---

## YAMNet Evaluation

Final selected local evaluation:

```text
Accuracy:         83.33%
Macro Precision:  98.15%
Macro Recall:     83.33%
Macro F1:         89.85%
No Detection:     9 / 60

Steady-state average latency: 42.9 ms
Median latency:               43.0 ms
P95 latency:                  67 ms
```

---

## Python Dependencies

Validated hearing/audio stack:

```text
TensorFlow       2.21.0
TensorFlow Hub   0.16.1
ONNX Runtime     1.28.0
SciPy            1.17.1
tf_keras         2.21.0
setuptools       81.0.0
```

Dependency validation:

```powershell
python -m pip check
```

Expected validated result:

```text
No broken requirements found.
```

---

## Automated Tests

`pytest` is included in development dependencies.

Current project status:

```text
pytest runtime:                available
comprehensive automated suite: not yet implemented
manual end-to-end QA:          completed
```

Future engineering work should add unit, API integration, regression, and browser E2E tests.

---

# Git Milestones

## Stable Hearing Assistant Baseline

```text
Tag:    v0.1-hearing-baseline
Commit: b0a2219
```

## Local v1.0.0 Baseline

```text
Tag:    v1.0.0
Commit: 27ff4fa
```

Associated localization / QA milestones include:

```text
878fa2b  fix sidebar language sync
6c97a42  fix complete frontend localization and encoding
ec8e92e  add backend development test requirements
27ff4fa  merge final frontend localization and QA fixes
```

## Post-v1.0 Local Enhancements

Additional local checkpoints were created after `v1.0.0` for:

- Context-aware multilingual direct voice chat.
- YAMNet evaluation infrastructure.
- Sound Awareness accuracy optimization.
- Alarm / Beep disambiguation.
- Live Sound Awareness V4.
- Caregiver notifications for stable environmental sounds.

Final public tag / release number should be assigned after production deployment and smoke testing.

---

# Known Limitations

## 1. Sound Evaluation Dataset Size

The current YAMNet evaluation set contains 60 labeled clips.

It is sufficient for internal version comparison but too small to claim broad real-world generalization.

Future work should add:

- More speakers / environments.
- Different microphones.
- Different distances.
- Background noise.
- Indoor / outdoor conditions.
- More samples per class.

## 2. YAMNet Cold Start

TensorFlow / YAMNet loading can take multiple seconds on the development machine.

V4 mitigates this through model warm-up.

## 3. Automated Testing

The project currently relies heavily on manual QA.

## 4. Frontend Bundle Size

The production build has a large JavaScript chunk warning.

Future optimization should use lazy loading / code splitting.

## 5. Database Migrations

A future production engineering iteration should consider Alembic for systematic migration management.

## 6. Browser Speech APIs

Browser Speech Recognition / Speech Synthesis behavior can vary between browsers and platforms.

Backend fallbacks reduce, but do not completely remove, platform dependence.

---

# Deployment Checklist

Production deployment is the next project phase.

Before public release:

- [ ] Confirm clean Git working tree.
- [ ] Run `python -m pip check`.
- [ ] Run final YAMNet evaluation if sound code changed.
- [ ] Run `npm run build`.
- [ ] Re-run critical manual QA.
- [ ] Verify `.env` is ignored.
- [ ] Scan Git history for secrets.
- [ ] Create / verify `.env.example`.
- [ ] Create GitHub repository.
- [ ] Add Git remote.
- [ ] Push `main`.
- [ ] Push tags.
- [ ] Provision production PostgreSQL + pgvector.
- [ ] Apply database migrations.
- [ ] Configure production environment variables.
- [ ] Deploy backend.
- [ ] Deploy frontend.
- [ ] Configure domain.
- [ ] Enable HTTPS.
- [ ] Restrict production CORS.
- [ ] Verify microphone permission under HTTPS.
- [ ] Verify email OTP.
- [ ] Verify AI Chat.
- [ ] Verify Vision + OCR.
- [ ] Verify RAG.
- [ ] Verify Sound Awareness.
- [ ] Verify Telegram caregiver alerts.
- [ ] Verify Website Safety.
- [ ] Run production smoke test.
- [ ] Add GitHub URL to this README.
- [ ] Add live-demo URL.
- [ ] Add production API / Swagger links.
- [ ] Add final screenshots.
- [ ] Create final public release tag.

---

# Deployment Information

To be completed immediately after deployment:

```text
GitHub Repository:
TBD

Live Application:
TBD

Production API:
TBD

Swagger / OpenAPI:
TBD

Production Release:
TBD
```

---

# Future Roadmap

Potential future work includes:

- Larger Sound Awareness evaluation datasets.
- Fine-tuned downstream audio classifier using YAMNet embeddings.
- Additional environmental sound categories.
- More robust Arabic dialect speech support.
- Better live translation.
- Native mobile application.
- PWA optimization.
- Wearable integration.
- Smart-glasses workflows.
- More advanced voice navigation.
- Additional multimodal reasoning.
- RAG source citations in the UI.
- RAG retrieval evaluation.
- Full automated test suite.
- CI/CD.
- Structured production observability.
- Rate limiting.
- Background jobs for long AI tasks.
- Cloud object storage.
- Alembic migrations.
- Frontend code splitting.
- Accessibility conformance audits.

---

# Safety Notes

AccessMate AI is an assistive decision-support platform.

It should not be represented as:

- A medical diagnostic device.
- A guaranteed emergency-response service.
- A guaranteed malicious-site detector.
- A replacement for emergency services.
- A replacement for professional care where professional care is required.

Caregiver and Telegram alerts depend on network availability, valid configuration, and third-party service availability.

---

# References

Official documentation for major technologies used in the project:

- FastAPI — https://fastapi.tiangolo.com/
- FastAPI CORS — https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI Security — https://fastapi.tiangolo.com/tutorial/security/
- React — https://react.dev/
- Vite — https://vite.dev/
- TypeScript — https://www.typescriptlang.org/docs/
- React Router — https://reactrouter.com/
- Tailwind CSS — https://tailwindcss.com/docs
- SQLAlchemy — https://docs.sqlalchemy.org/
- PostgreSQL — https://www.postgresql.org/docs/
- pgvector — https://github.com/pgvector/pgvector
- Sentence Transformers — https://www.sbert.net/
- PaddleOCR — https://www.paddleocr.ai/
- TensorFlow — https://www.tensorflow.org/
- TensorFlow Hub — https://www.tensorflow.org/hub
- YAMNet — https://www.tensorflow.org/hub/tutorials/yamnet
- YAMNet / AudioSet tutorial — https://www.tensorflow.org/tutorials/audio/transfer_learning_audio
- ONNX Runtime — https://onnxruntime.ai/docs/
- LiteLLM — https://docs.litellm.ai/
- Groq API — https://console.groq.com/docs
- Gemini API — https://ai.google.dev/gemini-api/docs
- OpenAI Speech-to-Text API — https://platform.openai.com/docs/guides/speech-to-text
- Telegram Bot API — https://core.telegram.org/bots/api
- Web Speech API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Git — https://git-scm.com/docs
- scikit-learn model evaluation — https://scikit-learn.org/stable/modules/model_evaluation.html

---

# Final Release Note

The current AccessMate AI codebase represents the **final local pre-deployment product build** for the current academic/project scope.

The remaining release work is operational rather than architectural:

```text
GitHub publication
Production infrastructure
HTTPS / domain configuration
Production smoke testing
README deployment URLs
Final screenshots
Final public release tag
```

Once those items are complete, this README can be updated without changing the core technical documentation above.
