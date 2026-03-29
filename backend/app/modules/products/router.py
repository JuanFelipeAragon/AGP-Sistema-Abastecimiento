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
    AcabadoCreateRequest,
    AcabadoUpdateRequest,
    AcabadoBulkActionRequest,
    TransitListResponse,
    DashboardSummaryResponse,
    SortOrder,
    ProductBaseListParams,
    ProductBaseListResponse,
    ProductBaseDetailResponse,
    ProductUpdateTechnicalSpecs,
    WarehouseRecordListParams,
    WarehouseRecordListResponse,
    ProductsSummaryResponse,
    ProductTypeConfigResponse,
    AttributeItem,
    AttributeListResponse,
    AttributeCreateRequest,
    AttributeUpdateRequest,
    AttributeBulkActionRequest,
)

router = APIRouter(prefix="/api/products", tags=["products"])


# ── Product Type Config ──

@router.get("/type-config", response_model=ProductTypeConfigResponse)
async def get_type_config(
    user=Depends(require_permissions(["products"])),
):
    """Get attribute configuration for all product types."""
    return await products_service.get_type_config()


@router.get("/subcategoria-type-map")
async def get_subcategoria_type_map(
    user=Depends(require_permissions(["products"])),
):
    """Get mapping of subcategoria_raw → product_type."""
    mapping = await products_service.get_subcategoria_type_map()
    return {"mapping": mapping}


# ── SKUs ──

@router.get("/skus/filter-options")
async def get_sku_filter_options(
    subcategory: Optional[str] = Query(None),
    acabado: Optional[str] = Query(None),
    temple: Optional[str] = Query(None),
    aleacion_code: Optional[str] = Query(None),
    longitud: Optional[float] = Query(None),
    user=Depends(require_permissions(["products"])),
):
    """Get available filter values based on current filters — cascading/dependent."""
    return await products_service.get_sku_filter_options(
        subcategory=subcategory,
        acabado=acabado,
        temple=temple,
        aleacion_code=aleacion_code,
        longitud=longitud,
    )


@router.get("/skus", response_model=SKUListResponse)
async def list_skus(
    search: Optional[str] = Query(None, description="Search by ref or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    acabado: Optional[str] = Query(None, description="Filter by acabado app name"),
    sistema: Optional[str] = Query(None, description="Filter by sistema"),
    linea: Optional[str] = Query(None, description="Filter by linea"),
    temple: Optional[str] = Query(None, description="Filter by temple"),
    aleacion_code: Optional[str] = Query(None, description="Filter by aleacion code"),
    longitud: Optional[float] = Query(None, description="Filter by exact longitud"),
    longitud_min: Optional[float] = Query(None, description="Filter by min longitud"),
    longitud_max: Optional[float] = Query(None, description="Filter by max longitud"),
    status: Optional[str] = Query(None, description="Filter by status"),
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
        temple=temple,
        aleacion_code=aleacion_code,
        longitud=longitud,
        longitud_min=longitud_min,
        longitud_max=longitud_max,
        status=status,
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
    return await products_service.create_classification(dimension, data, user_name=user.get("name", "system"))


@router.put("/classifications/{dimension}/{classification_id}", response_model=ClassificationItem)
async def update_classification(
    dimension: str,
    classification_id: str,
    data: ClassificationUpdateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Update an existing classification value by UUID."""
    valid_dims = ("categorias", "subcategorias", "sistemas", "lineas", "aleaciones")
    if dimension not in valid_dims:
        raise HTTPException(
            status_code=400,
            detail=f"Dimension invalida. Use: {', '.join(valid_dims)}",
        )
    result = await products_service.update_classification(
        dimension, classification_id, data, user_name=user.get("name", "system")
    )
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Clasificacion '{classification_id}' no encontrada en {dimension}",
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
    return await products_service.bulk_classification_action(
        dimension, action_data, user_name=user.get("name", "system")
    )


# ── Acabados ──

@router.get("/acabados", response_model=AcabadoListResponse)
async def list_acabados(
    search: Optional[str] = Query(None, description="Search filter"),
    tipo_acabado: Optional[str] = Query(None, description="Filter by tipo"),
    familia: Optional[str] = Query(None, description="Filter by familia"),
    status: Optional[str] = Query(None, description="Filter by status"),
    enrichment: Optional[str] = Query(None, description="Filter by enrichment status"),
    subcategoria: Optional[str] = Query(None, description="Filter by subcategoria"),
    user=Depends(require_permissions(["products"])),
):
    """Get all acabados with optional filters."""
    return await products_service.get_acabados(
        search=search, tipo_acabado=tipo_acabado, familia=familia,
        status=status, enrichment=enrichment, subcategoria=subcategoria,
    )


@router.get("/acabados/filters")
async def get_acabado_filters(user=Depends(require_permissions(["products"]))):
    """Get distinct values for acabado filter dropdowns."""
    return await products_service.get_acabado_filter_options()


@router.get("/acabados/{acabado_id}", response_model=AcabadoItem)
async def get_acabado(
    acabado_id: str,
    user=Depends(require_permissions(["products"])),
):
    """Get a single acabado with changelog."""
    result = await products_service.get_acabado_by_id(acabado_id)
    if not result:
        raise HTTPException(status_code=404, detail="Acabado no encontrado")
    return result


@router.post("/acabados", response_model=AcabadoItem)
async def create_acabado(
    data: AcabadoCreateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Create a new acabado."""
    return await products_service.create_acabado(data, user_name=user.get("name", "system"))


@router.put("/acabados/{acabado_id}", response_model=AcabadoItem)
async def update_acabado(
    acabado_id: str,
    data: AcabadoUpdateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Update an existing acabado (App-owned fields only)."""
    result = await products_service.update_acabado(
        acabado_id, data, user_name=user.get("name", "system")
    )
    if not result:
        raise HTTPException(status_code=404, detail="Acabado no encontrado")
    return result


@router.post("/acabados/bulk")
async def bulk_acabado_action(
    action_data: AcabadoBulkActionRequest,
    user=Depends(require_permissions(["products"])),
):
    """Execute a bulk action on acabados."""
    return await products_service.bulk_acabado_action(
        action_data, user_name=user.get("name", "system")
    )


# ── Generic Product Attributes ──

@router.get("/attributes/{dimension}", response_model=AttributeListResponse)
async def list_attributes(
    dimension: str,
    product_type: Optional[str] = Query(None, description="Filter by product type"),
    search: Optional[str] = Query(None, description="Search filter"),
    status: Optional[str] = Query(None, description="Filter by status"),
    enrichment: Optional[str] = Query(None, description="Filter by enrichment status"),
    user=Depends(require_permissions(["products"])),
):
    """List attribute values for a dimension (temple, aleacion, etc.)."""
    return await products_service.get_attributes(
        dimension=dimension, product_type=product_type,
        search=search, status=status, enrichment=enrichment,
    )


@router.get("/attributes/{dimension}/filters")
async def get_attribute_filters(
    dimension: str,
    product_type: Optional[str] = Query(None),
    user=Depends(require_permissions(["products"])),
):
    """Get distinct filter values for an attribute dimension."""
    return await products_service.get_attribute_filter_options(dimension, product_type)


@router.get("/attributes/{dimension}/{attribute_id}", response_model=AttributeItem)
async def get_attribute(
    dimension: str,
    attribute_id: str,
    user=Depends(require_permissions(["products"])),
):
    """Get a single attribute with changelog."""
    result = await products_service.get_attribute_by_id(dimension, attribute_id)
    if not result:
        raise HTTPException(status_code=404, detail="Atributo no encontrado")
    return result


@router.post("/attributes/{dimension}", response_model=AttributeItem)
async def create_attribute(
    dimension: str,
    data: AttributeCreateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Create a new product attribute."""
    return await products_service.create_attribute(
        dimension, data, user_name=user.get("name", "system")
    )


@router.put("/attributes/{dimension}/{attribute_id}", response_model=AttributeItem)
async def update_attribute(
    dimension: str,
    attribute_id: str,
    data: AttributeUpdateRequest,
    user=Depends(require_permissions(["products"])),
):
    """Update an existing product attribute."""
    result = await products_service.update_attribute(
        dimension, attribute_id, data, user_name=user.get("name", "system")
    )
    if not result:
        raise HTTPException(status_code=404, detail="Atributo no encontrado")
    return result


@router.post("/attributes/{dimension}/bulk")
async def bulk_attribute_action(
    dimension: str,
    action_data: AttributeBulkActionRequest,
    user=Depends(require_permissions(["products"])),
):
    """Execute bulk action on product attributes."""
    return await products_service.bulk_attribute_action(
        dimension, action_data, user_name=user.get("name", "system")
    )


# ── Dashboard Summary ──

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(user=Depends(require_permissions(["products"]))):
    """Get KPIs for the products dashboard."""
    return await products_service.get_dashboard_summary()


# ── Base Products ──

@router.get("/base", response_model=ProductBaseListResponse)
async def list_base_products(
    search: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    sistema: Optional[str] = Query(None),
    product_type: Optional[str] = Query(None),
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
        categoria=categoria,
        subcategory=subcategory,
        sistema=sistema,
        product_type=product_type,
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


@router.put("/base/{product_id}/technical-specs")
async def update_technical_specs(
    product_id: int,
    body: ProductUpdateTechnicalSpecs,
    user=Depends(require_permissions(["products"])),
):
    """Save technical specs (JSONB) for a base product."""
    try:
        updated = await products_service.update_technical_specs(product_id, body.technicalSpecs)
        return {"technicalSpecs": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


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
