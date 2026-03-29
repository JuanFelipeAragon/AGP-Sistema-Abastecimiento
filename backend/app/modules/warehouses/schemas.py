"""
Pydantic schemas for the Warehouses module — CRUD for bodegas/locations.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import date


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


class WarehousePurpose(str, Enum):
    storage = "storage"
    billing = "billing"
    transit = "transit"
    external = "external"
    damaged = "damaged"


class WarehouseBulkActionType(str, Enum):
    activate = "activate"
    inactivate = "inactivate"
    export = "export"


# ── List / Filter ──

class WarehouseListParams(BaseModel):
    search: Optional[str] = None
    purpose: Optional[str] = None
    is_physical: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_field: Optional[str] = None
    sort_order: SortOrder = Field(SortOrder.asc)


class WarehouseItem(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = None
    isPhysical: bool = True
    purpose: str = "storage"
    siesaName: Optional[str] = None
    notes: Optional[str] = None
    displayOrder: int = 0
    isActive: bool = True
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    capacityM2: Optional[float] = None
    monthlyCostCop: Optional[float] = None
    isThirdParty: bool = False
    lastAuditDate: Optional[str] = None
    tags: list[str] = []
    productWarehouseCount: int = 0
    inventorySummary: Optional[dict] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class WarehouseStats(BaseModel):
    total: int = 0
    physical: int = 0
    virtual: int = 0
    active: int = 0
    inactive: int = 0
    storage: int = 0
    transit: int = 0
    damaged: int = 0
    external: int = 0


class WarehouseListResponse(BaseModel):
    items: list[WarehouseItem]
    stats: WarehouseStats


# ── Create / Update ──

class WarehouseCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Warehouse name")
    code: Optional[str] = Field(None, description="Short code (e.g. TNJ, PLM)")
    city: Optional[str] = None
    country: Optional[str] = "Colombia"
    address: Optional[str] = None
    type: Optional[str] = "bodega"
    isPhysical: bool = True
    purpose: WarehousePurpose = WarehousePurpose.storage
    siesaName: Optional[str] = None
    notes: Optional[str] = None
    displayOrder: int = 0
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    capacityM2: Optional[float] = None
    monthlyCostCop: Optional[float] = None
    isThirdParty: bool = False
    lastAuditDate: Optional[str] = None
    tags: list[str] = []


class WarehouseUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = None
    isPhysical: Optional[bool] = None
    purpose: Optional[WarehousePurpose] = None
    siesaName: Optional[str] = None
    notes: Optional[str] = None
    displayOrder: Optional[int] = None
    isActive: Optional[bool] = None
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    capacityM2: Optional[float] = None
    monthlyCostCop: Optional[float] = None
    isThirdParty: Optional[bool] = None
    lastAuditDate: Optional[str] = None
    tags: Optional[list[str]] = None


class WarehouseBulkActionRequest(BaseModel):
    action: WarehouseBulkActionType
    ids: list[int] = Field(..., min_length=1)
