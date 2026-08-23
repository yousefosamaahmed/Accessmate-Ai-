AccessMate AI

<p align="center">
  <strong>Multimodal accessibility platform for communication, digital independence, environmental awareness, and caregiver support.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react&logoColor=111" alt="React">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Audio-YAMNet-FF6F00?logo=tensorflow&logoColor=white" alt="YAMNet">
</p>

Overview

AccessMate AI is an accessibility-first AI platform that brings multiple assistive workflows into one product.

Instead of relying on a single AI model, AccessMate AI combines specialized models, retrieval systems, real-time audio processing, browser accessibility APIs, and caregiver automation to support different user needs.

The current platform includes:

Context-aware AI chat

Direct voice-to-chat transcription

Arabic and English interaction

OCR and image understanding

Document intelligence with RAG

Live speech-to-text captions

Live Arabic ↔ English translation

Type-to-Speech

Environmental sound awareness

Live sound confidence and automatic sound switching

Caregiver management

Telegram caregiver notifications

Website safety assistance

Alert history

Accessibility settings

RTL / LTR localization

Key Features

AI Chat

AccessMate AI provides persistent, context-aware conversations with support for Arabic and English.

The chat can:

Maintain conversation history

Understand follow-up questions

Generate detailed responses

Respond in the language of the user's speech or text

Respect explicit instructions such as “answer in Arabic” or “answer in English”

Handle direct voice input without displaying the recording as a file attachment

Voice Chat

Voice input follows this flow:

Microphone
   ↓
Speech recording
   ↓
Speech-to-Text
   ↓
Normal user message
   ↓
Conversation context
   ↓
AI response

Arabic speech produces Arabic text and Arabic AI responses by default, while English speech produces English responses unless the user explicitly requests another language.

Hearing Assistant

The Hearing Assistant is one of the core accessibility modules in AccessMate AI.

It includes:

Live Captions

Live speech-to-text

Arabic and English

Browser Speech Recognition

Backend STT fallback

Fullscreen captions

Copy transcript

Save transcript

Download transcript

Live Translation

Supports:

Arabic ↔ English

for live caption workflows.

Type-to-Speech

Users can type a response and have the browser speak it aloud using the Web Speech / Speech Synthesis API.

Sound Awareness V4

Sound Awareness uses YAMNet, a pretrained environmental sound classifier, with custom AccessMate post-processing.

Monitored Sounds

Alarm
Siren
Doorbell
Baby Cry
Knocking
Alert Beep

Live Detection Pipeline

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
Temporal stability
   ↓
Current sound + confidence
   ↓
Sound event
   ├── UI update
   ├── Database
   └── Caregiver / Telegram alert

Live Behavior

The detected sound and confidence update automatically as the environment changes.

Example:

Siren
Confidence: 96%

↓ sound changes

Doorbell
Confidence: 91%

↓ sound changes

Knocking
Confidence: 84%

No manual stop/start cycle is required when the sound changes.

Runtime Optimizations

AccessMate adds several post-processing algorithms around YAMNet:

Transient-aware frame aggregation

Global validated confidence threshold

Alarm-vs-Beep disambiguation

Rolling audio inference

Temporal stabilization

Sound-transition detection

Duplicate suppression

Notification cooldown

Model warm-up before live monitoring

The current validated global threshold is:

0.22

YAMNet Evaluation

The project includes a dedicated sound-model evaluation pipeline and a Model Evaluation tab in the frontend.

Evaluation Set

60 labeled audio samples
6 classes
10 samples per class

Current Validated Results

Metric

Initial

Current

Accuracy

66.67%

83.33%

Macro Precision

—

98.15%

Macro Recall

66.67%

83.33%

Macro F1

73.49%

89.85%

No Detection

17 / 60

9 / 60

Inference Latency

Measurement

Result

Cold start

27,292 ms

Steady-state average

42.9 ms

Steady-state median

43.0 ms

P95

67 ms

Range

24–74 ms

The cold-start delay represents the one-time TensorFlow/YAMNet model load. Sound Awareness V4 warms the model before live monitoring to avoid placing that cost on the first real detection.

Confusion Matrix

The Model Evaluation view includes:

Actual classes on rows

Predicted classes on columns

Count and percentage views

Correct classifications on the diagonal

Misclassifications off the diagonal

Class-level performance

Current runtime configuration

The confusion matrix is based on labeled evaluation data. Live microphone confidence updates independently because live audio does not have known ground-truth labels.

OCR and Vision

OCR

AccessMate AI uses PaddleOCR PP-OCRv5 for Arabic and English text extraction.

Pipeline:

Image
   ↓
Text detection
   ↓
Text recognition
   ↓
Structured text
   ↓
Confidence
   ↓
AI explanation / accessibility workflow

Vision Assistance

Vision workflows analyze the visual context of an image rather than only reading text.

AccessMate can combine:

OCR text
+
Visual understanding
=
More useful accessibility description

Document Intelligence and RAG

AccessMate AI supports document question answering through Retrieval-Augmented Generation (RAG).

RAG is an architecture, not a single model.

Pipeline

Document
   ↓
Text extraction
   ↓
Chunking
   ↓
Multilingual MiniLM embeddings
   ↓
PostgreSQL + pgvector
   ↓

User question
   ↓
Question embedding
   ↓
Vector similarity search
   ↓
Top relevant chunks
   ↓
LLM + retrieved context
   ↓
Grounded answer

Current embedding model:

sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

Configuration:

Embedding dimension: 384
Normalized embeddings: Yes
Vector storage: PostgreSQL + pgvector

Website Safety

Website Safety is a hybrid risk-assessment feature.

It combines:

URL validation
+
URL / domain heuristics
+
Threat signals
+
Risk scoring
+
User-friendly explanation

The feature includes:

URL checks

Risk evidence

Recommendations

History

Trusted domains

It is a decision-support feature and should not be treated as an absolute guarantee that a website is safe or malicious.

Care Center and Telegram Alerts

AccessMate AI can store trusted caregiver information and create care alerts.

Environmental sound notifications are not limited to emergencies.

Example Priority Policy

Sound

Priority

Alarm

High

Siren

High

Baby Cry

Medium

Alert Beep

Medium

Doorbell

Low

Knocking

Low

Alert Flow

Stable sound
   ↓
Sound event stored
   ↓
Care alert created
   ↓
Telegram notification

To avoid notification spam, the system uses:

Stable-event checks

Confidence rules

Duplicate suppression

Same-class cooldown

New events on meaningful sound transitions

AI Models and Algorithms

AccessMate AI uses specialized models for specialized tasks.

Models

Model / Technology

Type

Role

Llama 3.3 70B via Groq

LLM

Conversational AI

Whisper-compatible STT

ASR

Speech-to-Text

PaddleOCR PP-OCRv5

OCR model / pipeline

Text extraction

Multilingual MiniLM

Embedding model

Semantic retrieval

YAMNet

Audio classifier

Environmental sound awareness

Configured vision models

Multimodal AI

Image understanding

Gemini Flash-Lite

Language / multimodal model

Fast translation and selected workflows

Algorithms / Decision Logic

Algorithm / Mechanism

Role

Self-Attention

Transformer language understanding

Autoregressive generation

LLM output generation

Vector similarity search

Semantic document retrieval

Top-K retrieval

RAG evidence selection

Transient-aware frame aggregation

YAMNet post-processing

Confidence thresholding

Sound acceptance

Alarm-vs-Beep disambiguation

Similar-class resolution

Rolling audio inference

Live monitoring

Temporal stabilization

Prediction stability

Sound transition detection

Automatic sound switching

Duplicate suppression

Alert spam prevention

Cooldown logic

Notification control

URL heuristics + risk scoring

Website Safety

Important Terminology

Model: a trained AI system, e.g. YAMNet or MiniLM

Algorithm: computational decision logic, e.g. thresholding or vector similarity

Architecture: e.g. RAG

Evaluation method: e.g. Confusion Matrix

Integration: e.g. Telegram

System Architecture

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
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────────┐   ┌──────────────────────┐
│ PostgreSQL + pgvector│   │ External Services    │
│                      │   │                      │
│ Users                │   │ Groq                 │
│ Conversations        │   │ Gemini               │
│ Documents            │   │ STT Provider         │
│ Embeddings           │   │ Telegram             │
│ Care Alerts          │   │ Email / SMTP         │
│ Hearing Sessions     │   │                      │
│ Sound Events         │   │                      │
└──────────────────────┘   └──────────────────────┘

Technology Stack

Frontend

React

TypeScript

Vite

React Router

Axios

Tailwind CSS

Framer Motion

Lucide React

React Markdown

remark-gfm

Web Speech API

Backend

Python

FastAPI

Uvicorn

SQLAlchemy

Pydantic

PostgreSQL

pgvector

LiteLLM

Sentence Transformers

PaddleOCR

TensorFlow

TensorFlow Hub

YAMNet

SciPy

ONNX Runtime

tf_keras

Validated audio stack:

TensorFlow       2.21.0
TensorFlow Hub   0.16.1
SciPy            1.17.1
ONNX Runtime     1.28.0
tf_keras         2.21.0
setuptools       81.0.0

Project Structure

AccessMate-AI/
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
│   │       └── dataset/
│   │
│   ├── sql/
│   │   ├── 001_create_hearing_persistence.sql
│   │   └── ROLLBACK_hearing_persistence.sql
│   │
│   ├── requirements-lock.txt
│   ├── requirements-dev.txt
│   └── .env
│
├── frontend/
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

Backend API

Base prefix:

/api/v1

Local Swagger:

http://127.0.0.1:8000/docs

Local health endpoint:

GET http://127.0.0.1:8000/api/v1/health

Representative Routes

Authentication

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/email-otp/verify-login
GET  /api/v1/auth/me
POST /api/v1/auth/password-reset/request
POST /api/v1/auth/password-reset/confirm

AI

POST /api/v1/ai/chat
POST /api/v1/ai/simple-explanation

OCR

POST /api/v1/ocr/extract
POST /api/v1/ocr/explain

Vision

POST /api/v1/vision/assist
POST /api/v1/vision/describe

Hearing Assistant

POST /api/v1/hearing/transcribe-chunk
POST /api/v1/hearing/translate
POST /api/v1/hearing/sound-warmup
POST /api/v1/hearing/classify-sound
POST /api/v1/hearing/sound-alert
POST /api/v1/hearing/sessions
GET  /api/v1/hearing/sessions
POST /api/v1/hearing/sound-events
GET  /api/v1/hearing/sound-events

Caregivers

GET    /api/v1/caregivers
POST   /api/v1/caregivers
PATCH  /api/v1/caregivers/{id}
DELETE /api/v1/caregivers/{id}

POST /api/v1/care-alerts
GET  /api/v1/care-alerts

Database

Local validated development configuration:

Database:  accessmate_ai
Container: accessmate-postgres
Port:      5432
Image:     pgvector/pgvector:pg16

Hearing persistence tables:

hearing_sessions
hearing_captions
hearing_sound_events

Migration:

backend/sql/001_create_hearing_persistence.sql

Local Development

Prerequisites

Python 3.11+

Node.js

npm

Docker

PostgreSQL 16 with pgvector

Clone

git clone https://github.com/yousefosamaahmed/Accessmate-Ai-.git
cd Accessmate-Ai-

Backend

cd backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements-lock.txt

Run:

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Frontend

cd frontend

npm install
npm run dev

Local frontend:

http://localhost:8080

Production Frontend Build

npm run build

Latest validated local build:

Vite:                8.2.1
Modules transformed: 2489
Build status:         PASS
Build time:           ~4.28 s

Environment Variables

Create:

backend/.env

Do not commit secrets.

Example variable names:

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

Testing and Validation

The current local build has been manually validated across the main workflows.

Feature

Status

Authentication + OTP

✅

AI Chat

✅

Contextual follow-up

✅

Direct Voice Chat

✅

Arabic / English voice behavior

✅

Conversation persistence

✅

Archive / Unarchive / Pin / Delete

✅

File upload

✅

OCR

✅

Vision

✅

Library

✅

RAG

✅

Website Safety

✅

Care Center

✅

Hearing Assistant

✅

Live captions

✅

Translation

✅

Type-to-Speech

✅

Sound Awareness V4

✅

Live sound switching

✅

Live confidence

✅

Model Evaluation

✅

Confusion Matrix

✅

Sound-event persistence

✅

Telegram caregiver alerts

✅

Emergency escalation

✅

Alert History

✅

Arabic / English UI

✅

RTL / LTR

✅

Production frontend build

✅

Security

Never commit:

.env

database passwords

JWT secrets

API keys

Telegram bot tokens

SMTP credentials

OTP values

access tokens

The local .env file is ignored by Git.

Before public pushes:

git check-ignore backend/.env
git ls-files backend/.env

Known Limitations

Sound Evaluation Dataset

The current YAMNet evaluation uses 60 labeled clips. It is useful for internal comparison but is not a large-scale real-world benchmark.

Future evaluation should include:

more recordings,

different devices,

different environments,

background noise,

indoor / outdoor conditions,

more samples per class.

Model Cold Start

TensorFlow/YAMNet has a one-time cold-start delay. V4 reduces the user impact through model warm-up.

Automated Tests

Manual end-to-end QA is complete, but a comprehensive automated test suite is still future work.

Browser Speech APIs

Browser Speech Recognition and Speech Synthesis behavior can vary between browsers and operating systems.

Deployment

Production deployment is the next project phase.

Planned production work:

Production database
↓
Backend deployment
↓
Frontend deployment
↓
Environment variables
↓
HTTPS
↓
CORS
↓
Telegram / Email verification
↓
Production smoke test
↓
Live URLs and screenshots

Production URLs

Live Application: TBD
Production API:   TBD
Swagger / OpenAPI:TBD

Roadmap

Potential future improvements:

Larger environmental-sound dataset

Fine-tuned downstream sound classifier

Additional sound categories

Improved Arabic dialect speech recognition

Better live translation

Mobile application

PWA support

Wearable integration

Smart-glasses workflows

More advanced voice navigation

RAG source citations

Full automated test suite

CI/CD

Production observability

Rate limiting

Background task workers

Alembic migrations

Frontend code splitting

Accessibility conformance audits

Safety

AccessMate AI is an assistive decision-support platform.

It should not be represented as:

a medical diagnostic device,

a guaranteed emergency-response service,

a guaranteed malicious-site detector,

a replacement for emergency services,

or a replacement for professional care where professional care is required.

References

Official documentation for major technologies used in the project:

FastAPI

React

TypeScript

Vite

PostgreSQL

pgvector

Sentence Transformers

PaddleOCR

TensorFlow

TensorFlow Hub

YAMNet

ONNX Runtime

Groq API

Gemini API

Telegram Bot API

Web Speech API
