from uuid import UUID

from sqlalchemy.orm import Session

from app.models.ai_interaction import AIInteraction


class AIInteractionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_interaction(
        self,
        user_id: UUID,
        feature: str,
        request_type: str,
        input_text: str | None = None,
        output_text: str | None = None,
        provider: str | None = None,
        model_name: str | None = None,
        status: str = "success",
        confidence: float | None = None,
        is_voice_friendly: bool = True,
        should_speak: bool = False,
        metadata_json: dict | None = None,
    ) -> AIInteraction:
        interaction = AIInteraction(
            user_id=user_id,
            feature=feature,
            request_type=request_type,
            input_text=input_text,
            output_text=output_text,
            provider=provider,
            model_name=model_name,
            status=status,
            confidence=confidence,
            is_voice_friendly=is_voice_friendly,
            should_speak=should_speak,
            metadata_json=metadata_json,
        )

        self.db.add(interaction)
        self.db.commit()
        self.db.refresh(interaction)

        return interaction

    def list_user_interactions(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AIInteraction]:
        return (
            self.db.query(AIInteraction)
            .filter(AIInteraction.user_id == user_id)
            .order_by(AIInteraction.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )