# AccessMate AI

<p align="center">
  <strong>Multimodal Accessibility Platform for Communication, Digital Independence, Environmental Awareness, and Caregiver Support.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react&logoColor=111" alt="Frontend">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" alt="Backend">
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white" alt="Database">
  <img src="https://img.shields.io/badge/Audio-YAMNet-FF6F00?logo=tensorflow&logoColor=white" alt="YAMNet">
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#key-features">Features</a> •
  <a href="#ai-models--algorithms">AI Stack</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#yamnet-evaluation">Evaluation</a> •
  <a href="#local-development">Setup</a>
</p>

---

## Overview

**AccessMate AI** is an accessibility-first AI platform that brings multiple assistive workflows into one unified product.

Instead of relying on a single AI model, AccessMate AI combines:

- Specialized AI models
- Retrieval systems
- Real-time audio processing
- Browser accessibility APIs
- Caregiver automation
- Arabic and English interaction
- Multimodal AI workflows

The goal is simple:

> **Help users understand information, communicate more easily, react to important environmental events, and request assistance when needed.**

### Current Platform Capabilities

- ✅ Context-aware AI chat
- ✅ Direct voice-to-chat transcription
- ✅ Arabic and English interaction
- ✅ OCR and image understanding
- ✅ Document intelligence with RAG
- ✅ Live speech-to-text captions
- ✅ Live Arabic ↔ English translation
- ✅ Type-to-Speech
- ✅ Environmental sound awareness
- ✅ Live sound confidence
- ✅ Automatic sound switching
- ✅ Model evaluation dashboard
- ✅ Confusion Matrix
- ✅ Caregiver management
- ✅ Telegram caregiver notifications
- ✅ Website safety assistance
- ✅ Alert history
- ✅ Accessibility preferences
- ✅ RTL / LTR localization

---

# Key Features

## 🤖 AI Chat Assistant

AccessMate AI provides persistent, context-aware conversations with support for Arabic and English.

### Capabilities

- Maintains conversation history
- Understands follow-up questions
- Generates detailed responses
- Supports Arabic and English
- Respects explicit language instructions
- Supports text and voice interaction
- Saves conversations and messages
- Supports archive, unarchive, pin, and delete workflows

### Context-Aware Follow-Up

Example:

```text
User:
Explain neural networks.

Assistant:
[Detailed explanation]

User:
Give me more information.

Assistant:
[Continues the same topic using conversation context]
```

The assistant does not treat every follow-up as an unrelated new question.

---

## 🎙️ Direct Voice Chat

Voice input is treated as speech rather than a normal file upload.

### Voice Flow

```text
Microphone
   ↓
Speech recording
   ↓
User presses Send
   ↓
Recording stops internally
   ↓
Speech-to-Text
   ↓
Transcript becomes a normal user message
   ↓
Conversation context
   ↓
AI response
```

The raw `.webm` recording is not displayed as a normal chat attachment.

### Language Behavior

```text
Arabic speech
→ Arabic transcript
→ Arabic AI response
```

```text
English speech
→ English transcript
→ English AI response
```

Explicit instructions override automatic language behavior.

Example:

```text
User:
Explain machine learning but answer in Arabic.

Assistant:
[Arabic response]
```

The same voice-chat behavior is available in:

- Dashboard
- Chat Page

---

# 👂 Hearing Assistant

The Hearing Assistant is one of the main accessibility modules in AccessMate AI.

It contains three major areas:

```text
Conversation
Sound Awareness
Model Evaluation
```

---

## Live Speech-to-Text Captions

The application can display spoken content as live text.

### Features

- Arabic speech recognition
- English speech recognition
- Browser Speech Recognition
- Backend STT fallback
- Fullscreen captions
- Copy transcript
- Save transcript
- Download transcript
- Persistent hearing sessions

---

## 🌐 Live Translation

The Hearing Assistant supports live translation between:

```text
Arabic ↔ English
```

This allows a user to listen to one language while reading translated captions in another.

---

## 🔊 Type-to-Speech

Users can type a response and have it spoken aloud.

The feature uses the browser Speech Synthesis API.

Example:

```text
Typed text
   ↓
Browser Speech Synthesis
   ↓
Spoken output
```

This provides an additional communication method for users who may prefer typing over speaking.

---

# 🔊 Sound Awareness V4

Sound Awareness uses **YAMNet**, a pretrained environmental sound classification model, combined with custom AccessMate post-processing.

## Monitored Sounds

| Sound | Priority |
|---|---|
| 🚨 Alarm | High |
| 🚓 Siren | High |
| 🔔 Doorbell | Low |
| 👶 Baby Cry | Medium |
| 🚪 Knocking | Low |
| 📢 Alert Beep | Medium |

---

## Live Detection Pipeline

```text
Microphone
   ↓
Rolling audio window
   ↓
YAMNet
   ↓
Frame-level predictions
   ↓
AccessMate category mapping
   ↓
Transient-aware score aggregation
   ↓
Confidence threshold
   ↓
Alarm / Beep disambiguation
   ↓
Temporal stabilization
   ↓
Current sound + confidence
   ↓
Sound event
   ├── UI update
   ├── Database
   └── Caregiver / Telegram alert
```

---

## Live Sound Switching

The detected sound and confidence update automatically when the acoustic environment changes.

Example:

```text
Siren
Confidence: 96%
```

Then:

```text
Doorbell
Confidence: 91%
```

Then:

```text
Knocking
Confidence: 84%
```

The user does not need to stop and restart monitoring when the sound changes.

---

## Live Diagnostics

Sound Awareness can display:

- Current detected sound
- Confidence percentage
- Top predictions
- Inference latency
- Monitoring status
- Model readiness
- Recent sound events

---

## Runtime Optimizations

AccessMate adds several algorithms around YAMNet.

### 1. Transient-Aware Frame Aggregation

Short sounds can be lost when all audio frames are averaged equally.

Transient-aware processing is used for short environmental events such as:

```text
Doorbell
Knocking
Alert Beep
```

---

### 2. Validated Confidence Threshold

Current selected runtime:

```text
Global threshold = 0.22
```

The system rejects low-confidence predictions rather than forcing a classification.

---

### 3. Alarm vs Alert Beep Disambiguation

A targeted rule reduces confusion between Alarm and Alert Beep.

Current validated rule:

```text
Alarm score >= 0.25
AND
Alarm / Beep ratio >= 0.30
```

when Alert Beep initially receives the highest mapped score.

---

### 4. Temporal Stabilization

A single noisy audio window should not immediately create a caregiver alert.

AccessMate therefore uses temporal logic to require stronger evidence before creating a stable event.

---

### 5. Duplicate Suppression

The same continuous sound does not repeatedly create identical caregiver alerts.

---

### 6. Notification Cooldown

Repeated notifications for the same class are temporarily suppressed.

Current default same-class cooldown:

```text
30 seconds
```

A meaningful sound transition such as:

```text
Siren → Doorbell
```

is treated as a new event.

---

## YAMNet Warm-Up

TensorFlow / YAMNet has a significant one-time loading cost.

Sound Awareness V4 starts warming the model before active monitoring.

Frontend state:

```text
Warming YAMNet...
   ↓
YAMNet ready
```

Representative endpoint:

```text
POST /api/v1/hearing/sound-warmup
```

This prevents the first live sound from absorbing the complete model startup time.

---

# 📊 YAMNet Evaluation

AccessMate AI includes a dedicated environmental-sound evaluation pipeline.

## Evaluation Dataset

The current evaluation contains:

```text
60 labeled audio samples
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

The evaluator uses the same AccessMate sound inference service used by the application.

---

## Current Validated Results

| Metric | Initial Version | Current Runtime |
|---|---:|---:|
| Accuracy | 66.67% | **83.33%** |
| Macro Precision | — | **98.15%** |
| Macro Recall | 66.67% | **83.33%** |
| Macro F1 | 73.49% | **89.85%** |
| No Detection | 17 / 60 | **9 / 60** |

### Improvement

```text
Accuracy
66.67% → 83.33%
```

```text
Macro F1
73.49% → 89.85%
```

```text
No Detection
17 / 60 → 9 / 60
```

---

## Selected Runtime

Final selected configuration:

```text
global_0.22_with_alarm_beep_disambiguation
```

The project also evaluated per-class thresholds using cross-validation.

However, the per-class configuration produced lower validated performance than the selected global-threshold configuration.

Therefore, the weaker configuration was not deployed.

---

## Inference Latency

| Measurement | Result |
|---|---:|
| Cold Start | 27,292 ms |
| Steady-State Average | **42.9 ms** |
| Steady-State Median | **43.0 ms** |
| P95 | **67 ms** |
| Range | **24–74 ms** |

The cold-start value represents one-time TensorFlow/YAMNet loading.

Normal steady-state inference runs in tens of milliseconds.

---

## Confusion Matrix

The Model Evaluation section includes a Confusion Matrix.

### Matrix Interpretation

- Rows = Actual class
- Columns = Predicted class
- Diagonal = Correct classifications
- Off-diagonal = Misclassifications

The interface supports:

- Counts
- Percentages
- Per-class performance
- Current runtime information
- Evaluation metrics

> The Confusion Matrix uses labeled evaluation data. Live microphone audio has no known ground-truth label, so the matrix itself does not change simply because the live sound changes. Live confidence updates independently.

---

# 👁️ OCR and Vision

## OCR

AccessMate AI uses:

```text
PaddleOCR
PP-OCRv5
Arabic + English
```

### OCR Pipeline

```text
Image
   ↓
Text Detection
   ↓
Text Recognition
   ↓
Structured Text
   ↓
Confidence
   ↓
AI / Accessibility Workflow
```

Representative endpoints:

```text
POST /api/v1/ocr/extract
POST /api/v1/ocr/explain
```

---

## Vision Assistance

Vision assistance analyzes the complete visual context of an image rather than only reading visible text.

AccessMate can combine:

```text
OCR Text
+
Visual Understanding
=
More Useful Accessibility Description
```

Representative endpoints:

```text
POST /api/v1/vision/assist
POST /api/v1/vision/describe
```

---

# 📚 Document Intelligence and RAG

AccessMate AI supports document question answering through **Retrieval-Augmented Generation**.

## RAG Pipeline

```text
Document
   ↓
Text Extraction
   ↓
Chunking
   ↓
Multilingual MiniLM Embeddings
   ↓
PostgreSQL + pgvector
   ↓

User Question
   ↓
Question Embedding
   ↓
Vector Similarity Search
   ↓
Top Relevant Chunks
   ↓
LLM + Retrieved Context
   ↓
Grounded Answer
```

RAG is an architecture, not a single AI model.

---

## Embedding Model

Current embedding model:

```text
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

Configuration:

```text
Embedding dimension: 384
Normalized embeddings: Yes
Database: PostgreSQL
Vector extension: pgvector
```

---

# 🛡️ Website Safety

Website Safety is a hybrid risk-assessment system.

It combines:

```text
URL Validation
+
URL / Domain Heuristics
+
Threat Signals
+
Risk Scoring
+
User-Friendly Explanation
```

### Features

- Check URL
- Risk evidence
- Recommendations
- History
- Trusted domains
- Add trusted domain
- Edit trusted domain
- Delete trusted domain

> Website Safety is a decision-support feature and should not be treated as an absolute guarantee that a website is safe or malicious.

---

# 🧑‍⚕️ Care Center and Telegram Alerts

AccessMate AI supports trusted caregivers and care alerts.

Caregiver records can contain:

- Full name
- Relationship
- Phone
- Telegram Chat ID
- WhatsApp number
- Primary caregiver status
- Preferred communication channel
- Active / inactive state

---

## Environmental Sound Alerts

Sound notifications are not limited to emergency events.

Stable detections can generate caregiver notifications for:

```text
Alarm
Siren
Doorbell
Baby Cry
Knocking
Alert Beep
```

### Event Flow

```text
Stable Sound
   ↓
Sound Event Stored
   ↓
Care Alert Created
   ↓
Telegram Notification
```

---

## Spam Protection

Caregiver notifications use:

- Stable-event validation
- Confidence rules
- Duplicate suppression
- Same-class cooldown
- Sound-transition detection

This prevents the caregiver from receiving repeated messages for the same continuous sound.

---

# AI Models & Algorithms

AccessMate AI uses specialized models for specialized tasks.

## AI Models

| Model / Technology | Type | Role |
|---|---|---|
| **Llama 3.3 70B via Groq** | Large Language Model | Conversational AI |
| **Whisper-compatible STT** | Automatic Speech Recognition | Speech-to-Text |
| **PaddleOCR PP-OCRv5** | OCR Model / Pipeline | Text extraction |
| **Multilingual MiniLM** | Embedding Model | Semantic retrieval |
| **YAMNet** | Environmental Audio Classifier | Sound Awareness |
| **Configured Vision Models** | Multimodal AI | Image understanding |
| **Gemini Flash-Lite** | Language / Multimodal Model | Translation and selected workflows |

---

## Algorithms / Decision Logic

| Algorithm / Mechanism | Role |
|---|---|
| Self-Attention | Transformer language understanding |
| Autoregressive Generation | LLM output generation |
| Speech Decoding | Speech-to-Text |
| Text Detection + Recognition | OCR |
| Vector Similarity Search | Semantic document retrieval |
| Top-K Retrieval | RAG evidence selection |
| Transient-Aware Frame Aggregation | YAMNet post-processing |
| Confidence Thresholding | Sound acceptance |
| Alarm-vs-Beep Disambiguation | Similar-class resolution |
| Rolling Audio Inference | Live Sound Awareness |
| Temporal Stabilization | Prediction stability |
| Sound Transition Detection | Automatic sound switching |
| Duplicate Suppression | Alert spam prevention |
| Cooldown Logic | Notification control |
| URL Heuristics + Risk Scoring | Website Safety |

---

## Important Terminology

### Model

A trained AI system that learned patterns from data.

Examples:

```text
YAMNet
Llama
Whisper
MiniLM
PP-OCRv5
```

### Algorithm

A computational procedure used to process information or make a decision.

Examples:

```text
Confidence Thresholding
Vector Similarity Search
Temporal Stabilization
Alarm / Beep Resolver
```

### Architecture

Example:

```text
RAG
```

### Evaluation Method

Examples:

```text
Confusion Matrix
Accuracy
Precision
Recall
F1-Score
Cross-Validation
```

### Integration

Example:

```text
Telegram
```

---

# System Architecture

```text
┌──────────────────────────────────────────────┐
│            React + TypeScript UI             │
│                                              │
│ Dashboard / Chat / Hearing / Care / Library │
│ OCR / Vision / Safety / Settings            │
└─────────────────────┬────────────────────────┘
                      │
                      │ REST / JSON / multipart
                      ▼
┌──────────────────────────────────────────────┐
│                FastAPI Backend               │
│                                              │
│ Authentication                               │
│ Conversations                                │
│ LLM Orchestration                            │
│ Speech-to-Text                               │
│ Translation                                  │
│ OCR / Vision                                 │
│ RAG                                          │
│ YAMNet                                       │
│ Website Safety                               │
│ Caregiver / Telegram                         │
└─────────────────────┬────────────────────────┘
                      │
          ┌───────────┴──────────────┐
          ▼                          ▼
┌──────────────────────┐   ┌──────────────────────┐
│ PostgreSQL + pgvector│   │ External Services    │
│                      │   │                      │
│ Users                │   │ Groq                 │
│ Conversations        │   │ Gemini               │
│ Messages             │   │ STT Provider         │
│ Documents            │   │ Telegram             │
│ Embeddings           │   │ Email / SMTP         │
│ Care Alerts          │   │                      │
│ Hearing Sessions     │   │                      │
│ Sound Events         │   │                      │
└──────────────────────┘   └──────────────────────┘
```

---

# Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | User Interface |
| TypeScript | Type Safety |
| Vite | Development & Production Build |
| React Router | Client Routing |
| Axios | API Communication |
| Tailwind CSS | Styling |
| Framer Motion | Animation |
| Lucide React | Icons |
| React Markdown | Markdown Rendering |
| remark-gfm | GitHub-Flavored Markdown |
| Web Speech API | Browser Speech Features |

---

## Backend

| Technology | Purpose |
|---|---|
| Python | Backend Runtime |
| FastAPI | REST API |
| Uvicorn | ASGI Server |
| SQLAlchemy | ORM |
| Pydantic | Validation |
| PostgreSQL | Main Database |
| pgvector | Vector Retrieval |
| LiteLLM | LLM Provider Orchestration |
| Sentence Transformers | Embeddings |
| PaddleOCR | OCR |
| TensorFlow | Audio ML Runtime |
| TensorFlow Hub | YAMNet Loading |
| YAMNet | Environmental Sound Classification |
| SciPy | Audio Processing |
| ONNX Runtime | Inference Runtime |
| tf_keras | TensorFlow Compatibility |

---

## Validated Audio Stack

```text
TensorFlow       2.21.0
TensorFlow Hub   0.16.1
SciPy            1.17.1
ONNX Runtime     1.28.0
tf_keras         2.21.0
setuptools       81.0.0
```

---

# Project Structure

```text
AccessMate-AI/
│
├── backend/
│   │
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
│   │       └── dataset/
│   │
│   ├── sql/
│   │   ├── 001_create_hearing_persistence.sql
│   │   └── ROLLBACK_hearing_persistence.sql
│   │
│   ├── requirements-lock.txt
│   └── requirements-dev.txt
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── types/
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── .gitignore
├── .gitattributes
└── README.md
```

---

# Backend API

Base prefix:

```text
/api/v1
```

## Local Swagger

```text
http://127.0.0.1:8000/docs
```

## Health Endpoint

```text
GET http://127.0.0.1:8000/api/v1/health
```

---

## Authentication

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
```

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

POST /api/v1/hearing/sound-events
GET  /api/v1/hearing/sound-events
```

---

## Caregivers

```text
GET    /api/v1/caregivers
POST   /api/v1/caregivers
PATCH  /api/v1/caregivers/{id}
DELETE /api/v1/caregivers/{id}
```

---

## Care Alerts

```text
POST /api/v1/care-alerts
GET  /api/v1/care-alerts
```

---

# Database

Primary database:

```text
PostgreSQL
```

Local development configuration:

```text
Database:  accessmate_ai
Container: accessmate-postgres
Port:      5432
Image:     pgvector/pgvector:pg16
```

---

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

---

# Local Development

## Prerequisites

- Python 3.11+
- Node.js
- npm
- Docker
- PostgreSQL 16
- pgvector

---

## Clone Repository

```bash
git clone https://github.com/yousefosamaahmed/Accessmate-Ai-.git
cd Accessmate-Ai-
```

---

## Backend Setup

```powershell
cd backend

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

## Run Backend

```powershell
cd backend

.\.venv\Scripts\Activate.ps1

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Development endpoints:

```text
API:
http://127.0.0.1:8000

Swagger:
http://127.0.0.1:8000/docs

Health:
http://127.0.0.1:8000/api/v1/health
```

---

## Frontend Setup

```powershell
cd frontend

npm install

npm run dev
```

Local frontend:

```text
http://localhost:8080
```

---

## Production Frontend Build

```powershell
npm run build
```

Latest validated local build:

```text
Vite:                 8.2.1
Modules transformed:  2489
Build status:          PASS
Build time:            ~4.28 s
```

---

# Environment Variables

Create:

```text
backend/.env
```

Never commit secrets.

Example variable names:

```env
DATABASE_URL=
SECRET_KEY=

FRONTEND_ORIGIN=

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

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

---

# Testing & Validation

The current local build has been manually validated across the main product workflows.

| Feature | Status |
|---|---|
| Authentication + OTP | ✅ PASS |
| Dashboard | ✅ PASS |
| AI Chat | ✅ PASS |
| Contextual Follow-Up | ✅ PASS |
| Direct Voice Chat | ✅ PASS |
| Arabic Voice → Arabic Response | ✅ PASS |
| English Voice → English Response | ✅ PASS |
| Explicit Language Override | ✅ PASS |
| Conversation Persistence | ✅ PASS |
| Archive / Unarchive / Pin / Delete | ✅ PASS |
| File Upload | ✅ PASS |
| OCR | ✅ PASS |
| Vision | ✅ PASS |
| Library | ✅ PASS |
| Document RAG | ✅ PASS |
| Website Safety | ✅ PASS |
| Care Center | ✅ PASS |
| Hearing Assistant | ✅ PASS |
| Live Captions | ✅ PASS |
| Translation | ✅ PASS |
| Type-to-Speech | ✅ PASS |
| Sound Awareness V4 | ✅ PASS |
| Live Sound Switching | ✅ PASS |
| Live Confidence | ✅ PASS |
| YAMNet Warm-Up | ✅ PASS |
| Model Evaluation | ✅ PASS |
| Confusion Matrix | ✅ PASS |
| Sound Event Persistence | ✅ PASS |
| Telegram Caregiver Alerts | ✅ PASS |
| Emergency Escalation | ✅ PASS |
| Alert History | ✅ PASS |
| Settings | ✅ PASS |
| Account | ✅ PASS |
| Arabic / English UI | ✅ PASS |
| RTL / LTR | ✅ PASS |
| Production Frontend Build | ✅ PASS |

---

# Security

Never commit:

- `.env`
- Database passwords
- JWT secrets
- API keys
- Telegram bot tokens
- SMTP credentials
- OTP values
- Access tokens

The local `.env` file is ignored by Git.

Recommended checks before public pushes:

```powershell
git check-ignore backend/.env
git ls-files backend/.env
```

Expected behavior:

```text
backend/.env
```

should be ignored and should not appear in tracked files.

---

# Known Limitations

## Sound Evaluation Dataset

The current Sound Awareness evaluation uses:

```text
60 labeled audio clips
```

This is useful for internal evaluation and version comparison, but it is not a large-scale real-world benchmark.

Future evaluation should include:

- More recordings
- More recording devices
- Different microphone qualities
- Different distances
- Background noise
- Indoor environments
- Outdoor environments
- More samples per class

---

## YAMNet Cold Start

TensorFlow and YAMNet have a one-time model loading cost.

Sound Awareness V4 reduces the user impact by warming the model before active monitoring.

---

## Browser Speech APIs

Browser Speech Recognition and Speech Synthesis behavior can vary between browsers and operating systems.

Backend fallbacks reduce this dependency but do not eliminate it completely.

---

## Automated Testing

Manual end-to-end QA is complete.

A comprehensive automated test suite remains future work.

Potential additions:

- Unit tests
- API integration tests
- Regression tests
- Browser E2E tests

---

# Deployment

Production deployment is the next project phase.

```text
Production Database
   ↓
Backend Deployment
   ↓
Frontend Deployment
   ↓
Environment Variables
   ↓
Domain
   ↓
HTTPS
   ↓
CORS
   ↓
Telegram / Email Verification
   ↓
Production Smoke Test
```

---

## Production URLs

```text
Live Application:
TBD

Production API:
TBD

Swagger / OpenAPI:
TBD
```

---

# Roadmap

Future improvements may include:

- Larger Sound Awareness evaluation dataset
- Fine-tuned downstream audio classifier
- Additional environmental sound classes
- Improved Arabic dialect speech recognition
- Better live translation
- Mobile application
- PWA support
- Wearable integration
- Smart-glasses workflows
- Advanced voice navigation
- More multimodal workflows
- RAG source citations
- Retrieval-quality evaluation
- Full automated testing
- CI/CD
- Production observability
- Rate limiting
- Background task workers
- Alembic migrations
- Frontend code splitting
- Accessibility conformance audits

---

# Safety

AccessMate AI is an assistive decision-support platform.

It should not be represented as:

- A medical diagnostic device
- A guaranteed emergency-response service
- A guaranteed malicious-site detector
- A replacement for emergency services
- A replacement for professional care where professional care is required

Caregiver notifications depend on:

- Network availability
- Valid configuration
- Telegram availability
- External provider availability

---

# References

Official documentation for major technologies used in AccessMate AI:

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Vite](https://vite.dev/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Sentence Transformers](https://www.sbert.net/)
- [PaddleOCR](https://www.paddleocr.ai/)
- [TensorFlow](https://www.tensorflow.org/)
- [TensorFlow Hub](https://www.tensorflow.org/hub)
- [YAMNet](https://www.tensorflow.org/hub/tutorials/yamnet)
- [ONNX Runtime](https://onnxruntime.ai/docs/)
- [Groq API](https://console.groq.com/docs)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

<p align="center">
  <strong>Built to make AI-driven digital experiences more accessible, understandable, and responsive to real-world user needs.</strong>
</p>
