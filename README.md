AccessMate AI

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

Overview

AccessMate AI is an accessibility-first AI platform that brings multiple assistive workflows into one unified product.

Instead of relying on a single AI model, AccessMate AI combines:

Specialized AI models

Retrieval systems

Real-time audio processing

Browser accessibility APIs

Caregiver automation

Arabic and English interaction

The goal is simple: help users understand information, communicate more easily, react to important environmental events, and request assistance when needed.

Current Platform Capabilities

✅ Context-aware AI chat

✅ Direct voice-to-chat transcription

✅ Arabic and English interaction

✅ OCR and image understanding

✅ Document intelligence with RAG

✅ Live speech-to-text captions

✅ Live Arabic ↔ English translation

✅ Type-to-Speech

✅ Environmental sound awareness

✅ Live sound confidence and automatic sound switching

✅ Caregiver management

✅ Telegram caregiver notifications

✅ Website safety assistance

✅ Alert history

✅ Accessibility preferences

✅ RTL / LTR localization

Key Features

🤖 AI Chat Assistant

AccessMate AI provides persistent, context-aware conversations with support for Arabic and English.

Capabilities

Maintains conversation history

Understands follow-up questions

Generates detailed responses

Supports Arabic and English

Follows explicit language instructions

Works with text and direct microphone input

🎙️ Direct Voice Chat

Voice recordings are transcribed and inserted into the conversation as normal user messages.

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

Language behavior

Arabic speech → Arabic transcript → Arabic response

English speech → English transcript → English response

Explicit language requests override the automatic behavior

👂 Hearing Assistant

The Hearing Assistant is one of the core accessibility modules in AccessMate AI.

It contains three main sections:

Conversation

Sound Awareness

Model Evaluation

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

Type-to-Speech

Users can type text and have the browser speak it aloud using the Web Speech / Speech Synthesis API.

🔊 Sound Awareness V4

Sound Awareness uses YAMNet, a pretrained environmental sound classifier, with custom AccessMate post-processing.

Monitored Sounds

Sound

Priority

🚨 Alarm

High

🚓 Siren

High

🔔 Doorbell

Low

👶 Baby Cry

Medium

🚪 Knocking

Low

📢 Alert Beep

Medium

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
Temporal stabilization
   ↓
Current sound + confidence
   ↓
Sound event
   ├── UI update
   ├── Database
   └── Caregiver / Telegram alert

Live Behavior

The current detected sound and its confidence update automatically as the environment changes.

Siren — 96%
   ↓
Doorbell — 91%
   ↓
Knocking — 84%

No manual stop/start cycle is required when the sound changes.

Runtime Optimizations

Transient-aware frame aggregation

Global validated threshold

Alarm-vs-Beep disambiguation

Rolling audio inference

Temporal stabilization

Sound-transition detection

Duplicate suppression

Notification cooldown

YAMNet warm-up before live monitoring

Validated global threshold

0.22

📊 YAMNet Evaluation

The project includes a dedicated evaluation pipeline and a Model Evaluation tab.

Evaluation Dataset

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

Latency

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

The cold-start value represents the one-time TensorFlow/YAMNet model load. Sound Awareness V4 warms the model before live monitoring.

Confusion Matrix

The Model Evaluation view includes:

Actual classes on rows

Predicted classes on columns

Count and percentage modes

Correct classifications on the diagonal

Misclassifications off the diagonal

Class-level performance

Current runtime configuration

The confusion matrix is calculated from labeled evaluation data. Live microphone audio has no known ground truth, so live sound confidence updates independently.

👁️ OCR and Vision

OCR

AccessMate AI uses PaddleOCR PP-OCRv5 for Arabic and English text extraction.

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
Accessibility / AI workflow

Vision Assistance

Vision workflows analyze visual context, not just visible text.

OCR text
+
Visual understanding
=
More useful accessibility description

📚 Document Intelligence and RAG

AccessMate AI supports document question answering through Retrieval-Augmented Generation (RAG).

RAG Pipeline

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

Embedding Configuration

Model: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
Embedding dimension: 384
Normalized embeddings: Yes
Vector storage: PostgreSQL + pgvector

🛡️ Website Safety

Website Safety is a hybrid risk-assessment feature.

It combines:

URL validation

URL / domain heuristics

Threat signals

Risk scoring

User-friendly AI explanation

Available workflows

URL checks

Risk evidence

Recommendations

History

Trusted domains

Website Safety is a decision-support feature and should not be treated as an absolute guarantee that a website is safe or malicious.

🧑‍⚕️ Care Center and Telegram Alerts

AccessMate AI can store caregiver information and create care alerts.

Environmental Sound Alert Flow

Stable sound
   ↓
Sound event stored
   ↓
Care alert created
   ↓
Telegram notification

Spam Protection

Stable-event checks

Confidence rules

Duplicate suppression

Same-class cooldown

New events on meaningful sound transitions

AI Models & Algorithms

Models

Model / Technology

Type

Role

Llama 3.3 70B via Groq

Large Language Model

Conversational AI

Whisper-compatible STT

Automatic Speech Recognition

Speech-to-Text

PaddleOCR PP-OCRv5

OCR Model / Pipeline

Text extraction

Multilingual MiniLM

Embedding Model

Semantic retrieval

YAMNet

Environmental Audio Classifier

Sound Awareness

Configured Vision Models

Multimodal AI

Image understanding

Gemini Flash-Lite

Language / Multimodal Model

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

Live sound monitoring

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

Terminology:
A model is a trained AI system.
An algorithm is computational decision logic.
RAG is an architecture / pipeline.
A Confusion Matrix is an evaluation method.
Telegram is an integration channel.

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

Validated Audio Stack

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
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── evaluation/yamnet/
│   ├── sql/
│   ├── requirements-lock.txt
│   └── requirements-dev.txt
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
│   └── vite.config.ts
│
├── .gitignore
├── .gitattributes
└── README.md

Backend API

Base prefix

/api/v1

Local Swagger

http://127.0.0.1:8000/docs

Health endpoint

GET http://127.0.0.1:8000/api/v1/health

Main API Groups

Authentication

AI Chat

Conversations

Files / Documents

OCR

Vision

Hearing Assistant

Caregivers

Care Alerts

Website Safety

Database

Local development configuration:

Database:  accessmate_ai
Container: accessmate-postgres
Port:      5432
Image:     pgvector/pgvector:pg16

Hearing Persistence Tables

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

PostgreSQL 16 + pgvector

Clone

git clone https://github.com/yousefosamaahmed/Accessmate-Ai-.git
cd Accessmate-Ai-

Backend

cd backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements-lock.txt

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Frontend

cd frontend

npm install
npm run dev

Local frontend:

http://localhost:8080

Production Frontend Build

npm run build

Latest validated build:

Vite:                8.2.1
Modules transformed: 2489
Build status:         PASS
Build time:           ~4.28 s

Environment Variables

Create:

backend/.env

Never commit secrets.

Typical variable names:

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

Testing & Validation

Feature

Status

Authentication + OTP

✅ PASS

AI Chat

✅ PASS

Contextual Follow-up

✅ PASS

Direct Voice Chat

✅ PASS

Arabic / English Voice Behavior

✅ PASS

Conversation Persistence

✅ PASS

Archive / Unarchive / Pin / Delete

✅ PASS

File Upload

✅ PASS

OCR

✅ PASS

Vision

✅ PASS

Library

✅ PASS

RAG

✅ PASS

Website Safety

✅ PASS

Care Center

✅ PASS

Hearing Assistant

✅ PASS

Live Captions

✅ PASS

Translation

✅ PASS

Type-to-Speech

✅ PASS

Sound Awareness V4

✅ PASS

Live Sound Switching

✅ PASS

Live Confidence

✅ PASS

Model Evaluation

✅ PASS

Confusion Matrix

✅ PASS

Sound Event Persistence

✅ PASS

Telegram Caregiver Alerts

✅ PASS

Emergency Escalation

✅ PASS

Alert History

✅ PASS

Arabic / English UI

✅ PASS

RTL / LTR

✅ PASS

Production Frontend Build

✅ PASS

Security

Never commit:

.env

Database passwords

JWT secrets

API keys

Telegram bot tokens

SMTP credentials

OTP values

Access tokens

The local .env file is ignored by Git.

Known Limitations

Sound Evaluation Dataset

The current evaluation uses 60 labeled audio samples. It is useful for internal comparison but is not a large-scale real-world benchmark.

Future evaluation should include:

More recordings

Different devices

Different environments

Background noise

Indoor / outdoor conditions

More samples per class

YAMNet Cold Start

TensorFlow/YAMNet has a one-time model loading cost. V4 mitigates this using model warm-up.

Browser Speech APIs

Browser Speech Recognition and Speech Synthesis behavior can vary by browser and operating system.

Automated Testing

Manual end-to-end QA is complete, but a comprehensive automated test suite is future work.

Deployment

Production deployment is the next project phase.

Production Database
   ↓
Backend Deployment
   ↓
Frontend Deployment
   ↓
Environment Variables
   ↓
HTTPS
   ↓
CORS
   ↓
Telegram / Email Verification
   ↓
Production Smoke Test

Production URLs

Live Application:  TBD
Production API:    TBD
Swagger / OpenAPI: TBD

Roadmap

Larger Sound Awareness evaluation dataset

Fine-tuned downstream audio classifier

Additional environmental sound classes

Improved Arabic dialect STT

Better live translation

Mobile application

PWA support

Wearable integration

Smart-glasses workflows

Advanced voice navigation

RAG source citations

Full automated testing

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

A medical diagnostic device

A guaranteed emergency-response service

A guaranteed malicious-site detector

A replacement for emergency services

A replacement for professional care where professional care is required

References

Official documentation for major technologies used in AccessMate AI:

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
