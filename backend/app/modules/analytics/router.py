"""
Analytics Router — Reports and executive summary endpoints.
"""
from fastapi import APIRouter, Depends

from app.dependencies import require_permissions

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(user=Depends(require_permissions(["supply"]))):
    """Get executive summary with KPIs."""
    # TODO: Aggregate data from Supabase
    return {
        "total_references": 1247,
        "active_references": 1179,
        "inactive_references": 68,
        "total_stock_value_cop": 8750000000,
        "total_transit_value_cop": 2450000000,
        "pending_import_orders": 12,
        "avg_lead_time_days": 120,
    }
