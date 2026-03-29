"""
Sales Router — Read-only endpoints for sales data + manage customers/salespeople.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.dependencies import require_permissions
from app.modules.sales.service import sales_service
from app.modules.sales.schemas import (
    SalesListParams,
    SalesListResponse,
    SaleItem,
    SalesSummaryResponse,
    SalesFilterOptions,
    CustomerListParams,
    CustomerListResponse,
    CustomerWithStats,
    CustomerBulkActionRequest,
    SalespersonListParams,
    SalespersonListResponse,
    SalespersonWithStats,
    SalespersonBulkActionRequest,
    GeographyListParams,
    GeographyListResponse,
    SortOrder,
)

router = APIRouter(prefix="/api/sales", tags=["sales"])

_PERM = ["sales"]


# ── Sales ──

@router.get("", response_model=SalesListResponse)
async def list_sales(
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    salesperson_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    sistema: Optional[str] = Query(None),
    subcategoria: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.desc),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user=Depends(require_permissions(_PERM)),
):
    """List sales with server-side pagination and Power BI-style filters."""
    params = SalesListParams(
        search=search, date_from=date_from, date_to=date_to,
        currency=currency, status=status,
        customer_id=customer_id, salesperson_id=salesperson_id,
        warehouse_id=warehouse_id,
        year=year, quarter=quarter, month=month,
        sistema=sistema, subcategoria=subcategoria, categoria=categoria,
        doc_type=doc_type,
        sort_field=sort_field, sort_order=sort_order,
        page=page, page_size=page_size,
    )
    return await sales_service.get_sales(params)


@router.get("/summary", response_model=SalesSummaryResponse)
async def get_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    salesperson_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    sistema: Optional[str] = Query(None),
    subcategoria: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    user=Depends(require_permissions(_PERM)),
):
    """KPI aggregations for the sales dashboard — same filters as list."""
    params = SalesListParams(
        date_from=date_from, date_to=date_to,
        currency=currency, status=status,
        customer_id=customer_id, salesperson_id=salesperson_id,
        warehouse_id=warehouse_id,
        year=year, quarter=quarter, month=month,
        sistema=sistema, subcategoria=subcategoria, categoria=categoria,
        doc_type=doc_type,
    )
    return await sales_service.get_summary(params)


@router.get("/filter-options", response_model=SalesFilterOptions)
async def get_filter_options(
    user=Depends(require_permissions(_PERM)),
):
    """All distinct filter values for dropdowns/chips."""
    return await sales_service.get_filter_options()


# ── Customers — named routes BEFORE /{sale_id} ──

@router.get("/customers", response_model=CustomerListResponse)
async def list_customers(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.asc),
    user=Depends(require_permissions(_PERM)),
):
    params = CustomerListParams(
        search=search, is_active=is_active,
        sort_field=sort_field, sort_order=sort_order,
    )
    return await sales_service.get_customers(params)


@router.post("/customers/bulk")
async def bulk_customers(
    action_data: CustomerBulkActionRequest,
    user=Depends(require_permissions(_PERM)),
):
    return await sales_service.bulk_customers(action_data)


@router.get("/customers/{customer_id}", response_model=CustomerWithStats)
async def get_customer(
    customer_id: int,
    user=Depends(require_permissions(_PERM)),
):
    result = await sales_service.get_customer_by_id(customer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return result


# ── Salespeople — named routes BEFORE /{sale_id} ──

@router.get("/salespeople", response_model=SalespersonListResponse)
async def list_salespeople(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.asc),
    user=Depends(require_permissions(_PERM)),
):
    params = SalespersonListParams(
        search=search, is_active=is_active,
        sort_field=sort_field, sort_order=sort_order,
    )
    return await sales_service.get_salespeople(params)


@router.post("/salespeople/bulk")
async def bulk_salespeople(
    action_data: SalespersonBulkActionRequest,
    user=Depends(require_permissions(_PERM)),
):
    return await sales_service.bulk_salespeople(action_data)


@router.get("/salespeople/{sp_id}", response_model=SalespersonWithStats)
async def get_salesperson(
    sp_id: int,
    user=Depends(require_permissions(_PERM)),
):
    result = await sales_service.get_salesperson_by_id(sp_id)
    if not result:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    return result


# ── Geography — named route BEFORE /{sale_id} ──

@router.get("/geography", response_model=GeographyListResponse)
async def list_geography(
    search: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.asc),
    user=Depends(require_permissions(_PERM)),
):
    params = GeographyListParams(
        search=search, country=country,
        sort_field=sort_field, sort_order=sort_order,
    )
    return await sales_service.get_geography(params)


# ── Single sale (LAST to avoid path conflicts) ──

@router.get("/{sale_id}", response_model=SaleItem)
async def get_sale(
    sale_id: int,
    user=Depends(require_permissions(_PERM)),
):
    result = await sales_service.get_sale_by_id(sale_id)
    if not result:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return result
