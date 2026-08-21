from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


class FileService:
    def __init__(self, base_upload_dir: str = "uploads"):
        self.base_upload_dir = Path(base_upload_dir)
        self.base_upload_dir.mkdir(parents=True, exist_ok=True)

    def generate_unique_filename(self, original_filename: str) -> str:
        file_extension = Path(original_filename).suffix.lower()
        return f"{uuid4()}{file_extension}"

    def get_file_path(self, folder: str, filename: str) -> Path:
        folder_path = self.base_upload_dir / folder
        folder_path.mkdir(parents=True, exist_ok=True)

        return folder_path / filename

    def validate_file_type(
        self,
        filename: str,
        allowed_extensions: list[str]
    ) -> bool:
        file_extension = Path(filename).suffix.lower()
        return file_extension in allowed_extensions

    def get_file_type(self, filename: str) -> str:
        file_extension = Path(filename).suffix.lower().replace(".", "")

        if not file_extension:
            return "unknown"

        return file_extension

    def save_upload_file(
        self,
        upload_file: UploadFile,
        folder: str,
        allowed_extensions: list[str]
    ) -> tuple[str, str, int]:
        if not upload_file.filename:
            raise ValueError("File name is required")

        if not self.validate_file_type(
            upload_file.filename,
            allowed_extensions
        ):
            raise ValueError("File type is not allowed")

        stored_file_name = self.generate_unique_filename(
            upload_file.filename
        )

        file_path = self.get_file_path(
            folder,
            stored_file_name
        )

        file_size = 0

        with file_path.open("wb") as output_file:
            while True:
                chunk = upload_file.file.read(1024 * 1024)

                if not chunk:
                    break

                file_size += len(chunk)
                output_file.write(chunk)

        return (
            stored_file_name,
            str(file_path),
            file_size
        )

    def delete_file(self, file_path: str) -> bool:
        path = Path(file_path)

        if path.exists() and path.is_file():
            path.unlink()
            return True

        return False