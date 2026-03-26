"""
Pydantic schemas for the Products module — SKUs, Classifications, Acabados.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ── Enums ──

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


class BulkActionType(str, Enum):
    rename = "rename"
    merge = "merge"
    inactivate = "inactivate"
    delete = "delete"
    export = "export"


class ClassificationStatus(str, Enum):
    active = "active"
    inactive = "inactive"


# ── SKU Schemas ──

class SKUListParams(BaseModel):
    """Query parameters for filtering the SKU catalog."""
    search: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    acabado: Optional[str] = None
    sistema: Optional[str] = None
    linea: Optional[str] = None
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(25, ge=1, le=200, description="Items per page")
    sort_field: Optional[str] = Field(None, description="Field to sort by")
    sort_order: SortOrder = Field(SortOrder.asc, description="Sort direction")


class SKUResponse(BaseModel):
    """Full SKU data returned by the API."""
    ref: str
    desc: str
    cat: Optional[str] = None
    sub: Optional[str] = None
    sys: Optional[str] = None
    lin: Optional[str] = None
    acabado: Optional[str] = None
    codAcabado: Optional[str] = None
    aleacion: Optional[str] = None
    cost: float = 0
    wt: float = 0
    stk: float = 0
    valInv: float = 0
    nBod: int = 0
    sold: float = 0
    rev: float = 0
    ntx: int = 0
    ncl: int = 0
    fVenta: Optional[str] = None
    fEntrada: Optional[str] = None
    fSalida: Optional[str] = None
    fCompra: Optional[str] = None
    fCreacion: Optional[str] = None
    status: str = "Activo"


class SKUListResponse(BaseModel):
    """Paginated list of SKUs."""
    items: list[SKUResponse]
    total: int
    page: int
    page_size: int


# ── Classification Schemas ──

class ChangeLogEntry(BaseModel):
    """Single entry in a classification's change log."""
    date: str
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    user: Optional[str] = None


class ClassificationItem(BaseModel):
    """A single classification value (category, subcategory, or system)."""
    id: Optional[str] = None
    originalValue: str
    normalizedValue: str
    description: Optional[str] = None
    status: ClassificationStatus = ClassificationStatus.active
    skuCount: int = 0
    isEdited: bool = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
    notes: Optional[str] = None
    changeLog: list[ChangeLogEntry] = []


class ClassificationStats(BaseModel):
    """Summary statistics for classifications."""
    total: int = 0
    edited: int = 0
    active: int = 0
    inactive: int = 0


class ClassificationListResponse(BaseModel):
    """List of classifications with summary stats."""
    items: list[ClassificationItem]
    stats: ClassificationStats


class ClassificationCreateRequest(BaseModel):
    """Create a new classification value."""
    originalValue: str = Field(..., min_length=1, description="Original classification value")
    normalizedValue: str = Field(..., min_length=1, description="Normalized display value")
    description: Optional[str] = None
    notes: Optional[str] = None


class ClassificationUpdateRequest(BaseModel):
    """Update an existing classification value."""
    normalizedValue: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ClassificationStatus] = None


class BulkActionRequest(BaseModel):
    """Bulk action on multiple classification items."""
    action: BulkActionType
    ids: list[str] = Field(..., min_length=1, description="List of originalValue ids")
    newValue: Optional[str] = Field(None, description="New value for rename/merge actions")


# ── Acabado Schemas ──

class AcabadoItem(BaseModel):
    """A single acabado (finish) classification."""
    id: Optional[str] = None
    originalValue: str
    normalizedValue: str
    code: Optional[str] = None
    description: Optional[str] = None
    status: ClassificationStatus = ClassificationStatus.active
    skuCount: int = 0
    isEdited: bool = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
    notes: Optional[str] = None
    changeLog: list[ChangeLogEntry] = []


class AcabadoListResponse(BaseModel):
    """List of acabados with summary stats."""
    items: list[AcabadoItem]
    stats: ClassificationStats


# ── Transit Schemas ──

class TransitItem(BaseModel):
    """A single transit order line."""
    ref: str
    desc: Optional[str] = None
    qty: float = 0
    kg: float = 0
    sup: Optional[str] = None
    orig: Optional[str] = None
    eta: Optional[str] = None
    ship: Optional[str] = None


class TransitListResponse(BaseModel):
    """Paginated list of transit items."""
    items: list[TransitItem]
    total: int
    page: int
    page_size: int


# ── Dashboard Summary ──

class DashboardSummaryResponse(BaseModel):
    """KPIs for the products dashboard."""
    total_skus: int = 0
    total_with_stock: int = 0
    total_with_sales: int = 0
    total_transit_refs: int = 0
    total_transit_qty: float = 0
    total_revenue_12m: float = 0
    total_clients: int = 0
    categories_count: int = 0
    subcategories_count: int = 0
    acabados_count: int = 0


# ── Base Products Schemas ──

class ProductBaseListParams(BaseModel):
    search: Optional[str] = None
    subcategory: Optional[str] = None
    sistema: Optional[str] = None
    is_profile: Optional[bool] = None
    status: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(25, ge=1, le=200)
    sort_field: Optional[str] = None
    sort_order: SortOrder = Field(SortOrder.asc)


class ProductBaseItem(BaseModel):
    id: int
    reference: str
    description: Optional[str] = None
    subcategoria: Optional[str] = None
    sistema: Optional[str] = None
    linea: Optional[str] = None
    pesoUm: float = 0
    isProfile: bool = False
    variantCount: int = 0
    status: str = "Activo"


class ProductBaseListResponse(BaseModel):
    items: list[ProductBaseItem]
    total: int
    page: int
    page_size: int


class ProductBaseDetailResponse(ProductBaseItem):
    categoria: Optional[str] = None
    variants: list = []  # list of variant summaries


# ── Warehouse Records Schemas ──

class WarehouseRecordListParams(BaseModel):
    search: Optional[str] = None
    warehouse_id: Optional[int] = None
    abc_rotacion_costo: Optional[str] = None
    variant_id: Optional[int] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(25, ge=1, le=200)
    sort_field: Optional[str] = None
    sort_order: SortOrder = Field(SortOrder.asc)


class WarehouseRecordItem(BaseModel):
    id: int
    refSiesa: str
    descProducto: Optional[str] = None
    bodega: str
    ciudad: Optional[str] = None
    costoPromedio: float = 0
    precioUnitario: float = 0
    costoTotal: float = 0
    abcRotacionCosto: Optional[str] = None
    abcRotacionCostoBod: Optional[str] = None
    abcRotacionVeces: Optional[str] = None
    abcRotacionVecesBod: Optional[str] = None
    fUltimaVenta: Optional[str] = None
    fUltimaEntrada: Optional[str] = None
    fUltimaSalida: Optional[str] = None
    fUltimaCompra: Optional[str] = None


class WarehouseRecordListResponse(BaseModel):
    items: list[WarehouseRecordItem]
    total: int
    page: int
    page_size: int


# ── Enhanced Summary ──

class ProductsSummaryResponse(BaseModel):
    products: dict  # {total, profiles, accessories, withoutVariants}
    variants: dict  # {total, active, inactive, withoutWarehouse}
    warehouse: dict  # {totalRecords, totalInventoryValue, activeBodegas, noSales6m}
