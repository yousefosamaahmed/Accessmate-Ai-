from typing import Any, Optional


def success_response(message: str, data: Any = None):
    return {
        "success": True,
        "message": message,
        "data": data
    }


def error_response(
    message: str,
    error_code: Optional[str] = None,
    data: Any = None
):
    return {
        "success": False,
        "message": message,
        "error_code": error_code,
        "data": data
    }