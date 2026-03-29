"""
Sales Module Schemas — Pydantic models for sales, customers, salespeople, geography.
"""
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


class BulkActionType(str, Enum):
    activate = "activate"
    inactivate = "inactivate"


# ── Sale item (flattened from sales_enriched view) ──

class SaleItem(BaseModel):
    id: int
    invoiceNumber: Optional[str] = None
    orderNumber: Optional[str] = None
    itemSiesa: Optional[int] = None
    referenceSiesa: str
    acabadoCode: Optional[str] = None
    variantId: Optional[int] = None
    # Resolved FK display names
    customerId: Optional[int] = None
    customerName: Optional[str] = None
    salespersonId: Optional[int] = None
    salespersonName: Optional[str] = None
    warehouseId: Optional[int] = None
    warehouseName: Optional[str] = None
    geographyId: Optional[int] = None
    country: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    # Product dimensions (from products via variant join)
    categoriaRaw: Optional[str] = None
    subcategoriaRaw: Optional[str] = None
    sistemaRaw: Optional[str] = None
    docType: Optional[str] = None
    docPrefix: Optional[str] = None
    # Dates
    invoiceDate: Optional[str] = None
    orderDate: Optional[str] = None
    deliveryDate: Optional[str] = None
    itemDeliveryDate: Optional[str] = None
    # Quantities / pricing
    currency: str = "COP"
    quantity: int = 0
    weightTon: float = 0.0
    unitPrice: float = 0.0
    pricePerKg: float = 0.0
    subtotal: float = 0.0
    taxes: float = 0.0
    netTotal: float = 0.0
    discounts: float = 0.0
    status: str = "aprobada"


# ── List params (with Power BI-style filters) ──

class SalesListParams(BaseModel):
    search: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    customer_id: Optional[int] = None
    salesperson_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    # Time period filters
    year: Optional[int] = None
    quarter: Optional[int] = None
    month: Optional[int] = None
    # Product dimension filters
    sistema: Optional[str] = None
    subcategoria: Optional[str] = None
    categoria: Optional[str] = None
    doc_type: Optional[str] = None
    # Pagination & sort
    sort_field: Optional[str] = None
    sort_order: SortOrder = SortOrder.desc
    page: int = 1
    page_size: int = 50


class SalesListResponse(BaseModel):
    items: list[SaleItem]
    total: int
    page: int
    pageSize: int
    pages: int


# ── Summary / KPIs ──

class SalesSummaryResponse(BaseModel):
    totalInvoices: int = 0
    uniqueInvoices: int = 0
    totalQuantity: int = 0
    totalWeightTon: float = 0.0
    subtotalCop: float = 0.0
    subtotalUsd: float = 0.0
    totalNetCop: float = 0.0
    totalNetUsd: float = 0.0
    uniqueCustomers: int = 0
    uniqueReferences: int = 0
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None


# ── Filter options ──

class FilterOptionItem(BaseModel):
    id: int
    name: str


class SalesFilterOptions(BaseModel):
    currencies: list[str] = []
    statuses: list[str] = []
    years: list[int] = []
    vendedores: list[FilterOptionItem] = []
    clientes: list[FilterOptionItem] = []
    bodegas: list[FilterOptionItem] = []
    sistemas: list[dict] = []         # [{value, count}]
    subcategorias: list[dict] = []    # [{value, count}]
    categorias: list[dict] = []       # [{value, count}]
    doc_types: list[dict] = []        # [{value, count}]


# ── Customers ──

class CustomerWithStats(BaseModel):
    id: int
    siesaCode: Optional[int] = None
    name: str
    isActive: bool = True
    totalSales: int = 0
    totalNetCop: float = 0.0
    totalNetUsd: float = 0.0
    totalWeightTon: float = 0.0
    lastInvoiceDate: Optional[str] = None


class CustomerListParams(BaseModel):
    search: Optional[str] = None
    is_active: Optional[bool] = None
    sort_field: Optional[str] = None
    sort_order: SortOrder = SortOrder.asc


class CustomerListResponse(BaseModel):
    items: list[CustomerWithStats]
    total: int


# ── Salespeople ──

class SalespersonWithStats(BaseModel):
    id: int
    name: str
    isActive: bool = True
    totalSales: int = 0
    totalNetCop: float = 0.0
    totalNetUsd: float = 0.0
    uniqueCustomers: int = 0
    totalWeightTon: float = 0.0
    lastInvoiceDate: Optional[str] = None


class SalespersonListParams(BaseModel):
    search: Optional[str] = None
    is_active: Optional[bool] = None
    sort_field: Optional[str] = None
    sort_order: SortOrder = SortOrder.asc


class SalespersonListResponse(BaseModel):
    items: list[SalespersonWithStats]
    total: int


# ── Geography ──

class GeographyWithStats(BaseModel):
    id: int
    country: str
    department: Optional[str] = None
    city: Optional[str] = None
    totalSales: int = 0
    totalNetCop: float = 0.0
    totalNetUsd: float = 0.0
    totalWeightTon: float = 0.0


class GeographyListParams(BaseModel):
    search: Optional[str] = None
    country: Optional[str] = None
    sort_field: Optional[str] = None
    sort_order: SortOrder = SortOrder.asc


class GeographyListResponse(BaseModel):
    items: list[GeographyWithStats]
    total: int


# ── Bulk actions ──

class CustomerBulkActionRequest(BaseModel):
    action: BulkActionType
    ids: list[int]


class SalespersonBulkActionRequest(BaseModel):
    action: BulkActionType
    ids: list[int]
