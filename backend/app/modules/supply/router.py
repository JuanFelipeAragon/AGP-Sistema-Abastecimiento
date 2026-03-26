"""
Supply Router — Endpoints for the abastecimiento module.
Thin layer: delegates all logic to supply_service.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_current_user, require_permissions
from app.modules.supply import service as supply_service
from app.modules.supply.schemas import (
    SupplyDashboardResponse,
    SupplyParametersUpdate,
    SupplyParametersResponse,
    RecalculateRequest,
    InactivateRequest,
)

router = APIRouter(prefix="/api/supply", tags=["supply"])


@router.get("/dashboard", response_model=SupplyDashboardResponse)
async def get_dashboard(user=Depends(require_permissions(["supply"]))):
    """Get executive dashboard summary with alert counts and totals."""
    return await supply_service.get_dashboard_summary()


@router.get("/decisions")
async def get_decisions(
    alert_status: Optional[str] = Query(None, description="Filter by alert status"),
    abc_class: Optional[str] = Query(None, description="Filter by ABC class"),
    search: Optional[str] = Query(None, description="Search by reference or description"),
    user=Depends(require_permissions(["supply"])),
):
    """Get list of supply decisions with optional filters."""
    return await supply_service.get_decisions(
        alert_status=alert_status,
        abc_class=abc_class,
        search=search,
    )


@router.post("/recalculate")
async def recalculate(
    request: RecalculateRequest,
    user=Depends(require_permissions(["supply"])),
):
    """Recalculate all supply decisions with new parameters."""
    return await supply_service.recalculate(
        lead_time_months=request.lead_time_months or 4.0,
        service_level_z=request.service_level_z or 1.65,
        coverage_months=request.coverage_months or 6.0,
    )


@router.post("/inactivate/{sku_id}")
async def inactivate_sku(
    sku_id: str,
    request: InactivateRequest,
    user=Depends(require_permissions(["supply"])),
):
    """Mark a SKU as inactive with a reason."""
    # TODO: Update sku_catalog.is_active = False + log in sku_inactive_log
    return {
        "message": f"SKU {sku_id} inactivado exitosamente",
        "reason": request.reason,
        "inactivated_by": user["email"],
    }


@router.get("/parameters", response_model=SupplyParametersResponse)
async def get_parameters(user=Depends(require_permissions(["supply"]))):
    """Get current supply parameters."""
    return SupplyParametersResponse(
        lead_time_months=4.0,
        service_level_z=1.65,
        coverage_months=6.0,
    )


@router.put("/parameters", response_model=SupplyParametersResponse)
async def update_parameters(
    params: SupplyParametersUpdate,
    user=Depends(require_permissions(["supply"])),
):
    """Update supply parameters."""
    # TODO: Update supply_parameters table in Supabase
    return SupplyParametersResponse(
        lead_time_months=params.lead_time_months,
        service_level_z=params.service_level_z,
        coverage_months=params.coverage_months,
        updated_by=user["email"],
    )


@router.get("/export/excel")
async def export_excel(user=Depends(require_permissions(["supply"]))):
    """Export purchase list to Excel."""
    # TODO: Generate Excel file with SheetJS-like library (openpyxl)
    return {"message": "Export endpoint — to be implemented with openpyxl"}
