# AccessMate AI

## AI-Powered Accessibility Platform

![AccessMate AI](https://img.shields.io/badge/AI-Accessibility-blue)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-green)
![React](https://img.shields.io/badge/Frontend-React-blue)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Docker](https://img.shields.io/badge/Deployment-Docker-blue)

🌐 **Production URL**

https://accessmate-ai.duckdns.org


---

# 1. Project Overview

AccessMate AI is an intelligent accessibility platform that uses Artificial Intelligence to improve communication, information access, and digital interaction for people with accessibility needs.

The platform combines multiple AI-powered services into one integrated ecosystem, including:

- AI conversational assistance
- Voice interaction
- Vision assistance
- Hearing assistance
- Document intelligence
- Website safety analysis
- Caregiver support and alert management


The main objective of AccessMate AI is to provide practical, accessible, and secure AI-based assistance through a unified platform instead of isolated accessibility solutions.


---

# 2. Project Background and Ownership

AccessMate AI was initially started as a group project.

During development, the other team members withdrew from the project. The current final version was independently continued, developed, integrated, tested, and deployed by the project owner.

The final production version includes:

- System architecture design
- Frontend development
- Backend development
- Database architecture
- AI service integration
- Authentication system
- Accessibility workflows
- Cloud deployment
- Security configuration


---

# 3. Problem Statement

People with different accessibility requirements often face difficulties when interacting with digital systems.

Existing solutions usually provide separate tools for:

- Communication assistance
- Information understanding
- Visual support
- Hearing support
- Emergency communication


This creates fragmented user experiences.

AccessMate AI addresses this challenge by providing a unified AI-powered accessibility ecosystem where different assistive technologies work together.


---

# 4. Project Objectives

The main objectives of AccessMate AI are:

- Build an accessible AI assistant capable of natural interaction.
- Support multiple communication methods.
- Improve access to digital information.
- Provide AI-based visual and hearing assistance.
- Enable caregiver communication workflows.
- Maintain secure handling of user data.
- Provide a scalable architecture for future accessibility technologies.


---

# 5. Innovation

The innovation of AccessMate AI is based on combining multiple AI accessibility workflows into one platform.

## Main Innovation Points

### 1. Multimodal Interaction

Users can interact with the system using:

- Text
- Voice
- Images


### 2. Accessibility-Centered AI

The system is designed around accessibility needs instead of adding accessibility as an additional feature.


### 3. Integrated Assistance Ecosystem

The platform combines:

- AI assistant
- Vision support
- Hearing support
- Document intelligence
- Caregiver workflows


### 4. Privacy-Aware Architecture

The system follows secure design principles:

- Protected authentication
- Environment-based secrets
- HTTPS deployment
- Internal service communication


---

# 6. Final Product Scope

The current production version includes:


## Implemented Features

✅ AI Assistant

✅ Authentication System

✅ OTP Verification

✅ Voice Interaction

✅ Vision Assistance

✅ OCR Processing

✅ Document Management

✅ Document Intelligence

✅ Hearing Assistant

✅ Environmental Sound Awareness

✅ Website Safety

✅ Caregiver Management

✅ Care Alerts

✅ Telegram Integration

✅ Conversation History

✅ Archive Management

✅ User Preferences


---

# 7. AI Assistant

The AI Assistant is the core interaction layer of AccessMate AI.

It provides:

- Natural language understanding
- Arabic language support
- English language support
- Context-aware conversations
- Text simplification
- Information explanation
- Persistent conversation history


## Conversation Flow

```
User Input

      |

Authentication Layer

      |

Conversation Service

      |

AI Processing Layer

      |

Response Generation

      |

Database Storage
```


---

# 8. Voice Interaction

The Voice module allows users to communicate naturally using speech.

## Workflow

```
Voice Input

      |

Audio Processing

      |

Speech Recognition

      |

Text Processing

      |

AI Response Generation

      |

User Output
```


Supported workflow:

- User records voice
- Speech is converted into text
- Text is processed by AI
- Response is generated in the same conversation flow


The system supports Arabic and English voice interaction.


---

# 9. Vision Assistance

AccessMate AI provides AI-powered image understanding capabilities.

## Vision Pipeline

```
Image Upload

      |

Input Validation

      |

Vision Processing

      |

Description Generation

      |

User Response
```


Applications:

- Image description
- Visual information extraction
- Accessibility support for visual content


---

# 10. Hearing Assistant

The Hearing Assistant is designed to support users who are deaf or hard of hearing.

Capabilities:

- Speech caption workflows
- Hearing-related assistance
- Sound awareness workflows
- Accessible visual feedback


The objective is to transform important audio information into accessible digital feedback.


---

# 11. Document Intelligence

The document system enables users to upload and interact with documents.


## Processing Pipeline

```
Document Upload

      |

Text Extraction

      |

Document Processing

      |

Chunk Generation

      |

Vector Representation

      |

Similarity Search

      |

AI Response
```


Technology:

- PostgreSQL
- pgvector
- Vector-based retrieval


---
# 12. Website Safety Module

The Website Safety module helps users evaluate websites and identify potentially unsafe domains.

The module provides:

- URL analysis workflow
- Trusted domain management
- Website checking history
- Safety-related feedback


The goal is to help users make safer decisions while browsing digital content.

---

# 13. Caregiver Management System

AccessMate AI includes a caregiver support system designed to connect users with trusted people.

## Caregiver Features

Users can manage:

- Caregiver name
- Relationship
- Phone number
- Telegram Chat ID
- WhatsApp number
- Preferred communication channel
- Primary caregiver status


## Primary Caregiver Logic

The system maintains one primary caregiver.

When a new caregiver is selected as primary:

```
New Primary Caregiver

        |

System Validation

        |

Previous Primary Caregiver

        |

Automatically Updated

        |

New Primary Caregiver Activated
```


---

# 14. Care Alerts

The Care Alert system enables users to create and manage assistance alerts.

Features:

- Alert creation
- Alert history
- Caregiver notification workflow
- Telegram integration support


Alert workflow:

```
User Need Detected

        |

Care Alert Created

        |

Database Storage

        |

Caregiver Notification

        |

Alert History
```

---

# 15. Authentication System

AccessMate AI implements a secure authentication architecture.

Implemented:

- Email/password authentication
- OTP verification workflow
- JWT authentication
- Protected API endpoints
- User session management


Authentication flow:

```
User Login

      |

Credential Validation

      |

OTP Verification

      |

JWT Token Generation

      |

Authenticated Session
```

---

# 16. Conversation Management

The platform supports persistent conversation management.

Features:

- Create conversations
- Store messages
- View recent conversations
- Archive conversations
- Restore archived conversations


Database relationship:

```
User

 |

Conversations

 |

Messages
```

---

# 17. Backend Architecture

The backend is built using FastAPI following a modular architecture.

## Backend Stack

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT Authentication


## Backend Structure

```
backend/

│

├── app/

│   ├── api/

│   │   └── v1/

│   │

│   ├── core/

│   │

│   ├── models/

│   │

│   ├── schemas/

│   │

│   ├── services/

│   │

│   └── main.py

│

└── Dockerfile
```

---

# 18. API Architecture

The backend exposes versioned REST APIs.

Base path:

```
/api/v1
```


Main API groups include:

```
Authentication

/api/v1/auth


Users

/api/v1/users


Profile

/api/v1/profile


Conversations

/api/v1/conversations


AI Services

/api/v1/ai


Voice

/api/v1/voice


Vision

/api/v1/vision


OCR

/api/v1/ocr


Documents

/api/v1/documents


Caregivers

/api/v1/caregivers


Care Alerts

/api/v1/care-alerts


Website Safety

/api/v1/website-safety
```

---

# 19. Frontend Architecture

The frontend is developed using:

- React
- TypeScript
- Vite
- Tailwind CSS


## Frontend Structure

```
frontend/

│

├── src/

│   ├── components/

│   ├── contexts/

│   ├── pages/

│   ├── services/

│   ├── lib/

│   └── main.tsx

│

├── Dockerfile

└── nginx.conf
```


---

# 20. Database Architecture

AccessMate AI uses PostgreSQL with pgvector support.


## Main Database Tables


### Users

Stores user account information.


### Conversations

Stores user conversation sessions.


### Messages

Stores AI assistant messages.


### Documents

Stores uploaded documents.


### Document Chunks

Stores processed document sections for retrieval.


### Caregivers

Stores trusted caregiver information.


### Care Alerts

Stores assistance alerts.


### Hearing Sessions

Stores hearing assistance sessions.


### Hearing Sound Events

Stores detected sound events.


### Website Checks

Stores website safety analysis history.


---

# 21. Database Relationship Overview

```
Users

 |

 +---- Conversations

 |          |

 |          +---- Messages

 |

 +---- Documents

 |          |

 |          +---- Document Chunks

 |

 +---- Caregivers

            |

            +---- Care Alerts
```

---

# 22. AI Processing Architecture

AccessMate AI follows a modular AI service architecture.

General AI pipeline:

```
Input

 |

Validation

 |

Preprocessing

 |

AI Processing

 |

Post Processing

 |

Response Generation

 |

User Output
```

---

# 23. AI Model Evaluation

For AI components that perform classification tasks, evaluation can be performed using a confusion matrix.


## Confusion Matrix


```
                         Predicted

                    Positive     Negative


Actual Positive        TP           FN


Actual Negative        FP           TN

```


Where:

### True Positive (TP)

Samples correctly classified as positive.


### True Negative (TN)

Samples correctly classified as negative.


### False Positive (FP)

Negative samples incorrectly classified as positive.


### False Negative (FN)

Positive samples incorrectly classified as negative.


---

# 24. Evaluation Metrics


## Accuracy

Accuracy measures the overall percentage of correct predictions.


Formula:

\[
Accuracy =
\frac{TP + TN}
{TP + TN + FP + FN}
\]


---

## Precision

Precision measures how many predicted positive samples are actually positive.


Formula:

\[
Precision =
\frac{TP}
{TP + FP}
\]


---

## Recall

Recall measures the ability of the model to detect actual positive samples.


Formula:

\[
Recall =
\frac{TP}
{TP + FN}
\]


---

## F1 Score

F1 score provides a balance between Precision and Recall.


Formula:

\[
F1 =
2 \times
\frac{Precision \times Recall}
{Precision + Recall}
\]


---

# 25. Evaluation Matrix Format

The evaluation results should be represented as:

```
                 Predicted Class

              C1     C2     C3


Actual C1    [ ]    [ ]    [ ]


Actual C2    [ ]    [ ]    [ ]


Actual C3    [ ]    [ ]    [ ]

```

For multi-class classification:

\[
CM =
\begin{bmatrix}
C_{11} & C_{12} & ... & C_{1n}\\
C_{21} & C_{22} & ... & C_{2n}\\
... & ... & ... & ...\\
C_{n1} & C_{n2} & ... & C_{nn}
\end{bmatrix}
\]


---

# 26. Testing & Validation

The system was tested across multiple layers.


## Backend Testing

Validated:

- API availability
- Authentication flow
- Database connectivity
- Endpoint responses


## Database Testing

Validated:

- Database migration
- Table creation
- Data restoration
- UTF-8 Arabic data storage


## Deployment Testing

Validated:

- Docker image building
- Container startup
- HTTPS accessibility
- Production connectivity


---

# 27. Production Deployment Architecture

The production deployment runs on AWS EC2.


Architecture:

```
                    Internet

                       |

              DuckDNS Domain

                       |

                 Caddy Server

              HTTPS / TLS Layer

                       |

              Frontend Container

               React + Nginx

                       |

              Backend Container

                  FastAPI

                       |

          PostgreSQL + pgvector

```

---

# 28. Docker Deployment

Production services:

```
accessmate-caddy

accessmate-frontend

accessmate-backend

accessmate-postgres
```


Start production:

```bash
docker compose --env-file .env.production up -d
```


Build:

```bash
docker compose --env-file .env.production up -d --build
```

---

# 29. HTTPS Configuration

HTTPS is provided using:

- Caddy
- Let's Encrypt
- Automatic certificate renewal


Production domain:

```
https://accessmate-ai.duckdns.org
```

---

# 30. Security Architecture

Security measures:

## Authentication

- JWT tokens
- Protected endpoints


## Secrets Management

Sensitive data is stored outside GitHub:

- Database passwords
- API keys
- Tokens


## Network Isolation

Production architecture keeps:

- Backend internal
- Database internal


Only HTTPS traffic is exposed publicly.

---

# 31. Ethical AI Considerations

AccessMate AI follows responsible AI principles.


## Privacy

User data and credentials are protected.


## Transparency

The system documents implemented capabilities clearly.


## Human Control

AI provides assistance but does not replace human decisions.


## Accessibility

Accessibility is treated as a primary design requirement.


## Responsible Usage

AI-generated outputs should be considered supportive assistance and not absolute decisions.

---

# 32. Future Development

Possible improvements:

- More advanced accessibility models
- Additional assistive workflows
- Improved personalization
- Expanded AI capabilities

---
# 33. Environment Configuration

AccessMate AI uses environment-based configuration to separate application settings from source code.

Sensitive information is never stored directly inside the repository.

---

## Backend Environment

Create:

```
backend/.env
```

Example structure:

```env
SECRET_KEY=your-secret-key

FRONTEND_ORIGIN=https://accessmate-ai.duckdns.org


# AI Provider Configuration

# External API credentials


# Communication Services

# Telegram configuration


# Email configuration
```

Actual production credentials must remain private.

---

## Frontend Environment

Create:

```
frontend/.env
```

Production configuration:

```env
VITE_API_BASE_URL=
```

The frontend communicates with the backend through the same domain using:

```
/api/v1
```

---

# 34. Production Database Configuration

The production database password is stored separately.

Production environment file:

```
.env.production
```

Example:

```env
DB_PASSWORD=your-secure-password
```

The file must not be committed to GitHub.

---

# 35. Local Installation

## Clone Repository

```bash
git clone https://github.com/yousefosamaahmed/Accessmate-Ai-.git

cd Accessmate-Ai-
```

---

# Backend Setup

Navigate:

```bash
cd backend
```

Create virtual environment:

```bash
python -m venv .venv
```

Activate:

Windows:

```bash
.venv\Scripts\activate
```

Linux:

```bash
source .venv/bin/activate
```

Install requirements:

```bash
pip install -r requirements.txt
```

Run backend:

```bash
uvicorn app.main:app --reload
```

---

# Frontend Setup

Navigate:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run:

```bash
npm run dev
```

---

# 36. Docker Production Deployment

## Build and Run

```bash
docker compose --env-file .env.production up -d --build
```


Check running containers:

```bash
docker ps
```

Expected:

```
accessmate-caddy

accessmate-frontend

accessmate-backend

accessmate-postgres
```

---

# 37. Container Monitoring

## Backend Logs

```bash
docker logs accessmate-backend --tail 100
```


Expected:

```
Application startup complete.

Uvicorn running on http://0.0.0.0:8000
```

---

## Frontend Logs

```bash
docker logs accessmate-frontend --tail 100
```

---

## Caddy Logs

```bash
docker logs accessmate-caddy --tail 100
```

---

## Database Logs

```bash
docker logs accessmate-postgres --tail 100
```

---

# 38. Database Backup

PostgreSQL backup command:

```bash
docker exec accessmate-postgres \
pg_dump \
-U postgres \
-d accessmate_ai \
--encoding=UTF8 \
-f /tmp/accessmate_backup.sql
```

Copy backup:

```bash
docker cp \
accessmate-postgres:/tmp/accessmate_backup.sql \
./accessmate_backup.sql
```

Database backups should always be stored securely.

---

# 39. Database Restore

Restore SQL backup:

```bash
docker exec -i accessmate-postgres \
psql \
-X \
-U postgres \
-d accessmate_ai \
< accessmate_backup.sql
```

---

# 40. Production Health Checks

## Backend Check

```bash
curl http://localhost:8000/
```

Expected:

```json
{
 "success": true,
 "message": "AccessMate AI Backend is running",
 "data": {
   "version": "1.0.0"
 }
}
```

---

## Frontend Check

```bash
curl -I https://accessmate-ai.duckdns.org
```

Expected:

```
HTTP/2 200
```

---

# 41. AWS Deployment

Production environment:

```
Cloud Provider:
AWS EC2


Operating System:
Ubuntu Server 24.04 LTS


Container Platform:
Docker + Docker Compose


Reverse Proxy:
Caddy


Domain:
DuckDNS
```

---

# 42. AWS Security Group Configuration

Required inbound rules:

| Port | Service | Access |
|---|---|---|
| 22 | SSH | Administrator IP |
| 80 | HTTP | Public |
| 443 | HTTPS | Public |


The following ports should not be publicly exposed:

```
8000  FastAPI

5432  PostgreSQL
```

They are available only internally through Docker networking.

---

# 43. Production Networking

```
                 Internet

                    |

              HTTPS :443

                    |

              Caddy Proxy

                    |

          -------------------

          |                 |

     Frontend           Backend

     Nginx              FastAPI

                            |

                       PostgreSQL

                       pgvector
```

---

# 44. Git Workflow

Before committing:

```bash
git status
```


Add changes:

```bash
git add .
```


Commit:

```bash
git commit -m "Update project documentation"
```


Push:

```bash
git push origin main
```

---

# 45. Protected Files

The following files must never be committed:

```
backend/.env

.env.production

*.pem

*.sql

database backups

API keys

tokens

passwords

private credentials
```

---

# 46. Production Status

| Component | Status |
|---|---|
| React Frontend | ✅ Deployed |
| FastAPI Backend | ✅ Deployed |
| PostgreSQL Database | ✅ Running |
| pgvector Extension | ✅ Enabled |
| Docker Deployment | ✅ Completed |
| HTTPS | ✅ Enabled |
| SSL Certificate | ✅ Active |
| DuckDNS Domain | ✅ Configured |
| Reverse Proxy | ✅ Caddy |
| Database Migration | ✅ Completed |
| Backup Restore Test | ✅ Verified |
| Arabic Data Storage | ✅ Verified |
| Container Restart Policy | ✅ Enabled |
| EC2 Deployment | ✅ Completed |


---

# 47. Project Limitations

Current limitations:

- AI responses depend on configured AI services.
- Some AI capabilities require external model providers.
- AI outputs may contain errors and require user judgment.
- Performance depends on available computing resources and service availability.


---

# 48. Future Roadmap

Potential improvements:

## AI Improvements

- More optimized AI models
- Improved personalization
- Better context understanding


## Accessibility Improvements

- Additional assistive workflows
- More accessibility integrations
- Enhanced user customization


## Infrastructure Improvements

- Automated CI/CD pipeline
- Advanced monitoring
- Horizontal scaling


---

# 49. Project Ownership

AccessMate AI started as a group project.

After the withdrawal of other team members, the current final version was independently completed.

The final implementation includes:

- Product architecture
- Frontend implementation
- Backend implementation
- Database design
- AI integrations
- Security configuration
- Cloud deployment
- Production testing


---

# 50. Ethical AI Statement

AccessMate AI is developed following responsible AI principles.

## Privacy

User information and system credentials are protected.

## Transparency

The project documents actual implemented capabilities only.

## Human Oversight

AI assists users but does not replace human decisions.

## Accessibility

The platform is designed to reduce barriers and improve digital inclusion.

---

# 51. References

## Frameworks

FastAPI  
https://fastapi.tiangolo.com/


React  
https://react.dev/


Vite  
https://vite.dev/


PostgreSQL  
https://www.postgresql.org/


---

## Infrastructure

Docker Documentation  
https://docs.docker.com/


Docker Compose  
https://docs.docker.com/compose/


Nginx Documentation  
https://nginx.org/en/docs/


Caddy Documentation  
https://caddyserver.com/docs/


AWS EC2 Documentation  
https://docs.aws.amazon.com/ec2/


DuckDNS  
https://www.duckdns.org/


---

# 52. License

No open-source license is provided unless a LICENSE file is added.

All rights reserved by the project owner.

---

# 53. Final Note

AccessMate AI demonstrates how Artificial Intelligence can be applied to create more accessible, inclusive, and supportive digital experiences.

The project focuses on combining practical AI technologies with accessibility principles to build a platform that can evolve with future assistive technology needs.


---

# AccessMate AI

🌐 https://accessmate-ai.duckdns.org
