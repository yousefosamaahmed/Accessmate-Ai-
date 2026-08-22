# AccessMate AI

> **AI-powered accessibility and assistive support platform for more independent digital interaction.**

AccessMate AI is a full-stack accessibility platform that combines conversational AI, document intelligence, computer vision, OCR, hearing assistance, caregiver support, website-safety checks, and adaptive accessibility settings in one unified application.

The project is designed around a simple principle: accessibility tools should do more than expose content — they should help users understand information, communicate, complete tasks, and request support when needed.

> **Current release:** `v1.0.0`  
> **Project status:** Functionally complete and manually tested locally.  
> **GitHub / production deployment:** To be added after final academic review.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem](#problem)
- [Solution](#solution)
- [Current Product Scope](#current-product-scope)
- [Core Features](#core-features)
- [Hearing Assistant](#hearing-assistant)
- [Care Center and Alerts](#care-center-and-alerts)
- [AI Chat and Conversations](#ai-chat-and-conversations)
- [Document Intelligence and Library](#document-intelligence-and-library)
- [Vision and OCR](#vision-and-ocr)
- [Website Safety](#website-safety)
- [Accessibility and Localization](#accessibility-and-localization)
- [Authentication and Account Security](#authentication-and-account-security)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Backend API](#backend-api)
- [Database](#database)
- [Local Development](#local-development)
- [Environment Configuration](#environment-configuration)
- [Testing and Validation](#testing-and-validation)
- [Security Practices](#security-practices)
- [Git Milestones](#git-milestones)
- [Known Non-Blocking Improvements](#known-non-blocking-improvements)
- [Deployment Plan](#deployment-plan)
- [Future Roadmap](#future-roadmap)
- [References](#references)

---

# Project Overview

AccessMate AI is an accessibility-first digital assistant intended to reduce dependence on fragmented assistive tools.

Instead of requiring users to switch between a chatbot, OCR application, document reader, speech recognizer, website checker, and caregiver-alert system, AccessMate AI brings these capabilities together in one platform.

The application currently supports:

- AI-powered text conversations.
- Persistent chat history.
- File and document handling.
- OCR and image understanding.
- Document summarization and question answering.
- Retrieval-augmented generation over indexed document content.
- Hearing assistance through speech-to-text captions.
- Arabic/English translation support.
- Text-to-speech replies.
- Environmental sound awareness.
- Caregiver configuration and care requests.
- Emergency-related alert workflows.
- Telegram caregiver notifications.
- Alert lifecycle history.
- Website-safety analysis.
- Trusted-domain management.
- Arabic and English interface localization.
- RTL/LTR layout handling.
- Accessibility preferences and voice guidance.
- Email OTP-based authentication and protected user data.

---

# Problem

Digital accessibility is often fragmented.

A user may need one tool to read text, another to recognize speech, another to describe images, another to summarize documents, and another to contact a caregiver.

That fragmentation creates additional cognitive and operational overhead, especially for users who already face barriers when interacting with digital systems.

AccessMate AI addresses this by creating a single assistive workspace capable of understanding multiple input types and connecting them to useful actions.

---

# Solution

AccessMate AI combines several assistive workflows behind one authenticated web application.

The platform is built as a React frontend connected to a FastAPI backend and PostgreSQL database.

At a high level:

```text
User
  │
  ▼
React + TypeScript Frontend
  │
  │ REST / JSON / multipart requests
  ▼
FastAPI Backend
  │
  ├── Authentication
  ├── Conversations / AI
  ├── Vision / OCR
  ├── Documents / RAG
  ├── Hearing Assistant
  ├── Website Safety
  ├── Care Center
  ├── Telegram
  └── Alerts / User Preferences
  │
  ▼
PostgreSQL + pgvector
  │
  ├── Users / profiles
  ├── Conversations / messages
  ├── Documents / chunks / embeddings
  ├── Caregivers / care alerts
  ├── Hearing sessions
  ├── Hearing captions
  └── Hearing sound events
```

External AI and communication services are used where appropriate, while user state and application records remain persistent in the backend database.

---

# Current Product Scope

The current product is centered around general digital accessibility and assistive support.

## Active modules

1. Authentication
2. Dashboard
3. AI Chat
4. Chats management
5. Archive
6. Library
7. OCR
8. Vision assistance
9. Website Safety
10. Care Center
11. Hearing Assistant
12. Alert History
13. Settings
14. Account
15. Public landing / About / Features / Solutions / Contact pages

## Important scope change

An earlier experimental **Sign Language Recognition** module was removed from the final runtime product.

It has been replaced by the **Hearing Assistant**, which better matches the current product direction.

Legacy sign-language research datasets, models, MediaPipe-related experiments, and training utilities are not part of the current production runtime.

---

# Core Features

## 1. Accessibility-first Dashboard

The dashboard acts as the central entry point for assistive workflows.

It provides direct access to:

- AI assistance.
- Image understanding.
- Text extraction.
- Document workflows.
- Care tools.
- Website-safety functions.
- Recent conversations.
- Accessibility controls.

---

## 2. Persistent AI Conversations

Users can create conversations, send messages, receive AI responses, and return to previous chats.

Supported chat operations include:

- Create conversation.
- Send message.
- Retrieve conversation messages.
- Rename/update a conversation.
- Pin/unpin.
- Archive/unarchive.
- Delete.
- Reload after refresh.
- Continue an existing conversation.

Conversation state is persisted through backend APIs rather than relying only on temporary browser state.

---

# Hearing Assistant

The Hearing Assistant replaced the former Sign Language module and is one of the main accessibility features of AccessMate AI.

## Live Speech-to-Text

The application can display live spoken content as captions.

Supported workflows include:

- English speech recognition.
- Arabic speech recognition.
- Live captions.
- Fullscreen caption mode.
- Transcript capture.
- Copy transcript.
- Save transcript.

The frontend can use browser speech recognition when available.

A backend speech-to-text fallback is also available using **faster-whisper**.

---

## Live Translation

Captured speech can be translated between supported languages.

The current interface supports Arabic and English workflows.

Translation is integrated with the Hearing Assistant rather than requiring a separate translation application.

---

## Type-to-Speech

Users can type a response and have the browser speak it aloud using the Web Speech API.

This allows text-based replies during face-to-face communication.

---

## Environmental Sound Awareness

AccessMate AI can analyze environmental audio and classify relevant sounds.

The sound-awareness implementation uses **YAMNet** through TensorFlow / TensorFlow Hub.

Potential detected sound categories can be used to surface meaningful environmental events to the user.

Sound events can also be persisted for later review.

---

## Emergency Flow

The Hearing Assistant can connect emergency-related user actions to the broader Care Center workflow.

This includes:

- Confirmation before sending an action where required.
- Care alert creation.
- Persistence in alert history.
- Caregiver notification flow.
- Telegram integration when configured.

---

# Care Center and Alerts

The Care Center provides a structured way to configure trusted caregivers and create assistive requests.

## Caregiver records

A caregiver can contain information such as:

- Full name.
- Relationship.
- Phone number.
- Telegram chat ID.
- WhatsApp number.
- Primary-caregiver status.
- Preferred communication channel.
- Active/inactive status.

---

## Quick Care Actions

The Care Center supports quick needs and assistive actions.

These actions can create care alerts and connect the request to an active caregiver.

---

## Telegram Integration

Telegram is integrated as a caregiver-notification channel.

The application supports a flow for connecting Telegram and delivering care alerts when the required bot/chat configuration is available.

---

## Alert Lifecycle

Care alerts can be tracked through multiple states.

Backend operations include support for actions such as:

- Create.
- Retrieve.
- Mark sent.
- Mark failed.
- Acknowledge.
- Resolve.
- Delete.

Alert History provides a consolidated UI for reviewing care events.

Hearing Assistant-generated alerts can also appear in the same history.

---

# AI Chat and Conversations

The application exposes a dedicated AI chat backend.

Example route:

```text
POST /api/v1/ai/chat
```

A successful frontend flow includes:

```text
User message
    │
    ▼
AI request
    │
    ▼
AI response
    │
    ▼
Conversation message persistence
    │
    ▼
Conversation reload / history
```

The AI layer is designed to support configurable language-model providers.

During development, the project has used a Groq-hosted Llama model configuration for general conversational assistance.

---

# Document Intelligence and Library

The Library stores and manages user documents.

## File operations

The application supports:

- Upload.
- List user files.
- Retrieve file information.
- Delete.
- Search from the interface.

---

## Document Processing

The backend document pipeline supports multiple stages:

```text
Upload
  ↓
Text Extraction
  ↓
Chunking
  ↓
Embedding
  ↓
Vector Search
  ↓
RAG Answer / Document Assistant
```

---

## Retrieval-Augmented Generation

Document chunks can be stored with embedding vectors and searched by similarity.

The RAG layer retrieves relevant chunks before constructing an AI response.

This allows the assistant to answer questions using uploaded document content instead of responding only from general model knowledge.

---

# Vision and OCR

AccessMate AI contains separate but connected OCR and vision workflows.

## OCR

OCR endpoints support extracting readable text from images or document content.

The extracted text can then be:

- Displayed.
- Explained.
- Simplified.
- Used in accessibility-friendly responses.
- Read aloud when combined with voice guidance.

---

## Vision Assistance

The vision workflow accepts image input and produces assistive descriptions or contextual guidance.

Example backend routes include:

```text
POST /api/v1/vision/assist
POST /api/v1/vision/describe
```

Image uploads can also become part of a persistent chat conversation.

---

# Website Safety

Website Safety is designed as a decision-support feature for evaluating suspicious links and domains.

The module includes:

- URL checking.
- Risk result display.
- Analysis history.
- Trusted domains.
- Add trusted domain.
- Edit trusted domain.
- Delete trusted domain.
- Previously checked sites.

The interface presents safety evidence and recommendations rather than silently navigating to an unknown site.

> Website Safety should be treated as decision support, not as an absolute guarantee that a site is safe or malicious.

---

# Accessibility and Localization

Accessibility is part of the application architecture rather than a single isolated feature.

## Bilingual UI

The current interface supports:

- English.
- Arabic.
- LTR layout.
- RTL layout.

Localization has been applied across the primary application pages and sidebar.

The current language system keeps major workspace components synchronized when the language changes.

---

## Voice Guidance

The frontend includes an accessibility voice-guidance component that can provide voice-oriented labels and navigation context.

---

## User Preferences

Accessibility-related profile/settings flows include support for preferences such as:

- Assistant language.
- Voice guidance.
- Safe browsing.
- Accessibility mode/preferences.
- Theme/interface settings.

Where persisted through the backend, these settings survive normal navigation and reload flows.

---

# Authentication and Account Security

AccessMate AI uses protected authenticated routes.

## Login flow

The tested login flow is:

```text
Email + Password
      │
      ▼
Email OTP Verification
      │
      ▼
Access Token
      │
      ▼
Protected Application
```

The backend also contains support for additional account-security workflows such as:

- Registration.
- Current-user lookup.
- Email OTP login verification.
- Password reset.
- Optional two-factor authentication flows.

Authenticated API routes validate the current user before returning protected data.

---

# System Architecture

## Frontend

The frontend is a single-page React application built with Vite and TypeScript.

Main responsibilities:

- User interface.
- Routing.
- Authentication state.
- Accessibility state.
- Localization.
- API integration.
- Live browser speech features.
- Client-side interaction and feedback.

---

## Backend

The backend is a FastAPI REST API.

Main responsibilities:

- Authentication and authorization.
- User/account/profile management.
- Conversation persistence.
- AI orchestration.
- File handling.
- OCR.
- Vision analysis.
- Document processing.
- RAG.
- Website safety.
- Caregiver management.
- Care alerts.
- Telegram integration.
- Hearing Assistant persistence and inference helpers.
- Database access.

---

## Database

PostgreSQL is used as the primary relational database.

The project also uses pgvector-compatible vector storage for document embedding search.

---

# Technology Stack

## Frontend

| Technology | Role |
|---|---|
| React 19 | UI |
| TypeScript 6 | Type-safe frontend development |
| Vite 8 | Development server and production bundler |
| React Router | Client-side routing |
| Axios | HTTP API requests |
| Tailwind CSS 4 | Utility styling |
| Framer Motion | UI animation |
| Lucide React | Icons |
| React Markdown | Markdown rendering |
| remark-gfm | GitHub-Flavored Markdown support |
| Web Speech API | Browser speech recognition / speech synthesis where supported |

### Development versions validated during the final build

```text
React                 19.2.8
React DOM             19.2.8
TypeScript            6.0.3
Vite                  8.2.1
React Router DOM      7.18.2
Axios                 1.19.0
Framer Motion         13.0.0
Lucide React          1.30.0
Tailwind CSS          4.3.3
React Markdown        10.1.0
remark-gfm            4.0.1
Node.js tested        24.19.0
npm tested            11.17.0
```

---

## Backend

| Technology | Role |
|---|---|
| Python | Backend runtime |
| FastAPI | REST API |
| Uvicorn | ASGI development/runtime server |
| SQLAlchemy | ORM |
| PostgreSQL | Main database |
| pgvector | Vector similarity search |
| Pydantic / pydantic-settings | Validation and configuration |
| JWT-based auth | Protected API sessions |
| TensorFlow 2.21 | Audio ML runtime |
| TensorFlow Hub 0.16.1 | YAMNet model loading |
| YAMNet | Environmental sound classification |
| faster-whisper 1.2.1 | Speech-to-text fallback |
| ONNX Runtime 1.28.0 | Runtime dependency used by faster-whisper |
| SciPy 1.17.1 | Audio/scientific processing support |
| tf_keras 2.21.0 | TensorFlow/Keras compatibility |
| setuptools 81.0.0 | Required compatibility for the validated TensorFlow Hub environment |

> `setuptools==81.0.0` is intentionally pinned in the validated environment because newer releases removed `pkg_resources`, which affected the tested TensorFlow Hub setup.

---

## AI / External Services

The application architecture supports external AI and communication services.

Current development integrations include:

- Groq / Llama for conversational AI configuration.
- Gemini-based AI services in selected assistive workflows.
- Telegram Bot integration for caregiver alerts.
- Email delivery for authentication/OTP workflows.

Provider credentials must be stored in environment variables and must never be committed to Git.

---

# Project Structure

A simplified repository layout:

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
│   ├── sql/
│   │   ├── 001_create_hearing_persistence.sql
│   │   └── ROLLBACK_hearing_persistence.sql
│   │
│   ├── requirements-lock.txt
│   ├── requirements-dev.txt
│   └── .env                  # local only / ignored
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
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

# Main Frontend Pages

The current application contains the following major pages:

```text
Landing
Auth
Dashboard
Chats
ChatPage
Archive
HearingAssistant
Caregiver
AlertHistory
WebsiteSafety
Library
Settings
Account
About
Features
Solutions
Contact
```

Protected application pages are rendered through the authenticated application layout.

---

# Backend API

All core API routes are versioned under:

```text
/api/v1
```

Swagger / OpenAPI documentation is available locally at:

```text
http://127.0.0.1:8000/docs
```

---

## Health

```text
GET /api/v1/health
```

Used to confirm backend/database availability.

---

## Authentication

Representative routes include:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/email-otp/verify-login
GET  /api/v1/auth/me
POST /api/v1/auth/password-reset/request
POST /api/v1/auth/password-reset/confirm
```

Additional 2FA setup, confirmation, verification, and disable flows are implemented in the authentication API.

---

## Account / Profile

```text
GET   /api/v1/account/me
PATCH /api/v1/account/me

GET   /api/v1/profile/me
PATCH /api/v1/profile/me
```

Profile APIs also expose accessibility-related preference operations.

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

## Files / Documents

Representative routes include:

```text
POST /api/v1/files/upload

GET  /api/v1/documents/me
POST /api/v1/documents/me
POST /api/v1/documents/me/upload
```

Document-specific APIs support:

- Text extraction.
- Chunking.
- Embedding.
- Search.
- Document preparation.
- Question answering.

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
POST /api/v1/hearing/classify-sound

POST /api/v1/hearing/sessions
GET  /api/v1/hearing/sessions
GET  /api/v1/hearing/sessions/{session_id}
DELETE /api/v1/hearing/sessions/{session_id}

POST /api/v1/hearing/sound-events
GET  /api/v1/hearing/sound-events
```

A sound event can also be linked to a care alert.

---

## Caregivers / Care Alerts

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

Care-alert lifecycle routes support acknowledge, resolve, sent, and failed states.

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

The project uses PostgreSQL.

The locally validated database environment used:

```text
Database: accessmate_ai
Container: accessmate-postgres
Port: 5432
PostgreSQL image: pgvector/pgvector:pg16
```

---

## Hearing Assistant persistence

The hearing persistence migration creates:

```text
hearing_sessions
hearing_captions
hearing_sound_events
```

SQL file:

```text
backend/sql/001_create_hearing_persistence.sql
```

Current database management is based on SQLAlchemy plus explicit SQL migration scripts for the hearing tables.

Alembic is not currently used for this project.

---

# Local Development

## Prerequisites

Recommended local environment:

```text
Python 3.11
Node.js
npm
PostgreSQL 16 + pgvector
Docker (recommended for local PostgreSQL)
```

The final frontend build was validated using:

```text
Node.js v24.19.0
npm 11.17.0
```

---

# 1. Clone / Open the Repository

After GitHub publication:

```bash
git clone <GITHUB_REPOSITORY_URL>
cd <REPOSITORY_DIRECTORY>
```

For the current local project:

```powershell
cd "D:\AccessMate Ai Project"
```

---

# 2. Start PostgreSQL

The local development environment currently uses a Docker container named:

```text
accessmate-postgres
```

Check it with:

```powershell
docker ps
```

If the container already exists but is stopped:

```powershell
docker start accessmate-postgres
```

The exact production database configuration will be documented after deployment.

---

# 3. Backend Setup

```powershell
cd "D:\AccessMate Ai Project\backend"

python -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
pip install -r requirements-lock.txt
```

For development/testing dependencies:

```powershell
pip install -r requirements-dev.txt
```

---

# 4. Backend Environment

Create:

```text
backend/.env
```

Never commit this file.

Known core configuration includes:

```env
DATABASE_URL=postgresql://...
SECRET_KEY=...
FRONTEND_ORIGIN=http://localhost:8080
```

The project also requires provider-specific credentials for the integrations enabled in the selected environment, such as:

```text
AI provider credentials
Gemini credentials
Groq credentials
Email / SMTP credentials
Telegram bot credentials
```

Before the public GitHub release, a sanitized `.env.example` should be maintained with every required key but no secrets.

---

# 5. Hearing Persistence Tables

If setting up a clean development database, apply:

```text
backend/sql/001_create_hearing_persistence.sql
```

For the current Docker-based PostgreSQL setup, the migration can be executed through `psql`.

The exact production migration command will be documented once the deployment target is selected.

---

# 6. Run the Backend

From:

```text
D:\AccessMate Ai Project\backend
```

with the virtual environment activated:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Expected development URLs:

```text
API:     http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs
Health:  http://127.0.0.1:8000/api/v1/health
```

---

# 7. Frontend Setup

Open another terminal:

```powershell
cd "D:\AccessMate Ai Project\frontend"

npm install
npm run dev
```

The development frontend currently runs at:

```text
http://localhost:8080
```

---

# Frontend API Configuration

The frontend reads:

```text
VITE_API_BASE_URL
```

The current development fallback targets the local backend at:

```text
http://127.0.0.1:8000
```

Production deployment must replace local API origins with the deployed backend URL.

---

# Production Frontend Build

Run:

```powershell
cd "D:\AccessMate Ai Project\frontend"
npm run build
```

Final validated build:

```text
Vite: 8.2.1
Modules transformed: 2489
Build result: PASS
Build time: 4.28s
```

The output is created in:

```text
frontend/dist/
```

---

# Testing and Validation

## Manual End-to-End QA

The current `v1.0.0` local build was manually tested across the full application flow.

Validated areas include:

```text
Authentication + OTP          PASS
Dashboard                     PASS
AI Chat                       PASS
Conversation persistence      PASS
Pin / Archive / Unarchive     PASS
Delete conversation           PASS
File upload                   PASS
Vision                        PASS
OCR                           PASS
Library                       PASS
Website Safety                PASS
Care Center                   PASS
Hearing Assistant             PASS
Speech-to-Text                PASS
Translation                   PASS
Type-to-Speech                PASS
Sound Awareness               PASS
Emergency flow                PASS
Telegram integration          PASS
Alert History                 PASS
Settings                      PASS
Account                       PASS
Arabic / English UI           PASS
RTL / LTR                     PASS
Frontend production build     PASS
```

---

## Backend Health Validation

The health route was validated against the PostgreSQL database.

Development health endpoint:

```text
GET /api/v1/health
```

The database connection was successfully reported during the final local test phase.

---

## Python Dependency Validation

The Python environment was checked with:

```powershell
pip check
```

Result:

```text
No broken requirements found.
```

Validated hearing-related runtime:

```text
TensorFlow       2.21.0
TensorFlow Hub   0.16.1
faster-whisper   1.2.1
ONNX Runtime     1.28.0
SciPy            1.17.1
tf_keras         2.21.0
setuptools       81.0.0
```

---

## Automated Tests

`pytest` is included as a development dependency.

Current status:

```text
pytest runtime: available
automated backend test suite: not yet implemented
manual end-to-end QA: completed
```

This should be improved in a future engineering iteration with unit, integration, and API regression tests.

---

## Frontend Linting

The latest lint review produced no blocking lint errors.

Some React hook / fast-refresh warnings were previously identified as non-blocking technical debt.

---

# Security Practices

## Secrets

The project uses environment variables for sensitive values.

The following must never be committed:

- Database credentials.
- JWT signing secrets.
- AI API keys.
- SMTP passwords.
- Telegram bot tokens.
- Access tokens.
- OTP verification data.

The repository `.gitignore` excludes `.env` files.

---

## Authentication

Protected frontend routes depend on authenticated backend sessions/tokens.

Backend authorization checks are applied before returning user-specific conversations, documents, profile data, and other protected resources.

---

## CORS

During development, the backend explicitly allows the frontend development origin:

```text
http://localhost:8080
```

Production CORS must be restricted to the final deployed frontend origin.

---

## Uploads

User-generated uploads are treated as runtime data and are excluded from version control.

```text
backend/uploads/
```

---

# Git Milestones

The project has a clean Git baseline and version tags.

## Stable Hearing Assistant baseline

```text
Tag: v0.1-hearing-baseline
Commit: b0a2219
```

This marks the stable state after replacing the old Sign Language runtime with the Hearing Assistant architecture.

---

## Final locally tested build

```text
Tag: v1.0.0
Commit: 27ff4fa
```

Associated milestones:

```text
878fa2b  fix sidebar language sync
6c97a42  fix complete frontend localization and encoding
ec8e92e  add backend development test requirements
27ff4fa  merge final frontend localization and QA fixes
```

At `v1.0.0` the working tree was clean and the production frontend build passed.

---

# Known Non-Blocking Improvements

The current version is functionally complete for the reviewed local scope, but several engineering improvements remain valuable.

## 1. Frontend bundle splitting

The current production build reports a JavaScript chunk larger than Vite's default 500 kB warning threshold.

This does not fail the build, but future versions should introduce lazy loading / dynamic imports for large pages or ML-heavy UI areas.

---

## 2. Automated test coverage

The project currently relies heavily on manual end-to-end validation.

Recommended future coverage:

- Authentication API tests.
- Conversation CRUD tests.
- Document pipeline tests.
- Website Safety tests.
- Hearing persistence tests.
- Care alert lifecycle tests.
- Frontend component/integration tests.
- Full browser E2E tests.

---

## 3. API base URL centralization

Some frontend areas currently contain separate API-base construction logic.

A future refactor should centralize every request through one API client/configuration module.

---

## 4. Database migrations

The project currently uses SQLAlchemy plus explicit SQL scripts for certain schema changes.

A mature production version should consider Alembic for systematic database migration management.

---

# Deployment Plan

Deployment is intentionally postponed until after the final academic/project review.

The planned release process is:

```text
1. Final academic review
2. Apply any final requested changes
3. Run production build
4. Run final end-to-end QA
5. Create / verify release commit
6. Create GitHub repository
7. Push main branch
8. Push version tags
9. Prepare production environment variables
10. Provision PostgreSQL / pgvector
11. Deploy backend
12. Deploy frontend
13. Configure domain
14. Configure HTTPS
15. Configure production CORS
16. Run production smoke tests
17. Update README with live URLs
18. Publish final GitHub release
```

---

# GitHub Release Information

To be completed after repository publication:

```text
Repository:
TBD

Main branch:
main

Current version:
v1.0.0

Live Demo:
TBD

API:
TBD

API Documentation:
TBD
```

---

# Future Roadmap

Potential future improvements include:

- More automated accessibility testing.
- Mobile/PWA optimization.
- Additional environmental sound categories.
- Better Arabic dialect handling.
- More robust live translation.
- Native mobile integration.
- Wearable assistive-device integration.
- Smart-glasses workflows.
- More advanced voice navigation.
- Expanded multimodal AI reasoning.
- Improved RAG evaluation and source citation.
- Automated regression testing.
- CI/CD.
- Observability and structured production logging.
- Rate limiting and abuse protection.
- Cloud object storage for uploaded files.
- Background job queues for long-running AI/document tasks.

The former Sign Language Recognition experiment is not part of the current product scope and should only be reconsidered if a future product requirement specifically justifies it.

---

# Version Status

```text
AccessMate AI
Version: v1.0.0

Development:
Complete for current scope

Local manual QA:
Passed

Frontend production build:
Passed

Git state:
Clean

GitHub:
Pending final review

Production deployment:
Pending final review
```

---

# Final Release Checklist

Before the public GitHub release:

- [ ] Complete academic review.
- [ ] Apply final requested changes, if any.
- [ ] Re-run manual QA.
- [ ] Run `npm run build`.
- [ ] Run `pip check`.
- [ ] Verify `.env` is ignored.
- [ ] Verify no credentials are in Git history.
- [ ] Finalize `.env.example`.
- [ ] Confirm production database migration procedure.
- [ ] Create GitHub repository.
- [ ] Add remote.
- [ ] Push `main`.
- [ ] Push tags.
- [ ] Deploy backend.
- [ ] Deploy frontend.
- [ ] Configure production domain.
- [ ] Enable HTTPS.
- [ ] Configure production CORS.
- [ ] Test Telegram from production.
- [ ] Test email OTP from production.
- [ ] Test file uploads from production.
- [ ] Test Hearing Assistant from HTTPS origin.
- [ ] Add screenshots to README.
- [ ] Add live demo link.
- [ ] Add deployed API/docs links.
- [ ] Create final GitHub release.

---

# References

Official documentation for the primary technologies used by the project:

- FastAPI: https://fastapi.tiangolo.com/
- FastAPI CORS: https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- React: https://react.dev/
- Vite: https://vite.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- React Router: https://reactrouter.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- PostgreSQL: https://www.postgresql.org/docs/
- pgvector: https://github.com/pgvector/pgvector
- TensorFlow: https://www.tensorflow.org/
- YAMNet: https://www.tensorflow.org/hub/tutorials/yamnet
- TensorFlow Hub: https://www.tensorflow.org/hub
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- ONNX Runtime: https://onnxruntime.ai/docs/
- Tailwind CSS: https://tailwindcss.com/docs
- Git: https://git-scm.com/docs

---

## Final Note

AccessMate AI is built as an accessibility-first assistance platform.

The current `v1.0.0` milestone represents the locally tested application before public repository publication and production deployment.

The final README will be updated after deployment with:

- GitHub repository URL.
- Live application URL.
- Production API URL.
- Swagger/OpenAPI URL.
- Architecture/deployment details.
- Screenshots.
- Final setup instructions.
- Production environment notes.
- Release information.

