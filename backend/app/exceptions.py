"""
Domain exceptions and global error handlers for the AGP system.
Each module can raise these; FastAPI catches them globally.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("agp")


class AGPException(Exception):
    """Base exception for all AGP domain errors."""
    def __init__(self, message: str, code: str = "error", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AGPException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} '{identifier}' no encontrado",
            code="not_found",
            status_code=404,
        )


class ValidationError(AGPException):
    def __init__(self, message: str):
        super().__init__(message=message, code="validation_error", status_code=422)


class ForbiddenError(AGPException):
    def __init__(self, message: str = "No tiene permisos para esta acción"):
        super().__init__(message=message, code="forbidden", status_code=403)


class ServiceUnavailableError(AGPException):
    def __init__(self, service: str):
        super().__init__(
            message=f"Servicio no disponible: {service}",
            code="service_unavailable",
            status_code=503,
        )


def register_exception_handlers(app: FastAPI):
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(AGPException)
    async def agp_exception_handler(request: Request, exc: AGPException):
        logger.warning(f"AGP Error [{exc.code}]: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.code, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled error: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "Error interno del servidor",
            },
        )
