from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.speech_log import SpeechLog
from app.schemas.speech_log_schema import SpeechLogCreate, SpeechLogUpdate


class SpeechLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_speech_log(self, speech_log_data: SpeechLogCreate) -> SpeechLog:
        speech_log = SpeechLog(**speech_log_data.model_dump())

        self.db.add(speech_log)
        self.db.commit()
        self.db.refresh(speech_log)

        return speech_log

    def get_speech_log_by_id(self, speech_log_id: UUID) -> Optional[SpeechLog]:
        return (
            self.db.query(SpeechLog)
            .filter(SpeechLog.id == speech_log_id)
            .first()
        )

    def get_speech_logs_by_user_id(self, user_id: UUID) -> List[SpeechLog]:
        return (
            self.db.query(SpeechLog)
            .filter(SpeechLog.user_id == user_id)
            .order_by(SpeechLog.created_at.desc())
            .all()
        )

    def update_speech_log(
        self,
        speech_log: SpeechLog,
        speech_log_data: SpeechLogUpdate
    ) -> SpeechLog:
        update_data = speech_log_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(speech_log, field, value)

        self.db.commit()
        self.db.refresh(speech_log)

        return speech_log

    def delete_speech_log(self, speech_log: SpeechLog) -> bool:
        self.db.delete(speech_log)
        self.db.commit()

        return True