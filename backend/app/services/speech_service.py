from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.speech_log import SpeechLog
from app.repositories.speech_log_repository import SpeechLogRepository
from app.repositories.user_repository import UserRepository
from app.schemas.speech_log_schema import SpeechLogCreate, SpeechLogUpdate


class SpeechService:
    def __init__(self, db: Session):
        self.db = db
        self.speech_log_repository = SpeechLogRepository(db)
        self.user_repository = UserRepository(db)

    def create_speech_log(self, speech_log_data: SpeechLogCreate) -> SpeechLog:
        user = self.user_repository.get_user_by_id(speech_log_data.user_id)

        if not user:
            raise ValueError("User not found")

        speech_log = self.speech_log_repository.create_speech_log(
            speech_log_data
        )

        return speech_log

    def get_speech_log_by_id(self, speech_log_id: UUID) -> SpeechLog:
        speech_log = self.speech_log_repository.get_speech_log_by_id(
            speech_log_id
        )

        if not speech_log:
            raise ValueError("Speech log not found")

        return speech_log

    def get_speech_logs_by_user_id(self, user_id: UUID) -> list[SpeechLog]:
        user = self.user_repository.get_user_by_id(user_id)

        if not user:
            raise ValueError("User not found")

        speech_logs = self.speech_log_repository.get_speech_logs_by_user_id(
            user_id
        )

        return speech_logs

    def update_speech_log(
        self,
        speech_log_id: UUID,
        speech_log_data: SpeechLogUpdate
    ) -> SpeechLog:
        speech_log = self.get_speech_log_by_id(speech_log_id)

        updated_speech_log = self.speech_log_repository.update_speech_log(
            speech_log,
            speech_log_data
        )

        return updated_speech_log

    def set_transcript(
        self,
        speech_log_id: UUID,
        transcript: str,
        detected_language: str = "unknown",
        confidence: Decimal | None = None
    ) -> SpeechLog:
        speech_log = self.get_speech_log_by_id(speech_log_id)

        speech_log.transcript = transcript
        speech_log.detected_language = detected_language
        speech_log.confidence = confidence

        self.db.commit()
        self.db.refresh(speech_log)

        return speech_log

    def set_tts_output(
        self,
        speech_log_id: UUID,
        tts_output_path: str
    ) -> SpeechLog:
        speech_log = self.get_speech_log_by_id(speech_log_id)

        speech_log.tts_output_path = tts_output_path

        self.db.commit()
        self.db.refresh(speech_log)

        return speech_log

    def delete_speech_log(self, speech_log_id: UUID) -> bool:
        speech_log = self.get_speech_log_by_id(speech_log_id)

        self.speech_log_repository.delete_speech_log(speech_log)

        return True