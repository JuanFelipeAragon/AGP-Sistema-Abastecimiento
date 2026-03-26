"""
Products Router — Endpoints for SKUs, Classifications, and Acabados.
Thin layer: delegates all logic to ProductsService.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.dependencies import get_current_user, require_permissions
from app.modules.products.service import products_service
from app.modules.products.schemas import (
    SKUListParams,
    SKUResponse,
    SKUListResponse,
    ClassificationItem,
    ClassificationListResponse,
    ClassificationCreateRequest,
    ClassificationUpdateRequest,
    BulkActionRequest,
    AcabadoItem,
    AcabadoListResponse,
    TransitListResponse,
    DashboardSummaryResponse,
    SortOrder,
    ProductBaseListParams,
    ProductBaseListResponse,
    ProductBaseDetailResponse,
    WarehouseRecordListParams,
    WarehouseRecordListResponse,
    ProductsSummaryResponse,
)

router = APIRouter(prefix="/api/products", tags=["products"])


# ── SKUs ──

@router.get("/skus", response_model=SKUListResponse)
async def list_skus(
    search: Optional[str] = Query(None, description="Search by ref or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    acabado: Optional[str] = Query(None, description="Filter by acabado"),
    sistema: Optional[str] = Query(None, description="Filter by sistema"),
    linea: Optional[str] = Query(None, description="Filter by linea"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=200, description="Items per page"),
    sort_field: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: SortOrder = Query(SortOrder.asc, description="Sort direction"),
    user=Depends(require_permissions(["products"])),
):
    """List SKU catalog with filters, sorting, and pagination."""
    params = SKUListParams(
        search=search,
        category=category,
        subcategory=subcategory,
        acabado=acabado,
        sistema=sistema,
        linea=linea,
        page=page,
        page_size=page_size,
        sort_field=sort_field,
        sort_order=sort_order,
    )
    return await products_service.get_skus(params)


@router.get("/skus/{ref}", response_model=SKUResponse)
async def get_sku(ref: str, user=Depends(require_permissions(["products"]))):
    """Get a single SKU by reference."""
    sku = await products_service.get_sku_by_ref(ref)
    if not sku:
        raise HTTPException(status_code=404, detail=f"SKU '{ref}' no encontrado")
    return sku


# ── Classifications ──

@router.get("/classifications/{dimension}", response_model=ClassificationListResponse)
async def list_classifications(
    dimension: str,
    search: Optional[str] = Query(None, description="Search filter"),
    user=Depends(require_permissions(["products"])),
):
    """Get all classification items for a dimension (categorias, subcategorias, sistemas)."""
    valid_dims = ("categorias", "subcategorias", "sistemas", "lineas", "aleaciones")
    if dimension not in valid_dims:
        raise HTTPException(
            status_code=400,
            detail=f"Dimension invalida. Use: {', '.join(valid_dims)}",
        )
    return await products_service.get_classifications(dimension, search)


@router.post("/classifications/{dimension}", response_model=ClassificationItem)
async def create_classification(
    dimension: str,
    data: ClassificationCreateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Create a new classification value."""
    valid_dims = ("categorias", "subcategorias", "sistemas", "lineas", "aleaciones")
    if dimension not in valid_dims:
        raise HTTPException(
            status_code=400,
            detail=f"Dimension invalida. Use: {', '.join(valid_dims)}",
        )
    return await products_service.create_classification(dimension, data)


@router.put("/classifications/{dimension}/{original_value}", response_model=ClassificationItem)
async def update_classification(
    dimension: str,
    original_value: str,
    data: ClassificationUpdateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Update an existing classification value."""
    valid_dims = ("categorias", "subcategorias", "sistemas", "lineas", "aleaciones")
    if dimension not in valid_dims:
        raise HTTPException(
            status_code=400,
            detail=f"Dimension invalida. Use: {', '.join(valid_dims)}",
        )
    result = await products_service.update_classification(dimension, original_value, data)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Clasificacion '{original_value}' no encontrada en {dimension}",
        )
    return result


@router.post("/classifications/{dimension}/bulk")
async def bulk_classification_action(
    dimension: str,
    action_data: BulkActionRequest,
    user=Depends(require_permissions(["products"])),
):
    """Execute a bulk action on classifications."""
    valid_dims = ("categorias", "subcategorias", "sistemas", "lineas", "aleaciones")
    if dimension not in valid_dims:
        raise HTTPException(
            status_code=400,
            detail=f"Dimension invalida. Use: {', '.join(valid_dims)}",
        )
    return await products_service.bulk_classification_action(dimension, action_data)


# ── Acabados ──

@router.get("/acabados", response_model=AcabadoListResponse)
async def list_acabados(
    search: Optional[str] = Query(None, description="Search filter"),
    user=Depends(require_permissions(["products"])),
):
    """Get all acabados with optional search."""
    return await products_service.get_acabados(search)


@router.post("/acabados", response_model=AcabadoItem)
async def create_acabado(
    data: ClassificationCreateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Create a new acabado."""
    return await products_service.create_acabado(data)


@router.put("/acabados/{original_value}", response_model=AcabadoItem)
async def update_acabado(
    original_value: str,
    data: ClassificationUpdateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Update an existing acabado."""
    result = await products_service.update_acabado(original_value, data)
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Acabado '{original_value}' no encontrado",
        )
    return result


@router.post("/acabados/bulk")
async def bulk_acabado_action(
    action_data: BulkActionRequest,
    user=Depends(require_permissions(["products"])),
):
    """Execute a bulk action on acabados."""
    return await products_service.bulk_acabado_action(action_data)


# ── Dashboard Summary ──

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(user=Depends(require_permissions(["products"]))):
    """Get KPIs for the products dashboard."""
    return await products_service.get_dashboard_summary()


# ── Base Products ──

@router.get("/base", response_model=ProductBaseListResponse)
async def list_base_products(
    search: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    sistema: Optional[str] = Query(None),
    is_profile: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.asc),
    user=Depends(require_permissions(["products"])),
):
    """List base products with filters, sorting, and pagination."""
    params = ProductBaseListParams(
        search=search,
        subcategory=subcategory,
        sistema=sistema,
        is_profile=is_profile,
        status=status,
        page=page,
        page_size=page_size,
        sort_field=sort_field,
        sort_order=sort_order,
    )
    return await products_service.get_base_products(params)


@router.get("/base/{product_id}", response_model=ProductBaseDetailResponse)
async def get_base_product_detail(
    product_id: int,
    user=Depends(require_permissions(["products"])),
):
    """Get a single base product with its variants."""
    result = await products_service.get_base_product_detail(product_id)
    if not result:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return result


# ── Warehouse Records ──

@router.get("/warehouse", response_model=WarehouseRecordListResponse)
async def list_warehouse_records(
    search: Optional[str] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    abc_rotacion_costo: Optional[str] = Query(None),
    variant_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.asc),
    user=Depends(require_permissions(["products"])),
):
    """List product-warehouse records with filters, sorting, and pagination."""
    params = WarehouseRecordListParams(
        search=search,
        warehouse_id=warehouse_id,
        abc_rotacion_costo=abc_rotacion_costo,
        variant_id=variant_id,
        page=page,
        page_size=page_size,
        sort_field=sort_field,
        sort_order=sort_order,
    )
    return await products_service.get_warehouse_records(params)


# ── Enhanced Summary ──

@router.get("/summary", response_model=ProductsSummaryResponse)
async def get_products_summary(user=Depends(require_permissions(["products"]))):
    """Get comprehensive KPIs for products, variants, and warehouse."""
    return await products_service.get_products_summary()


# ── Warehouses List ──

@router.get("/warehouses")
async def list_warehouses(user=Depends(require_permissions(["products"]))):
    """Get active warehouses for filter dropdowns."""
    return await products_service.get_warehouses()
