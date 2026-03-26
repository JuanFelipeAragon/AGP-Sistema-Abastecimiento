"""
Products Service — Business logic backed by Supabase normalized tables.

Tables used:
  - products           (base products)
  - product_variants   (SIESA references with acabado/aleacion/length)
  - product_warehouse  (per-variant per-bodega financials)
  - warehouses         (normalized bodegas)
  - classifications    (dimension value normalization)
"""
import logging
import uuid
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from app.config import get_supabase_client
from app.modules.products.schemas import (
    SKUListParams,
    SKUResponse,
    SKUListResponse,
    ClassificationItem,
    ClassificationStats,
    ClassificationListResponse,
    ClassificationCreateRequest,
    ClassificationUpdateRequest,
    ClassificationStatus,
    BulkActionRequest,
    AcabadoItem,
    AcabadoListResponse,
    DashboardSummaryResponse,
    ChangeLogEntry,
    ProductBaseListParams,
    ProductBaseItem,
    ProductBaseListResponse,
    ProductBaseDetailResponse,
    WarehouseRecordListParams,
    WarehouseRecordItem,
    WarehouseRecordListResponse,
    ProductsSummaryResponse,
)

logger = logging.getLogger("agp.products")


def _sb():
    """Get Supabase client, raise if not available."""
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client not configured")
    return client


# Dimension name mapping: API dimension -> DB dimension
DIM_MAP = {
    "categorias": "categoria",
    "subcategorias": "subcategoria",
    "sistemas": "sistema",
    "lineas": "linea",
    "aleaciones": "aleacion",
}


class ProductsService:
    """Service layer for Products module — all data from Supabase."""

    # ── SKU Methods ──

    async def get_skus(self, params: SKUListParams) -> SKUListResponse:
        """Get filtered, sorted, paginated product variants with their base product data."""
        sb = _sb()

        # Build query joining variants with products
        query = sb.table("product_variants").select(
            "id, reference_siesa, item_id, acabado_name, acabado_code, aleacion, "
            "longitud_m, status, flag_compra, flag_venta, "
            "fecha_creacion_siesa, "
            "product:products!inner(id, reference, description, categoria_raw, "
            "subcategoria_raw, sistema_raw, linea_raw, peso_um, is_profile)"
        )

        # Apply filters via product fields
        if params.category:
            query = query.eq("product.categoria_raw", params.category)
        if params.subcategory:
            query = query.eq("product.subcategoria_raw", params.subcategory)
        if params.sistema:
            query = query.eq("product.sistema_raw", params.sistema)
        if params.linea:
            query = query.eq("product.linea_raw", params.linea)
        if params.acabado:
            query = query.eq("acabado_name", params.acabado)

        if params.search:
            s = params.search
            # PostgREST can't filter on joined fields inside or_(),
            # so search only on variant's own reference_siesa
            query = query.ilike("reference_siesa", f"%{s}%")

        # Sort
        sort_field = params.sort_field or "reference_siesa"
        sort_desc = params.sort_order.value == "desc"

        # Map frontend sort fields to DB columns
        sort_map = {
            "ref": "reference_siesa",
            "desc": "product.description",
            "acabado": "acabado_name",
            "cost": "reference_siesa",  # cost is in warehouse table, sort by ref for now
        }
        db_sort = sort_map.get(sort_field, sort_field)
        query = query.order(db_sort, desc=sort_desc)

        # Pagination
        offset = (params.page - 1) * params.page_size
        query = query.range(offset, offset + params.page_size - 1)

        result = query.execute()
        rows = result.data or []

        # For total count: use the count from the main query if available,
        # otherwise estimate from returned rows
        # Note: Supabase returns count header when using count="exact" but
        # the join query doesn't support it cleanly, so we do a separate count
        total = len(rows)
        if len(rows) == params.page_size:
            # Might have more pages - do a count query
            count_q = sb.table("product_variants").select("id", count="exact")
            if params.acabado:
                count_q = count_q.eq("acabado_name", params.acabado)
            if params.search:
                count_q = count_q.ilike("reference_siesa", f"%{params.search}%")
            count_result = count_q.execute()
            total = count_result.count if count_result.count is not None else len(rows)

        # Transform to SKUResponse format
        items = []
        for row in rows:
            product = row.get("product", {}) or {}
            items.append(SKUResponse(
                ref=row.get("reference_siesa", ""),
                desc=product.get("description", ""),
                cat=product.get("categoria_raw"),
                sub=product.get("subcategoria_raw"),
                sys=product.get("sistema_raw"),
                lin=product.get("linea_raw"),
                acabado=row.get("acabado_name"),
                codAcabado=row.get("acabado_code"),
                aleacion=row.get("aleacion"),
                wt=float(product.get("peso_um") or 0),
                fCreacion=row.get("fecha_creacion_siesa"),
                status="Activo" if row.get("status") == "active" else "Inactivo",
            ))

        return SKUListResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def get_sku_by_ref(self, ref: str) -> Optional[SKUResponse]:
        """Get a single variant by its SIESA reference."""
        sb = _sb()
        result = sb.table("product_variants").select(
            "*, product:products(*, )"
        ).eq("reference_siesa", ref).maybe_single().execute()

        if not result.data:
            return None

        row = result.data
        product = row.get("product", {}) or {}

        # Also get warehouse data for this variant
        pw_result = sb.table("product_warehouse").select(
            "costo_promedio, costo_promedio_total, precio_unitario, "
            "warehouse:warehouses(name)"
        ).eq("variant_id", row["id"]).execute()

        pw_rows = pw_result.data or []
        total_cost = sum(float(pw.get("costo_promedio_total") or 0) for pw in pw_rows)
        avg_unit_cost = float(pw_rows[0].get("costo_promedio") or 0) if pw_rows else 0

        return SKUResponse(
            ref=row.get("reference_siesa", ""),
            desc=product.get("description", ""),
            cat=product.get("categoria_raw"),
            sub=product.get("subcategoria_raw"),
            sys=product.get("sistema_raw"),
            lin=product.get("linea_raw"),
            acabado=row.get("acabado_name"),
            codAcabado=row.get("acabado_code"),
            aleacion=row.get("aleacion"),
            cost=avg_unit_cost,
            wt=float(product.get("peso_um") or 0),
            valInv=total_cost,
            nBod=len(pw_rows),
            fCreacion=row.get("fecha_creacion_siesa"),
            status="Activo" if row.get("status") == "active" else "Inactivo",
        )

    # ── Classification Methods ──

    async def get_classifications(
        self, dimension: str, search: Optional[str] = None
    ) -> ClassificationListResponse:
        """Get all classification items for a dimension from Supabase."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)

        query = sb.table("classifications").select("*").eq("dimension", db_dim)

        if search:
            query = query.or_(
                f"original_value.ilike.%{search}%,normalized_value.ilike.%{search}%"
            )

        query = query.order("normalized_value")
        result = query.execute()
        rows = result.data or []

        items = []
        for row in rows:
            items.append(ClassificationItem(
                id=str(row["id"]),
                originalValue=row["original_value"],
                normalizedValue=row["normalized_value"],
                status=ClassificationStatus(row.get("status", "active")),
                skuCount=row.get("sku_count", 0),
                isEdited=row.get("original_value") != row.get("normalized_value"),
                createdAt=row.get("created_at"),
                updatedAt=row.get("updated_at"),
                createdBy=row.get("created_by"),
            ))

        active = sum(1 for it in items if it.status == ClassificationStatus.active)
        edited = sum(1 for it in items if it.isEdited)

        return ClassificationListResponse(
            items=items,
            stats=ClassificationStats(
                total=len(items),
                edited=edited,
                active=active,
                inactive=len(items) - active,
            ),
        )

    async def create_classification(
        self, dimension: str, data: ClassificationCreateRequest
    ) -> ClassificationItem:
        """Create a new classification value in Supabase."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)

        record = {
            "dimension": db_dim,
            "original_value": data.originalValue,
            "normalized_value": data.normalizedValue,
            "status": "active",
            "created_by": "user",
        }
        result = sb.table("classifications").insert(record).execute()
        row = result.data[0]

        return ClassificationItem(
            id=str(row["id"]),
            originalValue=row["original_value"],
            normalizedValue=row["normalized_value"],
            status=ClassificationStatus.active,
            skuCount=0,
            createdAt=row.get("created_at"),
        )

    async def update_classification(
        self, dimension: str, original_value: str, data: ClassificationUpdateRequest
    ) -> Optional[ClassificationItem]:
        """Update an existing classification value in Supabase."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)

        updates = {}
        if data.normalizedValue is not None:
            updates["normalized_value"] = data.normalizedValue
        if data.status is not None:
            updates["status"] = data.status.value

        if not updates:
            return None

        result = sb.table("classifications").update(updates).eq(
            "dimension", db_dim
        ).eq("original_value", original_value).execute()

        if not result.data:
            return None

        row = result.data[0]
        return ClassificationItem(
            id=str(row["id"]),
            originalValue=row["original_value"],
            normalizedValue=row["normalized_value"],
            status=ClassificationStatus(row.get("status", "active")),
            skuCount=row.get("sku_count", 0),
            isEdited=row.get("original_value") != row.get("normalized_value"),
            updatedAt=row.get("updated_at"),
        )

    async def bulk_classification_action(
        self, dimension: str, action_data: BulkActionRequest
    ) -> dict:
        """Handle bulk actions on classifications in Supabase."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)
        affected = 0

        if action_data.action.value == "rename" and action_data.newValue:
            for ov in action_data.ids:
                sb.table("classifications").update(
                    {"normalized_value": action_data.newValue}
                ).eq("dimension", db_dim).eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "merge" and action_data.newValue:
            for ov in action_data.ids:
                sb.table("classifications").update(
                    {"normalized_value": action_data.newValue}
                ).eq("dimension", db_dim).eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "inactivate":
            for ov in action_data.ids:
                sb.table("classifications").update(
                    {"status": "inactive"}
                ).eq("dimension", db_dim).eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "delete":
            for ov in action_data.ids:
                sb.table("classifications").delete().eq(
                    "dimension", db_dim
                ).eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "export":
            affected = len(action_data.ids)

        return {
            "action": action_data.action.value,
            "affected": affected,
            "message": f"Accion '{action_data.action.value}' aplicada a {affected} elementos",
        }

    # ── Acabado Methods ──

    async def get_acabados(self, search: Optional[str] = None) -> AcabadoListResponse:
        """Get all acabados from classifications table."""
        sb = _sb()
        query = sb.table("classifications").select("*").eq("dimension", "acabado")

        if search:
            query = query.or_(
                f"original_value.ilike.%{search}%,normalized_value.ilike.%{search}%,code.ilike.%{search}%"
            )

        query = query.order("normalized_value")
        result = query.execute()
        rows = result.data or []

        items = []
        for row in rows:
            items.append(AcabadoItem(
                id=str(row["id"]),
                originalValue=row["original_value"],
                normalizedValue=row["normalized_value"],
                code=row.get("code"),
                status=ClassificationStatus(row.get("status", "active")),
                skuCount=row.get("sku_count", 0),
                isEdited=row.get("original_value") != row.get("normalized_value"),
                createdAt=row.get("created_at"),
                updatedAt=row.get("updated_at"),
            ))

        active = sum(1 for it in items if it.status == ClassificationStatus.active)
        edited = sum(1 for it in items if it.isEdited)

        return AcabadoListResponse(
            items=items,
            stats=ClassificationStats(
                total=len(items),
                edited=edited,
                active=active,
                inactive=len(items) - active,
            ),
        )

    async def create_acabado(self, data: ClassificationCreateRequest) -> AcabadoItem:
        """Create a new acabado in Supabase."""
        sb = _sb()
        record = {
            "dimension": "acabado",
            "original_value": data.originalValue,
            "normalized_value": data.normalizedValue,
            "status": "active",
            "created_by": "user",
        }
        result = sb.table("classifications").insert(record).execute()
        row = result.data[0]

        return AcabadoItem(
            id=str(row["id"]),
            originalValue=row["original_value"],
            normalizedValue=row["normalized_value"],
            code=row.get("code"),
            status=ClassificationStatus.active,
            skuCount=0,
            createdAt=row.get("created_at"),
        )

    async def update_acabado(
        self, original_value: str, data: ClassificationUpdateRequest
    ) -> Optional[AcabadoItem]:
        """Update an existing acabado in Supabase."""
        sb = _sb()
        updates = {}
        if data.normalizedValue is not None:
            updates["normalized_value"] = data.normalizedValue
        if data.status is not None:
            updates["status"] = data.status.value

        if not updates:
            return None

        result = sb.table("classifications").update(updates).eq(
            "dimension", "acabado"
        ).eq("original_value", original_value).execute()

        if not result.data:
            return None

        row = result.data[0]
        return AcabadoItem(
            id=str(row["id"]),
            originalValue=row["original_value"],
            normalizedValue=row["normalized_value"],
            code=row.get("code"),
            status=ClassificationStatus(row.get("status", "active")),
            skuCount=row.get("sku_count", 0),
            isEdited=row.get("original_value") != row.get("normalized_value"),
            updatedAt=row.get("updated_at"),
        )

    async def bulk_acabado_action(self, action_data: BulkActionRequest) -> dict:
        """Handle bulk actions on acabados."""
        sb = _sb()
        affected = 0

        if action_data.action.value in ("rename", "merge") and action_data.newValue:
            for ov in action_data.ids:
                sb.table("classifications").update(
                    {"normalized_value": action_data.newValue}
                ).eq("dimension", "acabado").eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "inactivate":
            for ov in action_data.ids:
                sb.table("classifications").update(
                    {"status": "inactive"}
                ).eq("dimension", "acabado").eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "delete":
            for ov in action_data.ids:
                sb.table("classifications").delete().eq(
                    "dimension", "acabado"
                ).eq("original_value", ov).execute()
                affected += 1

        elif action_data.action.value == "export":
            affected = len(action_data.ids)

        return {
            "action": action_data.action.value,
            "affected": affected,
            "message": f"Accion '{action_data.action.value}' aplicada a {affected} acabados",
        }

    # ── Dashboard Summary ──

    async def get_dashboard_summary(self) -> DashboardSummaryResponse:
        """Get KPIs from Supabase."""
        sb = _sb()

        # Count products
        products_result = sb.table("products").select("id", count="exact").execute()
        total_products = products_result.count or 0

        # Count variants
        variants_result = sb.table("product_variants").select("id", count="exact").execute()
        total_variants = variants_result.count or 0

        # Count classifications
        cats = sb.table("classifications").select("id", count="exact").eq("dimension", "categoria").execute()
        subs = sb.table("classifications").select("id", count="exact").eq("dimension", "subcategoria").execute()
        acabados = sb.table("classifications").select("id", count="exact").eq("dimension", "acabado").execute()

        # Count warehouses
        wh = sb.table("warehouses").select("id", count="exact").execute()

        return DashboardSummaryResponse(
            total_skus=total_variants,
            total_with_stock=total_products,
            categories_count=cats.count or 0,
            subcategories_count=subs.count or 0,
            acabados_count=acabados.count or 0,
        )

    # ── Base Products ──

    async def get_base_products(self, params: ProductBaseListParams) -> ProductBaseListResponse:
        """Get paginated list of base products with variant counts."""
        sb = _sb()

        # Build main query
        query = sb.table("products").select(
            "id, reference, description, subcategoria_raw, sistema_raw, "
            "linea_raw, peso_um, is_profile, status",
            count="exact",
        )

        # Apply filters
        if params.search:
            s = params.search
            query = query.or_(f"reference.ilike.%{s}%,description.ilike.%{s}%")
        if params.subcategory:
            query = query.eq("subcategoria_raw", params.subcategory)
        if params.sistema:
            query = query.eq("sistema_raw", params.sistema)
        if params.is_profile is not None:
            query = query.eq("is_profile", params.is_profile)
        if params.status:
            query = query.eq("status", params.status)

        # Sort
        sort_map = {
            "reference": "reference",
            "description": "description",
            "subcategoria": "subcategoria_raw",
            "sistema": "sistema_raw",
            "pesoUm": "peso_um",
        }
        sort_field = sort_map.get(params.sort_field, params.sort_field) if params.sort_field else "reference"
        sort_desc = params.sort_order.value == "desc"
        query = query.order(sort_field, desc=sort_desc)

        # Pagination
        offset = (params.page - 1) * params.page_size
        query = query.range(offset, offset + params.page_size - 1)

        result = query.execute()
        rows = result.data or []
        total = result.count if result.count is not None else len(rows)

        # Get variant counts for the returned product IDs in one query
        product_ids = [r["id"] for r in rows]
        variant_counts: dict = {}
        if product_ids:
            vc_result = sb.table("product_variants").select(
                "product_id"
            ).in_("product_id", product_ids).execute()
            vc_rows = vc_result.data or []
            variant_counts = Counter(r["product_id"] for r in vc_rows)

        items = []
        for row in rows:
            items.append(ProductBaseItem(
                id=row["id"],
                reference=row.get("reference", ""),
                description=row.get("description"),
                subcategoria=row.get("subcategoria_raw"),
                sistema=row.get("sistema_raw"),
                linea=row.get("linea_raw"),
                pesoUm=float(row.get("peso_um") or 0),
                isProfile=bool(row.get("is_profile")),
                variantCount=variant_counts.get(row["id"], 0),
                status="Activo" if row.get("status") == "active" else "Inactivo",
            ))

        return ProductBaseListResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def get_base_product_detail(self, product_id: int) -> Optional[ProductBaseDetailResponse]:
        """Get a single base product with its variants."""
        sb = _sb()

        result = sb.table("products").select("*").eq("id", product_id).maybe_single().execute()
        if not result.data:
            return None

        row = result.data

        # Get variants for this product
        variants_result = sb.table("product_variants").select(
            "id, reference_siesa, item_id, acabado_name, acabado_code, "
            "aleacion, longitud_m, status, flag_compra, flag_venta, fecha_creacion_siesa"
        ).eq("product_id", product_id).order("reference_siesa").execute()
        variants = variants_result.data or []

        return ProductBaseDetailResponse(
            id=row["id"],
            reference=row.get("reference", ""),
            description=row.get("description"),
            categoria=row.get("categoria_raw"),
            subcategoria=row.get("subcategoria_raw"),
            sistema=row.get("sistema_raw"),
            linea=row.get("linea_raw"),
            pesoUm=float(row.get("peso_um") or 0),
            isProfile=bool(row.get("is_profile")),
            variantCount=len(variants),
            status="Activo" if row.get("status") == "active" else "Inactivo",
            variants=variants,
        )

    # ── Warehouse Records ──

    async def get_warehouse_records(self, params: WarehouseRecordListParams) -> WarehouseRecordListResponse:
        """Get paginated product_warehouse records with joined variant and warehouse data."""
        sb = _sb()

        # If search is provided, first find matching variant IDs
        variant_id_filter: Optional[list] = None
        if params.search:
            s = params.search
            vr = sb.table("product_variants").select("id").ilike(
                "reference_siesa", f"%{s}%"
            ).execute()
            variant_id_filter = [v["id"] for v in (vr.data or [])]
            if not variant_id_filter:
                # No matching variants — return empty
                return WarehouseRecordListResponse(
                    items=[], total=0, page=params.page, page_size=params.page_size
                )

        # Build main query with joins
        query = sb.table("product_warehouse").select(
            "id, costo_promedio, precio_unitario, costo_promedio_total, "
            "abc_rotacion_costo, abc_rotacion_costo_bod, abc_rotacion_veces, abc_rotacion_veces_bod, "
            "fecha_ultima_venta, fecha_ultima_entrada, fecha_ultima_salida, fecha_ultima_compra, "
            "variant_id, warehouse_id, "
            "variant:product_variants!inner(reference_siesa, product:products!inner(description)), "
            "warehouse:warehouses!inner(name, city)",
            count="exact",
        )

        # Apply filters
        if variant_id_filter is not None:
            query = query.in_("variant_id", variant_id_filter)
        if params.warehouse_id:
            query = query.eq("warehouse_id", params.warehouse_id)
        if params.abc_rotacion_costo:
            query = query.eq("abc_rotacion_costo", params.abc_rotacion_costo)
        if params.variant_id:
            query = query.eq("variant_id", params.variant_id)

        # Sort
        sort_map = {
            "refSiesa": "variant_id",
            "bodega": "warehouse_id",
            "costoPromedio": "costo_promedio",
            "precioUnitario": "precio_unitario",
            "costoTotal": "costo_promedio_total",
            "abcRotacionCosto": "abc_rotacion_costo",
            "fUltimaVenta": "fecha_ultima_venta",
        }
        sort_field = sort_map.get(params.sort_field, params.sort_field) if params.sort_field else "id"
        sort_desc = params.sort_order.value == "desc"
        query = query.order(sort_field, desc=sort_desc)

        # Pagination
        offset = (params.page - 1) * params.page_size
        query = query.range(offset, offset + params.page_size - 1)

        result = query.execute()
        rows = result.data or []
        total = result.count if result.count is not None else len(rows)

        items = []
        for row in rows:
            variant = row.get("variant", {}) or {}
            product = variant.get("product", {}) or {}
            warehouse = row.get("warehouse", {}) or {}

            items.append(WarehouseRecordItem(
                id=row["id"],
                refSiesa=variant.get("reference_siesa", ""),
                descProducto=product.get("description"),
                bodega=warehouse.get("name", ""),
                ciudad=warehouse.get("city"),
                costoPromedio=float(row.get("costo_promedio") or 0),
                precioUnitario=float(row.get("precio_unitario") or 0),
                costoTotal=float(row.get("costo_promedio_total") or 0),
                abcRotacionCosto=row.get("abc_rotacion_costo"),
                abcRotacionCostoBod=row.get("abc_rotacion_costo_bod"),
                abcRotacionVeces=row.get("abc_rotacion_veces"),
                abcRotacionVecesBod=row.get("abc_rotacion_veces_bod"),
                fUltimaVenta=row.get("fecha_ultima_venta"),
                fUltimaEntrada=row.get("fecha_ultima_entrada"),
                fUltimaSalida=row.get("fecha_ultima_salida"),
                fUltimaCompra=row.get("fecha_ultima_compra"),
            ))

        return WarehouseRecordListResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    # ── Enhanced Summary ──

    async def get_products_summary(self) -> ProductsSummaryResponse:
        """Get comprehensive KPIs across products, variants, and warehouse records."""
        sb = _sb()

        # ── Products counts ──
        products_total_r = sb.table("products").select("id", count="exact").execute()
        products_total = products_total_r.count or 0

        profiles_r = sb.table("products").select("id", count="exact").eq("is_profile", True).execute()
        profiles_count = profiles_r.count or 0
        accessories_count = products_total - profiles_count

        # Products without variants: total products minus distinct product_ids in variants
        distinct_pids_r = sb.table("product_variants").select("product_id").execute()
        distinct_pids = set(r["product_id"] for r in (distinct_pids_r.data or []))
        without_variants = products_total - len(distinct_pids)

        # ── Variants counts ──
        variants_total_r = sb.table("product_variants").select("id", count="exact").execute()
        variants_total = variants_total_r.count or 0

        variants_active_r = sb.table("product_variants").select("id", count="exact").eq("status", "active").execute()
        variants_active = variants_active_r.count or 0
        variants_inactive = variants_total - variants_active

        # Variants without warehouse record
        distinct_vids_r = sb.table("product_warehouse").select("variant_id").execute()
        distinct_vids = set(r["variant_id"] for r in (distinct_vids_r.data or []))
        without_warehouse = variants_total - len(distinct_vids)

        # ── Warehouse counts ──
        wh_total_r = sb.table("product_warehouse").select("id", count="exact").execute()
        wh_total_records = wh_total_r.count or 0

        # Total inventory value: sum costo_promedio_total
        inv_r = sb.table("product_warehouse").select("costo_promedio_total").execute()
        inv_rows = inv_r.data or []
        total_inventory_value = sum(float(r.get("costo_promedio_total") or 0) for r in inv_rows)

        # Active bodegas (distinct warehouse_ids in product_warehouse)
        wh_ids = set(r["variant_id"] for r in (distinct_vids_r.data or []))  # reuse query
        # Actually need distinct warehouse_ids
        distinct_whids_r = sb.table("product_warehouse").select("warehouse_id").execute()
        active_bodegas = len(set(r["warehouse_id"] for r in (distinct_whids_r.data or [])))

        # No sales in 6 months: fecha_ultima_venta is null or < 6 months ago
        six_months_ago = (datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%d")
        no_sales_null_r = sb.table("product_warehouse").select("id", count="exact").is_(
            "fecha_ultima_venta", "null"
        ).execute()
        no_sales_null = no_sales_null_r.count or 0

        no_sales_old_r = sb.table("product_warehouse").select("id", count="exact").lt(
            "fecha_ultima_venta", six_months_ago
        ).execute()
        no_sales_old = no_sales_old_r.count or 0
        no_sales_6m = no_sales_null + no_sales_old

        return ProductsSummaryResponse(
            products={
                "total": products_total,
                "profiles": profiles_count,
                "accessories": accessories_count,
                "withoutVariants": without_variants,
            },
            variants={
                "total": variants_total,
                "active": variants_active,
                "inactive": variants_inactive,
                "withoutWarehouse": without_warehouse,
            },
            warehouse={
                "totalRecords": wh_total_records,
                "totalInventoryValue": round(total_inventory_value, 2),
                "activeBodegas": active_bodegas,
                "noSales6m": no_sales_6m,
            },
        )

    # ── Warehouses List ──

    async def get_warehouses(self):
        """Get list of active warehouses for filter dropdowns."""
        sb = _sb()
        result = sb.table("warehouses").select("id, name, city").eq(
            "is_active", True
        ).order("name").execute()
        return {"items": result.data or []}


# ── Singleton instance ──
products_service = ProductsService()
