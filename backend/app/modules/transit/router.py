"""
Transit Router — Endpoints for transit/shipment data.
Thin layer: delegates all logic to TransitService.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import require_permissions
from app.modules.transit.service import transit_service
from app.modules.products.schemas import TransitListResponse, SortOrder

router = APIRouter(prefix="/api/transit", tags=["transit"])


@router.get("/", response_model=TransitListResponse)
async def list_transit(
    search: Optional[str] = Query(None, description="Search by ref, description, or supplier"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=200, description="Items per page"),
    sort_field: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: SortOrder = Query(SortOrder.asc, description="Sort direction"),
    user=Depends(require_permissions(["products"])),
):
    """Get paginated transit data with search, sorting, and pagination."""
    return await transit_service.get_transit(
        search=search,
        page=page,
        page_size=page_size,
        sort_field=sort_field,
        sort_order=sort_order.value,
    )
