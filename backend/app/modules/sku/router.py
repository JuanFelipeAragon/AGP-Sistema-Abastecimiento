"""
SKU Router — CRUD endpoints for the product catalog.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_current_user, require_permissions

router = APIRouter(prefix="/api/sku", tags=["sku"])


@router.get("/")
async def list_skus(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    user=Depends(require_permissions(["supply"])),
):
    """List SKU catalog with filters and pagination."""
    # TODO: Query sku_catalog from Supabase
    return {
        "items": [],
        "total": 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{sku_id}")
async def get_sku(sku_id: str, user=Depends(get_current_user)):
    """Get a single SKU by ID."""
    # TODO: Query sku_catalog from Supabase
    return {"id": sku_id, "message": "Endpoint ready — connect to Supabase"}
