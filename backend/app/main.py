from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import api_router
from app.core.response import success_response
from app.core.settings import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title="AccessMate AI API",
    version="1.0.0",
    description="Backend API for AccessMate AI accessibility assistant",
)

origins = [
    settings.FRONTEND_ORIGIN,

    "http://localhost:8443",
    "http://127.0.0.1:8443",

    "http://localhost:8080",
    "http://127.0.0.1:8080",

    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:5174",
    "http://127.0.0.1:5174",

    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

origins = list(dict.fromkeys(
    origin for origin in origins if origin
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)


@app.get("/")
def root():
    return success_response(
        message="AccessMate AI Backend is running",
        data={"version": "1.0.0"},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)

