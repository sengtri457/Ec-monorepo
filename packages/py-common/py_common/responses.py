from rest_framework.response import Response
from rest_framework import status
from typing import Any, Optional, Dict

def api_success(data: Any = None, message: str = "Success", status_code: int = status.HTTP_200_OK) -> Response:
    payload: Dict[str, Any] = {
        "success": True,
        "message": message,
    }
    if data is not None:
        payload["data"] = data
    return Response(payload, status=status_code)

def api_error(message: str = "An error occurred", error: Any = None, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    payload: Dict[str, Any] = {
        "success": False,
        "message": message,
    }
    if error is not None:
        payload["error"] = error
    return Response(payload, status=status_code)
