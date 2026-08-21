from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(prefix="/preferences", tags=["Preferences"])


class PreferencesUpdate(BaseModel):
    appearance_theme: Optional[str] = None
    display_text_size: Optional[str] = None
    high_contrast: Optional[bool] = None
    reduced_motion: Optional[bool] = None

    user_mode: Optional[str] = None
    preferred_language: Optional[str] = None
    voice_guidance: Optional[bool] = None
    screen_reader_default: Optional[bool] = None
    simple_explanation: Optional[bool] = None
    auto_read_responses: Optional[bool] = None


DEFAULT_PREFS = {
    "appearance_theme": "dark",
    "display_text_size": "normal",
    "high_contrast": False,
    "reduced_motion": False,
    "user_mode": "standard",
    "preferred_language": "en",
    "voice_guidance": True,
    "screen_reader_default": False,
    "simple_explanation": False,
    "auto_read_responses": False,
}


def ensure_preferences_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS user_preferences (
                id UUID PRIMARY KEY,
                user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                appearance_theme VARCHAR(30) NOT NULL DEFAULT 'dark',
                display_text_size VARCHAR(30) NOT NULL DEFAULT 'normal',
                high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
                reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,

                user_mode VARCHAR(40) NOT NULL DEFAULT 'standard',
                preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
                voice_guidance BOOLEAN NOT NULL DEFAULT TRUE,
                screen_reader_default BOOLEAN NOT NULL DEFAULT FALSE,
                simple_explanation BOOLEAN NOT NULL DEFAULT FALSE,
                auto_read_responses BOOLEAN NOT NULL DEFAULT FALSE,

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
    )
    db.commit()


def row_to_dict(row):
    if row is None:
        return None

    mapping = row._mapping

    return {
        "id": str(mapping["id"]),
        "user_id": str(mapping["user_id"]),
        "appearance_theme": mapping["appearance_theme"],
        "display_text_size": mapping["display_text_size"],
        "high_contrast": mapping["high_contrast"],
        "reduced_motion": mapping["reduced_motion"],
        "user_mode": mapping["user_mode"],
        "preferred_language": mapping["preferred_language"],
        "voice_guidance": mapping["voice_guidance"],
        "screen_reader_default": mapping["screen_reader_default"],
        "simple_explanation": mapping["simple_explanation"],
        "auto_read_responses": mapping["auto_read_responses"],
        "created_at": mapping["created_at"],
        "updated_at": mapping["updated_at"],
    }


def get_or_create_preferences(db: Session, user_id):
    ensure_preferences_table(db)

    row = db.execute(
        text("SELECT * FROM user_preferences WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()

    if row:
        return row_to_dict(row)

    pref_id = uuid4()

    db.execute(
        text(
            """
            INSERT INTO user_preferences (
                id,
                user_id,
                appearance_theme,
                display_text_size,
                high_contrast,
                reduced_motion,
                user_mode,
                preferred_language,
                voice_guidance,
                screen_reader_default,
                simple_explanation,
                auto_read_responses
            )
            VALUES (
                :id,
                :user_id,
                :appearance_theme,
                :display_text_size,
                :high_contrast,
                :reduced_motion,
                :user_mode,
                :preferred_language,
                :voice_guidance,
                :screen_reader_default,
                :simple_explanation,
                :auto_read_responses
            )
            """
        ),
        {
            "id": pref_id,
            "user_id": user_id,
            **DEFAULT_PREFS,
        },
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM user_preferences WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()

    return row_to_dict(row)


@router.get("/me")
def get_my_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_or_create_preferences(db, current_user.id)


@router.patch("/me")
def update_my_preferences(
    payload: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_or_create_preferences(db, current_user.id)

    data = payload.dict(exclude_unset=True)

    allowed_fields = {
        "appearance_theme",
        "display_text_size",
        "high_contrast",
        "reduced_motion",
        "user_mode",
        "preferred_language",
        "voice_guidance",
        "screen_reader_default",
        "simple_explanation",
        "auto_read_responses",
    }

    data = {key: value for key, value in data.items() if key in allowed_fields}

    if data:
        set_clause = ", ".join([f"{key} = :{key}" for key in data.keys()])
        query = text(
            f"""
            UPDATE user_preferences
            SET {set_clause}, updated_at = NOW()
            WHERE user_id = :user_id
            """
        )

        db.execute(query, {**data, "user_id": current_user.id})
        db.commit()

    row = db.execute(
        text("SELECT * FROM user_preferences WHERE user_id = :user_id"),
        {"user_id": current_user.id},
    ).fetchone()

    return row_to_dict(row)
