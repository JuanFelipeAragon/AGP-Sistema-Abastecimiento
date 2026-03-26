"""
Pydantic schemas for the Supply (Abastecimiento) module.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class AlertStatus(str, Enum):
    CRITICO = "CRITICO"
    ALERTA = "ALERTA"
    OK = "OK"
    SIN_MOV = "SIN_MOV"


class SupplyParametersUpdate(BaseModel):
    lead_time_months: float = Field(4.0, ge=0.5, le=12, description="Lead time in months")
    service_level_z: float = Field(1.65, description="Z-score for service level")
    coverage_months: float = Field(6.0, ge=1, le=24, description="Coverage target in months")


class SupplyParametersResponse(SupplyParametersUpdate):
    id: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None


class SupplyDecisionResponse(BaseModel):
    id: int
    reference: str
    description: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    abc_class: Optional[str] = None
    stock_actual: float
    en_transito: float
    stock_disponible: float
    ss: float
    rop: float
    demand_avg: float
    demand_std: float
    cv: float
    months_with_sales: int
    qty_to_order: float
    estimated_value: float
    unit_cost: float
    alert_status: AlertStatus


class SupplyDashboardResponse(BaseModel):
    total_skus: int
    critical_count: int
    alert_count: int
    ok_count: int
    sin_mov_count: int
    total_to_order: int
    estimated_total_value: float
    total_stock_value: float
    total_transit_value: float


class InactivateRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason for inactivation")


class RecalculateRequest(BaseModel):
    lead_time_months: Optional[float] = None
    service_level_z: Optional[float] = None
    coverage_months: Optional[float] = None
