from fastapi import APIRouter

from app.api.v1 import (
    account,
    ai,
    ai_interactions,
    assistant,
    auth,
    care_alert,
    caregivers,
    conversations,
    daily_need_actions,
    documents,
    extension,
    files,
    ocr,
    onboarding,
    preferences,
    profile,
    screenshots,
    security,
    hearing,
    speech,
    telegram,
    users,
    vision,
    voice,
    website_safety,
)
from app.api.v1.endpoints import health


api_router = APIRouter()


# ============================================================
# SYSTEM / HEALTH
# ============================================================

api_router.include_router(
    health.router
)


# ============================================================
# AUTH / USER
# ============================================================

api_router.include_router(
    auth.router
)

api_router.include_router(
    users.router
)

api_router.include_router(
    profile.router
)

api_router.include_router(
    account.router
)

api_router.include_router(
    onboarding.router
)

api_router.include_router(
    preferences.router
)


# ============================================================
# CONVERSATIONS / AI
# ============================================================

api_router.include_router(
    conversations.router
)

api_router.include_router(
    ai.router
)

api_router.include_router(
    assistant.router
)

api_router.include_router(
    ai_interactions.router
)


# ============================================================
# DOCUMENTS / FILES
# ============================================================

api_router.include_router(
    files.router
)

api_router.include_router(
    documents.router
)


# ============================================================
# ACCESSIBILITY AI
# ============================================================

api_router.include_router(
    voice.router
)

api_router.include_router(
    speech.router
)

api_router.include_router(
    vision.router
)

api_router.include_router(
    ocr.router
)

api_router.include_router(
    screenshots.router
)

api_router.include_router(
    hearing.router
)


# ============================================================
# WEBSITE SAFETY / SECURITY
# ============================================================

api_router.include_router(
    website_safety.router
)

api_router.include_router(
    security.router
)

api_router.include_router(
    extension.router
)


# ============================================================
# CARE / DAILY NEEDS
# ============================================================

api_router.include_router(
    daily_need_actions.router
)

api_router.include_router(
    caregivers.router
)

api_router.include_router(
    care_alert.router
)

api_router.include_router(
    telegram.router
)