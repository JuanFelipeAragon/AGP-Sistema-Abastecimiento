"""
FastAPI Application — AGP Supply System
Main entry point with CORS, lifespan events, middleware, and module auto-discovery.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.logging_config import setup_logging
from app.exceptions import register_exception_handlers
from app.middleware.request_id import RequestIdMiddleware
from app.modules import discover_module_routers

settings = get_settings()
logger = setup_logging(settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info(f"AGP Supply System v{settings.APP_VERSION} starting...")
    yield
    logger.info("AGP Supply System shutting down...")


app = FastAPI(
    title="AGP Supply System API",
    description="API para el sistema de gestión de abastecimiento e inventario",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ── Middleware (order matters: first added = outermost) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

# ── Exception handlers ──
register_exception_handlers(app)

# ── Auto-discover and register module routers ──
for router in discover_module_routers():
    app.include_router(router)


@app.get("/")
async def root():
    return {
        "message": "AGP Supply System API",
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/api/health")
async def health_check():
    """Health check — verifies API is running and optionally checks Supabase."""
    from app.config import get_supabase_client
    supabase = get_supabase_client()
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "supabase": "connected" if supabase else "not_configured",
    }
