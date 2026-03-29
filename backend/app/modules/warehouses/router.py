"""
Warehouses Router — CRUD endpoints for bodegas/locations.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.dependencies import require_permissions
from app.modules.warehouses.service import warehouse_service
from app.modules.warehouses.schemas import (
    WarehouseListParams,
    WarehouseListResponse,
    WarehouseItem,
    WarehouseCreateRequest,
    WarehouseUpdateRequest,
    WarehouseBulkActionRequest,
    SortOrder,
)

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


@router.get("", response_model=WarehouseListResponse)
async def list_warehouses(
    search: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    is_physical: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.asc),
    user=Depends(require_permissions(["settings"])),
):
    """List all warehouses with optional filters."""
    params = WarehouseListParams(
        search=search,
        purpose=purpose,
        is_physical=is_physical,
        is_active=is_active,
        sort_field=sort_field,
        sort_order=sort_order,
    )
    return await warehouse_service.get_warehouses(params)


@router.get("/{warehouse_id}", response_model=WarehouseItem)
async def get_warehouse(
    warehouse_id: int,
    user=Depends(require_permissions(["settings"])),
):
    """Get a single warehouse by ID."""
    result = await warehouse_service.get_warehouse_by_id(warehouse_id)
    if not result:
        raise HTTPException(status_code=404, detail="Bodega no encontrada")
    return result


@router.post("", response_model=WarehouseItem)
async def create_warehouse(
    data: WarehouseCreateRequest,
    user=Depends(require_permissions(["settings"])),
):
    """Create a new warehouse."""
    return await warehouse_service.create_warehouse(data)


@router.put("/{warehouse_id}", response_model=WarehouseItem)
async def update_warehouse(
    warehouse_id: int,
    data: WarehouseUpdateRequest,
    user=Depends(require_permissions(["settings"])),
):
    """Update an existing warehouse."""
    result = await warehouse_service.update_warehouse(warehouse_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Bodega no encontrada")
    return result


@router.post("/bulk")
async def bulk_warehouse_action(
    action_data: WarehouseBulkActionRequest,
    user=Depends(require_permissions(["settings"])),
):
    """Execute a bulk action on warehouses."""
    return await warehouse_service.bulk_action(action_data)
