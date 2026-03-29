"""
Products Service — Business logic backed by Supabase normalized tables.

Tables used:
  - products           (base products)
  - product_variants   (SIESA references with acabado/aleacion/length)
  - product_warehouse  (per-variant per-bodega financials)
  - warehouses         (normalized bodegas)
  - classifications    (dimension value normalization)
"""
import asyncio
import logging
import uuid
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
    AcabadoStats,
    AcabadoListResponse,
    AcabadoCreateRequest,
    AcabadoUpdateRequest,
    AcabadoBulkActionRequest,
    AcabadoStatus,
    AcabadoEnrichmentStatus,
    DashboardSummaryResponse,
    ChangeLogEntry,
    ProductBaseListParams,
    ProductBaseItem,
    ProductBaseListResponse,
    ProductBaseTypeCounts,
    ProductBaseDetailResponse,
    WarehouseRecordListParams,
    WarehouseRecordItem,
    WarehouseRecordListResponse,
    ProductsSummaryResponse,
    TypeAttributeConfig,
    ProductTypeConfigResponse,
    AttributeItem,
    AttributeStats,
    AttributeListResponse,
    AttributeCreateRequest,
    AttributeUpdateRequest,
    AttributeBulkActionRequest,
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

    # ── Classification Lookup Helper ──

    async def _get_classification_maps(self) -> dict[str, dict[str, str]]:
        """Build {dimension: {original_value: normalized_value}} maps for display.

        Returns maps for categoria, subcategoria, and sistema dimensions.
        Includes ALL statuses — display mapping should work regardless of
        whether the classification is active or inactive.
        """
        sb = _sb()
        result = sb.table("classifications").select(
            "dimension, original_value, normalized_value"
        ).in_(
            "dimension", ["categoria", "subcategoria", "sistema"]
        ).execute()

        maps: dict[str, dict[str, str]] = {
            "categoria": {},
            "subcategoria": {},
            "sistema": {},
        }
        for row in (result.data or []):
            dim = row["dimension"]
            if dim in maps:
                maps[dim][row["original_value"]] = row["normalized_value"]
        return maps

    def _normalize(
        self, raw_value: Optional[str], lookup: dict[str, str]
    ) -> Optional[str]:
        """Return normalized name for a raw value, fallback to raw if no mapping."""
        if not raw_value:
            return None
        return lookup.get(raw_value, raw_value)

    async def _reverse_lookup(self, dimension: str, normalized: str) -> Optional[str]:
        """Find the original_value for a given normalized_value."""
        sb = _sb()
        result = sb.table("classifications").select("original_value").eq(
            "dimension", dimension
        ).eq("normalized_value", normalized).limit(1).execute()
        if result.data:
            return result.data[0]["original_value"]
        return normalized  # fallback: maybe it's already the raw value

    # ── Product Type Config ──

    async def get_type_config(self) -> ProductTypeConfigResponse:
        """Get attribute configuration for all product types."""
        sb = _sb()
        result = sb.table("product_type_config").select("*").order("sort_order").execute()

        config: dict[str, list[TypeAttributeConfig]] = {}
        for row in (result.data or []):
            pt = row["product_type"]
            if pt not in config:
                config[pt] = []
            config[pt].append(TypeAttributeConfig(
                key=row["attribute_key"],
                label=row["label"],
                visible=row.get("visible", True),
                required=row.get("required", False),
                sortOrder=row.get("sort_order", 0),
            ))

        return ProductTypeConfigResponse(config=config)

    async def get_subcategoria_type_map(self) -> dict[str, str]:
        """Get mapping of subcategoria_raw → product_type from products table.

        Uses individual count queries per known type to avoid Supabase row limits.
        """
        sb = _sb()
        # Query each product_type to get its subcategorias
        mapping: dict[str, str] = {}
        for pt in ["Perfil", "Lamina", "Escalera", "Accesorio", "Otro"]:
            result = sb.table("products").select(
                "subcategoria_raw"
            ).eq("product_type", pt).not_.is_(
                "subcategoria_raw", "null"
            ).limit(200).execute()
            for row in (result.data or []):
                sr = row.get("subcategoria_raw")
                if sr and sr not in mapping:
                    mapping[sr] = pt
        return mapping

    # ── SKU Filter Options (Cascading) ──

    async def get_sku_filter_options(
        self,
        subcategory: Optional[str] = None,
        acabado: Optional[str] = None,
        temple: Optional[str] = None,
        aleacion_code: Optional[str] = None,
        longitud: Optional[float] = None,
    ) -> dict:
        """Get available filter values for SKUs based on current filter state.

        Returns only values that exist in the filtered dataset — enables cascading filters.
        """
        sb = _sb()

        # Build a base query with current filters applied
        query = sb.table("product_variants").select(
            "temple, aleacion_code, longitud_m, "
            "acabado:acabados!left(nombre), "
            "product:products!inner(subcategoria_raw)"
        )

        # Apply filters progressively
        if subcategory:
            raw = await self._reverse_lookup("subcategoria", subcategory)
            query = query.eq("product.subcategoria_raw", raw)
        if temple:
            query = query.eq("temple", temple)
        if aleacion_code:
            query = query.eq("aleacion_code", aleacion_code)
        if longitud is not None:
            query = query.eq("longitud_m", longitud)

        # Note: acabado filter via PostgREST join is unreliable for filtering,
        # so we filter acabado in Python after fetching
        query = query.limit(2000)  # Get enough rows for distinct values
        result = query.execute()
        rows = result.data or []

        # If acabado filter is set, filter in Python
        if acabado:
            rows = [r for r in rows if (r.get("acabado") or {}).get("nombre") == acabado]

        # Count frequencies for each attribute — sorted by most frequent first
        from collections import Counter
        acabados_ctr: Counter = Counter()
        temples_ctr: Counter = Counter()
        aleaciones_ctr: Counter = Counter()
        longitudes_ctr: Counter = Counter()

        for row in rows:
            acab = (row.get("acabado") or {}).get("nombre")
            if acab:
                acabados_ctr[acab] += 1
            t = row.get("temple")
            if t:
                temples_ctr[t] += 1
            ac = row.get("aleacion_code")
            if ac:
                aleaciones_ctr[ac] += 1
            lng = row.get("longitud_m")
            if lng is not None:
                longitudes_ctr[str(float(lng))] += 1

        def to_ranked(counter: Counter) -> list[dict]:
            """Convert Counter to [{value, count}] sorted by frequency desc."""
            return [{"value": val, "count": cnt} for val, cnt in counter.most_common()]

        return {
            "acabados": to_ranked(acabados_ctr),
            "temples": to_ranked(temples_ctr),
            "aleaciones": to_ranked(aleaciones_ctr),
            "longitudes": to_ranked(longitudes_ctr),
        }

    # ── SKU Methods ──

    async def get_skus(self, params: SKUListParams) -> SKUListResponse:
        """Get filtered, sorted, paginated product variants with their base product data."""
        sb = _sb()

        # Build query joining variants with products + acabados
        query = sb.table("product_variants").select(
            "id, reference_siesa, item_id, acabado_id, aleacion, temple, aleacion_code, "
            "longitud_m, status, flag_compra, flag_venta, "
            "fecha_creacion_siesa, subcategoria_raw, categoria_raw, sistema_raw, linea_raw, "
            "acabado:acabados(id, codigo, nombre_siesa, nombre), "
            "product:products!inner(id, reference, description, categoria_raw, "
            "subcategoria_raw, sistema_raw, linea_raw, peso_um, is_profile, product_type)",
            count="exact",
        )

        # Helper: split comma-separated multi-select values
        def split_multi(val: Optional[str]) -> list[str]:
            if not val:
                return []
            return [v.strip() for v in val.split(",") if v.strip()]

        # Apply filters — support both single and comma-separated multi-select
        if params.category:
            vals = split_multi(params.category)
            raws = [await self._reverse_lookup("categoria", v) for v in vals]
            query = query.in_("product.categoria_raw", raws) if len(raws) > 1 else query.eq("product.categoria_raw", raws[0])
        if params.subcategory:
            vals = split_multi(params.subcategory)
            raws = [await self._reverse_lookup("subcategoria", v) for v in vals]
            # Use variant-level subcategoria_raw (more accurate than product-level)
            query = query.in_("subcategoria_raw", raws) if len(raws) > 1 else query.eq("subcategoria_raw", raws[0])
        if params.sistema:
            vals = split_multi(params.sistema)
            raws = [await self._reverse_lookup("sistema", v) for v in vals]
            query = query.in_("product.sistema_raw", raws) if len(raws) > 1 else query.eq("product.sistema_raw", raws[0])
        if params.linea:
            query = query.eq("product.linea_raw", params.linea)
        if params.acabado:
            vals = split_multi(params.acabado)
            acab_result = sb.table("acabados").select("id").in_("nombre", vals).execute()
            acab_ids = [str(r["id"]) for r in (acab_result.data or [])]
            if acab_ids:
                query = query.in_("acabado_id", acab_ids)
            else:
                return SKUListResponse(items=[], total=0, page=params.page, page_size=params.page_size)
        if params.temple:
            vals = split_multi(params.temple)
            query = query.in_("temple", vals) if len(vals) > 1 else query.eq("temple", vals[0])
        if params.aleacion_code:
            vals = split_multi(params.aleacion_code)
            query = query.in_("aleacion_code", vals) if len(vals) > 1 else query.eq("aleacion_code", vals[0])
        if params.longitud is not None:
            query = query.eq("longitud_m", params.longitud)
        if params.longitud_min is not None:
            query = query.gte("longitud_m", params.longitud_min)
        if params.longitud_max is not None:
            query = query.lte("longitud_m", params.longitud_max)
        if params.status:
            db_status = "active" if params.status == "Activo" else "inactive"
            query = query.eq("status", db_status)

        if params.search:
            s = params.search
            query = query.ilike("reference_siesa", f"%{s}%")

        # Sort
        sort_field = params.sort_field or "reference_siesa"
        sort_desc = params.sort_order.value == "desc"

        sort_map = {
            "ref": "reference_siesa",
            "desc": "product.description",
            "acabado": "reference_siesa",
            "temple": "temple",
            "aleacionCode": "aleacion_code",
        }
        db_sort = sort_map.get(sort_field, sort_field)
        query = query.order(db_sort, desc=sort_desc)

        # Pagination
        offset = (params.page - 1) * params.page_size
        query = query.range(offset, offset + params.page_size - 1)

        result = query.execute()
        rows = result.data or []
        total = result.count if result.count is not None else len(rows)

        # Load classification maps for normalized display
        cls_maps = await self._get_classification_maps()

        # Transform to SKUResponse format with normalized names
        items = []
        for row in rows:
            product = row.get("product", {}) or {}
            acabado_data = row.get("acabado", {}) or {}
            # Use acabado app name (nombre) if available, fallback to nombre_siesa
            acabado_display = acabado_data.get("nombre") or acabado_data.get("nombre_siesa")
            acabado_code = acabado_data.get("codigo")

            items.append(SKUResponse(
                variantId=row.get("id", 0),
                ref=product.get("reference", row.get("reference_siesa", "")),
                refSiesa=row.get("reference_siesa", ""),
                desc=product.get("description", ""),
                cat=self._normalize(row.get("categoria_raw") or product.get("categoria_raw"), cls_maps["categoria"]),
                sub=self._normalize(row.get("subcategoria_raw") or product.get("subcategoria_raw"), cls_maps["subcategoria"]),
                sys=self._normalize(row.get("sistema_raw") or product.get("sistema_raw"), cls_maps["sistema"]),
                lin=product.get("linea_raw"),
                productType=product.get("product_type") or "Otro",
                acabado=acabado_display,
                codAcabado=acabado_code,
                temple=row.get("temple"),
                aleacion=row.get("aleacion"),
                aleacionCode=row.get("aleacion_code"),
                longitud=float(row["longitud_m"]) if row.get("longitud_m") else None,
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

        query = query.order("priority").order("normalized_value")
        result = query.execute()
        rows = result.data or []

        items = []
        for row in rows:
            items.append(ClassificationItem(
                id=str(row["id"]),
                originalValue=row["original_value"],
                normalizedValue=row["normalized_value"],
                description=row.get("description"),
                notes=row.get("notes"),
                status=ClassificationStatus(row.get("status", "active")),
                skuCount=row.get("sku_count", 0),
                priority=row.get("priority", 0),
                isEdited=row.get("original_value") != row.get("normalized_value"),
                createdAt=row.get("created_at"),
                updatedAt=row.get("updated_at"),
                createdBy=row.get("created_by"),
                updatedBy=row.get("updated_by"),
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
        self, dimension: str, data: ClassificationCreateRequest,
        user_name: str = "system"
    ) -> ClassificationItem:
        """Create a new classification value in Supabase."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)

        record = {
            "dimension": db_dim,
            "original_value": data.originalValue,
            "normalized_value": data.normalizedValue,
            "description": data.description,
            "notes": data.notes,
            "priority": data.priority,
            "status": "active",
            "created_by": user_name,
            "updated_by": user_name,
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
        self, dimension: str, classification_id: str, data: ClassificationUpdateRequest,
        user_name: str = "system"
    ) -> Optional[ClassificationItem]:
        """Update an existing classification value in Supabase by UUID."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)

        updates = {}
        if data.normalizedValue is not None:
            updates["normalized_value"] = data.normalizedValue
        if data.description is not None:
            updates["description"] = data.description
        if data.notes is not None:
            updates["notes"] = data.notes
        if data.status is not None:
            updates["status"] = data.status.value
        if data.priority is not None:
            updates["priority"] = data.priority

        if not updates:
            return None

        updates["updated_by"] = user_name

        result = sb.table("classifications").update(updates).eq(
            "dimension", db_dim
        ).eq("id", classification_id).execute()

        if not result.data:
            return None

        row = result.data[0]
        return ClassificationItem(
            id=str(row["id"]),
            originalValue=row["original_value"],
            normalizedValue=row["normalized_value"],
            description=row.get("description"),
            notes=row.get("notes"),
            status=ClassificationStatus(row.get("status", "active")),
            skuCount=row.get("sku_count", 0),
            priority=row.get("priority", 0),
            isEdited=row.get("original_value") != row.get("normalized_value"),
            createdAt=row.get("created_at"),
            updatedAt=row.get("updated_at"),
            createdBy=row.get("created_by"),
            updatedBy=row.get("updated_by"),
        )

    async def bulk_classification_action(
        self, dimension: str, action_data: BulkActionRequest,
        user_name: str = "system"
    ) -> dict:
        """Handle bulk actions on classifications in Supabase."""
        sb = _sb()
        db_dim = DIM_MAP.get(dimension, dimension)
        affected = 0

        if action_data.action.value == "rename" and action_data.newValue:
            for rid in action_data.ids:
                sb.table("classifications").update(
                    {"normalized_value": action_data.newValue, "updated_by": user_name}
                ).eq("dimension", db_dim).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "inactivate":
            for rid in action_data.ids:
                sb.table("classifications").update(
                    {"status": "inactive", "updated_by": user_name}
                ).eq("dimension", db_dim).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "activate":
            for rid in action_data.ids:
                sb.table("classifications").update(
                    {"status": "active", "updated_by": user_name}
                ).eq("dimension", db_dim).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "export":
            # Return the data for CSV export
            items = []
            for rid in action_data.ids:
                result = sb.table("classifications").select("*").eq(
                    "dimension", db_dim
                ).eq("id", rid).execute()
                if result.data:
                    items.append(result.data[0])
            return {
                "action": "export",
                "affected": len(items),
                "items": items,
                "message": f"Exportando {len(items)} elementos",
            }

        return {
            "action": action_data.action.value,
            "affected": affected,
            "message": f"Accion '{action_data.action.value}' aplicada a {affected} elementos",
        }

    # ── Acabado Methods (dedicated acabados table) ──

    def _row_to_acabado(self, row: dict, subcats: list[str] = None) -> AcabadoItem:
        """Map a DB row to AcabadoItem."""
        return AcabadoItem(
            id=str(row["id"]),
            codigo=row["codigo"],
            nombreSiesa=row["nombre_siesa"],
            nombre=row.get("nombre"),
            familia=row.get("familia"),
            tipoAcabado=row.get("tipo_acabado"),
            colorBase=row.get("color_base"),
            descripcion=row.get("descripcion"),
            notas=row.get("notas"),
            status=AcabadoStatus(row.get("status", "active")),
            enrichmentStatus=AcabadoEnrichmentStatus(row.get("enrichment_status", "pendiente")),
            origen=row.get("origen", "import"),
            skuCount=row.get("sku_count", 0),
            subcategorias=subcats or [],
            createdAt=row.get("created_at"),
            updatedAt=row.get("updated_at"),
            createdBy=row.get("created_by"),
            updatedBy=row.get("updated_by"),
        )

    async def get_acabados(
        self, search: Optional[str] = None,
        tipo_acabado: Optional[str] = None,
        familia: Optional[str] = None,
        status: Optional[str] = None,
        enrichment: Optional[str] = None,
        subcategoria: Optional[str] = None,
    ) -> AcabadoListResponse:
        """Get all acabados from dedicated acabados table with filters."""
        sb = _sb()
        query = sb.table("acabados").select("*")

        if search:
            query = query.or_(
                f"codigo.ilike.%{search}%,nombre_siesa.ilike.%{search}%,"
                f"nombre.ilike.%{search}%,familia.ilike.%{search}%,"
                f"color_base.ilike.%{search}%"
            )
        if tipo_acabado:
            query = query.eq("tipo_acabado", tipo_acabado)
        if familia:
            query = query.eq("familia", familia)
        if status:
            query = query.eq("status", status)
        if enrichment:
            query = query.eq("enrichment_status", enrichment)

        query = query.order("sku_count", desc=True).order("nombre_siesa")
        result = query.execute()
        rows = result.data or []

        # Get subcategoria mappings for all acabados in one query
        acabado_ids = [str(r["id"]) for r in rows]
        sub_map: dict[str, list[str]] = {}
        if acabado_ids:
            sa_result = sb.table("subcategoria_acabados").select(
                "acabado_id, subcategoria"
            ).in_("acabado_id", acabado_ids).execute()
            for sa in (sa_result.data or []):
                aid = str(sa["acabado_id"])
                sub_map.setdefault(aid, []).append(sa["subcategoria"])

        # If filtering by subcategoria, filter after join
        items = []
        for row in rows:
            rid = str(row["id"])
            subcats = sub_map.get(rid, [])
            if subcategoria and subcategoria not in subcats:
                continue
            items.append(self._row_to_acabado(row, subcats))

        # Compute stats
        anodizado = sum(1 for it in items if it.tipoAcabado == "anodizado")
        pintura = sum(1 for it in items if it.tipoAcabado == "pintura")
        mill = sum(1 for it in items if it.tipoAcabado == "mill_finish")
        otro = sum(1 for it in items if it.tipoAcabado in ("sublimado", "otro"))
        sin_tipo = sum(1 for it in items if not it.tipoAcabado)
        active = sum(1 for it in items if it.status == AcabadoStatus.active)
        pendientes = sum(1 for it in items if it.enrichmentStatus == AcabadoEnrichmentStatus.pendiente)
        parcial = sum(1 for it in items if it.enrichmentStatus == AcabadoEnrichmentStatus.parcial)
        completo = sum(1 for it in items if it.enrichmentStatus == AcabadoEnrichmentStatus.completo)

        return AcabadoListResponse(
            items=items,
            stats=AcabadoStats(
                total=len(items),
                anodizado=anodizado,
                pintura=pintura,
                millFinish=mill,
                otro=otro,
                sinTipo=sin_tipo,
                active=active,
                inactive=len(items) - active,
                pendientes=pendientes,
                parcial=parcial,
                completo=completo,
            ),
        )

    async def get_acabado_by_id(self, acabado_id: str) -> Optional[AcabadoItem]:
        """Get a single acabado with its subcategorias and changelog."""
        sb = _sb()
        result = sb.table("acabados").select("*").eq("id", acabado_id).maybe_single().execute()
        if not result.data:
            return None

        row = result.data
        # Get subcategorias
        sa_result = sb.table("subcategoria_acabados").select("subcategoria").eq(
            "acabado_id", acabado_id
        ).execute()
        subcats = [s["subcategoria"] for s in (sa_result.data or [])]

        # Get changelog
        cl_result = sb.table("acabado_changelog").select("*").eq(
            "acabado_id", acabado_id
        ).order("changed_at", desc=True).limit(20).execute()
        changelog = [
            ChangeLogEntry(
                date=c.get("changed_at", ""),
                action=c.get("action", ""),
                old_value=c.get("old_value"),
                new_value=c.get("new_value"),
                user=c.get("changed_by"),
            )
            for c in (cl_result.data or [])
        ]

        item = self._row_to_acabado(row, subcats)
        item.changeLog = changelog
        return item

    async def create_acabado(
        self, data: AcabadoCreateRequest, user_name: str = "system"
    ) -> AcabadoItem:
        """Create a new acabado manually."""
        sb = _sb()

        # Compute enrichment status
        enrichment = "pendiente"
        filled = sum(1 for v in [data.tipoAcabado, data.colorBase, data.familia, data.descripcion] if v)
        if filled >= 3:
            enrichment = "completo"
        elif filled > 0:
            enrichment = "parcial"

        record = {
            "codigo": data.codigo,
            "nombre_siesa": data.nombreSiesa,
            "nombre": data.nombre or data.nombreSiesa,
            "familia": data.familia,
            "tipo_acabado": data.tipoAcabado,
            "color_base": data.colorBase,
            "descripcion": data.descripcion,
            "notas": data.notas,
            "status": "active",
            "enrichment_status": enrichment,
            "origen": "manual",
            "created_by": user_name,
            "updated_by": user_name,
        }
        result = sb.table("acabados").insert(record).execute()
        row = result.data[0]

        # Log creation
        sb.table("acabado_changelog").insert({
            "acabado_id": row["id"],
            "action": "Creado manualmente",
            "changed_by": user_name,
        }).execute()

        return self._row_to_acabado(row)

    async def update_acabado(
        self, acabado_id: str, data: AcabadoUpdateRequest, user_name: str = "system"
    ) -> Optional[AcabadoItem]:
        """Update acabado App-owned fields, log changes."""
        sb = _sb()

        # Fetch current for changelog
        current = sb.table("acabados").select("*").eq("id", acabado_id).maybe_single().execute()
        if not current.data:
            return None
        old = current.data

        updates: dict = {}
        field_map = {
            "nombre": "nombre", "familia": "familia",
            "tipoAcabado": "tipo_acabado", "colorBase": "color_base",
            "descripcion": "descripcion", "notas": "notas",
        }
        changes = []
        for schema_field, db_field in field_map.items():
            new_val = getattr(data, schema_field, None)
            if new_val is not None:
                old_val = old.get(db_field)
                if new_val != old_val:
                    updates[db_field] = new_val
                    changes.append((db_field, str(old_val or ""), str(new_val)))

        if data.status is not None and data.status.value != old.get("status"):
            updates["status"] = data.status.value
            changes.append(("status", old.get("status", ""), data.status.value))

        if not updates:
            return self._row_to_acabado(old)

        # Recompute enrichment_status
        merged = {**old, **updates}
        filled = sum(1 for k in ["tipo_acabado", "color_base", "familia", "descripcion"]
                     if merged.get(k))
        if filled >= 3:
            updates["enrichment_status"] = "completo"
        elif filled > 0:
            updates["enrichment_status"] = "parcial"
        else:
            updates["enrichment_status"] = "pendiente"

        updates["updated_by"] = user_name
        result = sb.table("acabados").update(updates).eq("id", acabado_id).execute()

        # Log each change
        for field, old_val, new_val in changes:
            sb.table("acabado_changelog").insert({
                "acabado_id": acabado_id,
                "action": f"Campo '{field}' actualizado",
                "field": field,
                "old_value": old_val,
                "new_value": new_val,
                "changed_by": user_name,
            }).execute()

        if not result.data:
            return None
        return self._row_to_acabado(result.data[0])

    async def bulk_acabado_action(
        self, action_data: AcabadoBulkActionRequest, user_name: str = "system"
    ) -> dict:
        """Handle bulk actions on acabados."""
        sb = _sb()
        affected = 0

        if action_data.action.value == "rename" and action_data.newValue:
            for rid in action_data.ids:
                sb.table("acabados").update(
                    {"nombre": action_data.newValue, "updated_by": user_name}
                ).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "set_tipo" and action_data.newValue:
            for rid in action_data.ids:
                sb.table("acabados").update(
                    {"tipo_acabado": action_data.newValue, "updated_by": user_name}
                ).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "set_familia" and action_data.newValue:
            for rid in action_data.ids:
                sb.table("acabados").update(
                    {"familia": action_data.newValue, "updated_by": user_name}
                ).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "inactivate":
            for rid in action_data.ids:
                sb.table("acabados").update(
                    {"status": "inactive", "updated_by": user_name}
                ).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "activate":
            for rid in action_data.ids:
                sb.table("acabados").update(
                    {"status": "active", "updated_by": user_name}
                ).eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "delete":
            for rid in action_data.ids:
                sb.table("acabados").delete().eq("id", rid).execute()
                affected += 1

        elif action_data.action.value == "export":
            items = []
            for rid in action_data.ids:
                r = sb.table("acabados").select("*").eq("id", rid).execute()
                if r.data:
                    items.append(r.data[0])
            return {"action": "export", "affected": len(items), "items": items}

        return {
            "action": action_data.action.value,
            "affected": affected,
            "message": f"Accion '{action_data.action.value}' aplicada a {affected} acabados",
        }

    async def get_acabado_filter_options(self) -> dict:
        """Get distinct values for filter dropdowns."""
        sb = _sb()
        rows = sb.table("acabados").select(
            "tipo_acabado, familia, color_base"
        ).execute().data or []

        tipos = sorted(set(r["tipo_acabado"] for r in rows if r.get("tipo_acabado")))
        familias = sorted(set(r["familia"] for r in rows if r.get("familia")))
        colores = sorted(set(r["color_base"] for r in rows if r.get("color_base")))

        # Subcategorias from the junction table
        sa_rows = sb.table("subcategoria_acabados").select("subcategoria").execute().data or []
        subcats = sorted(set(r["subcategoria"] for r in sa_rows))

        return {"tipos": tipos, "familias": familias, "colores": colores, "subcategorias": subcats}

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
        acabados = sb.table("acabados").select("id", count="exact").execute()

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

        # Build main query — include categoria_raw and product_type
        query = sb.table("products").select(
            "id, reference, description, categoria_raw, subcategoria_raw, "
            "sistema_raw, linea_raw, peso_um, is_profile, product_type, status, technical_specs",
            count="exact",
        )

        # Helper for multi-value params
        def split_multi(val):
            if not val:
                return []
            return [v.strip() for v in val.split(",") if v.strip()]

        # Apply filters — support comma-separated multi-select
        if params.search:
            s = params.search
            query = query.or_(f"reference.ilike.%{s}%,description.ilike.%{s}%")
        if params.categoria:
            vals = split_multi(params.categoria)
            raws = [await self._reverse_lookup("categoria", v) for v in vals]
            query = query.in_("categoria_raw", raws) if len(raws) > 1 else query.eq("categoria_raw", raws[0])
        if params.subcategory:
            vals = split_multi(params.subcategory)
            raws = [await self._reverse_lookup("subcategoria", v) for v in vals]
            query = query.in_("subcategoria_raw", raws) if len(raws) > 1 else query.eq("subcategoria_raw", raws[0])
        if params.sistema:
            vals = split_multi(params.sistema)
            raws = [await self._reverse_lookup("sistema", v) for v in vals]
            query = query.in_("sistema_raw", raws) if len(raws) > 1 else query.eq("sistema_raw", raws[0])
        if params.product_type:
            query = query.eq("product_type", params.product_type)
        if params.status:
            query = query.eq("status", params.status)

        # Sort
        sort_map = {
            "reference": "reference",
            "description": "description",
            "categoria": "categoria_raw",
            "subcategoria": "subcategoria_raw",
            "sistema": "sistema_raw",
            "productType": "product_type",
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

        # Get variant counts via SQL GROUP BY (single RPC call)
        product_ids = [r["id"] for r in rows]
        variant_counts: dict = {}
        if product_ids:
            vc_result = sb.rpc("get_variant_counts", {"p_product_ids": product_ids}).execute()
            variant_counts = {r["product_id"]: r["cnt"] for r in (vc_result.data or [])}

        # Load classification maps for normalized display names
        cls_maps = await self._get_classification_maps()

        items = []
        for row in rows:
            items.append(ProductBaseItem(
                id=row["id"],
                reference=row.get("reference", ""),
                description=row.get("description"),
                categoria=self._normalize(row.get("categoria_raw"), cls_maps["categoria"]),
                subcategoria=self._normalize(row.get("subcategoria_raw"), cls_maps["subcategoria"]),
                sistema=self._normalize(row.get("sistema_raw"), cls_maps["sistema"]),
                linea=row.get("linea_raw"),
                productType=row.get("product_type") or "Otro",
                pesoUm=float(row.get("peso_um") or 0),
                isProfile=bool(row.get("is_profile")),
                variantCount=variant_counts.get(row["id"], 0),
                status="Activo" if row.get("status") == "active" else "Inactivo",
                technicalSpecs=row.get("technical_specs") or {},
            ))

        # Get type counts from FULL dataset using individual count queries
        # (avoids Supabase 1000-row default limit on select)
        type_counts_raw: dict[str, int] = {}
        for pt in ["Perfil", "Lamina", "Escalera", "Accesorio", "Otro"]:
            tc_q = sb.table("products").select("id", count="exact").eq("product_type", pt)
            tc_r = tc_q.limit(1).execute()
            type_counts_raw[pt] = tc_r.count if tc_r.count is not None else 0

        type_counts = ProductBaseTypeCounts(
            perfil=type_counts_raw.get("Perfil", 0),
            lamina=type_counts_raw.get("Lamina", 0),
            escalera=type_counts_raw.get("Escalera", 0),
            accesorio=type_counts_raw.get("Accesorio", 0),
            otro=type_counts_raw.get("Otro", 0),
        )

        return ProductBaseListResponse(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            typeCounts=type_counts,
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
            technicalSpecs=row.get("technical_specs") or {},
            variants=variants,
        )

    async def update_technical_specs(self, product_id: int, specs: dict) -> dict:
        """Save technical_specs JSONB for a base product."""
        sb = _sb()
        result = sb.table("products").update(
            {"technical_specs": specs}
        ).eq("id", product_id).execute()
        if not result.data:
            raise ValueError("Producto no encontrado")
        return result.data[0].get("technical_specs") or {}

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
        """Get comprehensive KPIs across products, variants, and warehouse records.

        All independent Supabase queries run in parallel via asyncio.to_thread
        for ~3-4x speedup vs the previous sequential approach.
        """
        sb = _sb()
        six_months_ago = (datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%d")

        # Define all independent queries as sync callables
        def q_products_total():
            return sb.table("products").select("id", count="exact").execute()

        def q_profiles():
            return sb.table("products").select("id", count="exact").eq("is_profile", True).execute()

        def q_distinct_pids():
            return sb.table("product_variants").select("product_id").execute()

        def q_variants_total():
            return sb.table("product_variants").select("id", count="exact").execute()

        def q_variants_active():
            return sb.table("product_variants").select("id", count="exact").eq("status", "active").execute()

        def q_wh_total():
            return sb.table("product_warehouse").select("id", count="exact").execute()

        def q_wh_summary():
            return sb.rpc("get_warehouse_summary").execute()

        def q_no_sales_null():
            return sb.table("product_warehouse").select("id", count="exact").is_(
                "fecha_ultima_venta", "null"
            ).execute()

        def q_no_sales_old():
            return sb.table("product_warehouse").select("id", count="exact").lt(
                "fecha_ultima_venta", six_months_ago
            ).execute()

        # Run all queries in parallel (11 → 9 queries: warehouse summary RPC replaces 3)
        (
            products_total_r, profiles_r, distinct_pids_r,
            variants_total_r, variants_active_r,
            wh_total_r, wh_summary_r,
            no_sales_null_r, no_sales_old_r,
        ) = await asyncio.gather(
            asyncio.to_thread(q_products_total),
            asyncio.to_thread(q_profiles),
            asyncio.to_thread(q_distinct_pids),
            asyncio.to_thread(q_variants_total),
            asyncio.to_thread(q_variants_active),
            asyncio.to_thread(q_wh_total),
            asyncio.to_thread(q_wh_summary),
            asyncio.to_thread(q_no_sales_null),
            asyncio.to_thread(q_no_sales_old),
        )

        # ── Aggregate results ──
        products_total = products_total_r.count or 0
        profiles_count = profiles_r.count or 0
        accessories_count = products_total - profiles_count
        distinct_pids = set(r["product_id"] for r in (distinct_pids_r.data or []))
        without_variants = products_total - len(distinct_pids)

        variants_total = variants_total_r.count or 0
        variants_active = variants_active_r.count or 0
        variants_inactive = variants_total - variants_active

        # Warehouse summary from single RPC (replaces 3 separate queries)
        wh_summary = (wh_summary_r.data or [{}])
        if isinstance(wh_summary, list):
            wh_summary = wh_summary[0] if wh_summary else {}
        total_inventory_value = float(wh_summary.get("total_inventory_value", 0))
        distinct_variant_count = int(wh_summary.get("distinct_variants", 0))
        active_bodegas = int(wh_summary.get("distinct_warehouses", 0))
        without_warehouse = variants_total - distinct_variant_count

        wh_total_records = wh_total_r.count or 0
        no_sales_6m = (no_sales_null_r.count or 0) + (no_sales_old_r.count or 0)

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


    # ══════════════════════════════════════════════════════════════
    # Generic Product Attributes (product_attributes table)
    # ══════════════════════════════════════════════════════════════

    def _row_to_attribute(self, row: dict, changelog: list = None) -> AttributeItem:
        """Map a DB row to an AttributeItem."""
        return AttributeItem(
            id=row["id"],
            dimension=row["dimension"],
            productType=row["product_type"],
            codigo=row["codigo"],
            nombreSiesa=row["nombre_siesa"],
            nombre=row.get("nombre"),
            descripcion=row.get("descripcion"),
            notas=row.get("notas"),
            metadata=row.get("metadata") or {},
            status=row.get("status", "active"),
            enrichmentStatus=row.get("enrichment_status", "pendiente"),
            skuCount=row.get("sku_count", 0),
            origen=row.get("origen", "import"),
            createdAt=str(row["created_at"]) if row.get("created_at") else None,
            updatedAt=str(row["updated_at"]) if row.get("updated_at") else None,
            createdBy=row.get("created_by"),
            updatedBy=row.get("updated_by"),
            changeLog=[
                ChangeLogEntry(
                    date=str(e["changed_at"]),
                    action=e.get("action", ""),
                    old_value=e.get("old_value"),
                    new_value=e.get("new_value"),
                    user=e.get("changed_by"),
                )
                for e in (changelog or [])
            ],
        )

    def _compute_attribute_enrichment(self, row: dict) -> str:
        """Compute enrichment status based on filled fields."""
        fields = ["nombre", "descripcion", "notas"]
        filled = sum(1 for f in fields if row.get(f))
        meta = row.get("metadata") or {}
        filled += sum(1 for v in meta.values() if v)
        total = len(fields) + len(meta)
        if total == 0:
            return "pendiente"
        ratio = filled / max(total, 1)
        if ratio >= 0.8:
            return "completo"
        elif ratio > 0:
            return "parcial"
        return "pendiente"

    async def get_attributes(
        self,
        dimension: str,
        product_type: str = None,
        search: str = None,
        status: str = None,
        enrichment: str = None,
    ) -> AttributeListResponse:
        """List attributes for a dimension with optional filters."""
        sb = _sb()
        query = sb.table("product_attributes").select("*").eq("dimension", dimension)

        if product_type:
            query = query.eq("product_type", product_type)
        if status:
            query = query.eq("status", status)
        if enrichment:
            query = query.eq("enrichment_status", enrichment)
        if search:
            query = query.or_(
                f"codigo.ilike.%{search}%,"
                f"nombre_siesa.ilike.%{search}%,"
                f"nombre.ilike.%{search}%"
            )

        query = query.order("sku_count", desc=True)
        result = query.execute()
        rows = result.data or []

        items = [self._row_to_attribute(r) for r in rows]

        # Compute stats
        stats = AttributeStats(
            total=len(rows),
            active=sum(1 for r in rows if r.get("status") == "active"),
            inactive=sum(1 for r in rows if r.get("status") != "active"),
            pendientes=sum(1 for r in rows if r.get("enrichment_status") == "pendiente"),
            parcial=sum(1 for r in rows if r.get("enrichment_status") == "parcial"),
            completo=sum(1 for r in rows if r.get("enrichment_status") == "completo"),
        )

        return AttributeListResponse(items=items, stats=stats)

    async def get_attribute_by_id(self, dimension: str, attribute_id: str) -> Optional[AttributeItem]:
        """Get a single attribute with changelog."""
        sb = _sb()
        result = sb.table("product_attributes").select("*").eq("id", attribute_id).eq("dimension", dimension).execute()
        if not result.data:
            return None
        row = result.data[0]

        # Fetch changelog
        cl_result = sb.table("product_attribute_changelog").select("*").eq(
            "attribute_id", attribute_id
        ).order("changed_at", desc=True).limit(50).execute()

        return self._row_to_attribute(row, cl_result.data or [])

    async def get_attribute_filter_options(self, dimension: str, product_type: str = None) -> dict:
        """Get distinct filter values for a dimension."""
        sb = _sb()
        query = sb.table("product_attributes").select(
            "status, enrichment_status"
        ).eq("dimension", dimension)
        if product_type:
            query = query.eq("product_type", product_type)
        result = query.execute()
        rows = result.data or []

        statuses = sorted(set(r["status"] for r in rows if r.get("status")))
        enrichments = sorted(set(r["enrichment_status"] for r in rows if r.get("enrichment_status")))

        return {"statuses": statuses, "enrichments": enrichments}

    async def create_attribute(
        self, dimension: str, data: AttributeCreateRequest, user_name: str = "system"
    ) -> AttributeItem:
        """Create a new product attribute."""
        sb = _sb()
        now = datetime.utcnow().isoformat()

        row_data = {
            "dimension": dimension,
            "product_type": data.productType,
            "codigo": data.codigo,
            "nombre_siesa": data.nombreSiesa,
            "nombre": data.nombre or data.nombreSiesa,
            "descripcion": data.descripcion,
            "notas": data.notas,
            "metadata": data.metadata or {},
            "status": "active",
            "origen": "manual",
            "created_at": now,
            "updated_at": now,
            "created_by": user_name,
            "updated_by": user_name,
        }
        row_data["enrichment_status"] = self._compute_attribute_enrichment(row_data)

        result = sb.table("product_attributes").insert(row_data).execute()
        new_row = result.data[0]

        # Changelog entry
        sb.table("product_attribute_changelog").insert({
            "attribute_id": new_row["id"],
            "action": "Creado manualmente",
            "changed_by": user_name,
            "changed_at": now,
        }).execute()

        return self._row_to_attribute(new_row)

    async def update_attribute(
        self, dimension: str, attribute_id: str, data: AttributeUpdateRequest, user_name: str = "system"
    ) -> Optional[AttributeItem]:
        """Update app-owned fields of a product attribute."""
        sb = _sb()

        # Fetch current
        current_result = sb.table("product_attributes").select("*").eq(
            "id", attribute_id
        ).eq("dimension", dimension).execute()
        if not current_result.data:
            return None
        current = current_result.data[0]

        now = datetime.utcnow().isoformat()
        updates = {"updated_at": now, "updated_by": user_name}
        changelog_entries = []

        field_map = {
            "nombre": data.nombre,
            "descripcion": data.descripcion,
            "notas": data.notas,
            "status": data.status,
        }

        for db_field, new_val in field_map.items():
            if new_val is not None and str(new_val) != str(current.get(db_field) or ""):
                old_val = current.get(db_field) or ""
                updates[db_field] = new_val
                changelog_entries.append({
                    "attribute_id": attribute_id,
                    "action": f"Campo '{db_field}' actualizado",
                    "field": db_field,
                    "old_value": str(old_val),
                    "new_value": str(new_val),
                    "changed_by": user_name,
                    "changed_at": now,
                })

        if data.metadata is not None:
            updates["metadata"] = data.metadata
            changelog_entries.append({
                "attribute_id": attribute_id,
                "action": "Metadata actualizada",
                "changed_by": user_name,
                "changed_at": now,
            })

        # Recompute enrichment
        merged = {**current, **updates}
        updates["enrichment_status"] = self._compute_attribute_enrichment(merged)

        sb.table("product_attributes").update(updates).eq("id", attribute_id).execute()

        if changelog_entries:
            sb.table("product_attribute_changelog").insert(changelog_entries).execute()

        return await self.get_attribute_by_id(dimension, attribute_id)

    async def bulk_attribute_action(
        self, dimension: str, action_data: AttributeBulkActionRequest, user_name: str = "system"
    ) -> dict:
        """Execute bulk action on product attributes."""
        sb = _sb()
        now = datetime.utcnow().isoformat()
        ids = action_data.ids
        action = action_data.action.value

        if action == "rename" and action_data.newValue:
            for aid in ids:
                sb.table("product_attributes").update({
                    "nombre": action_data.newValue,
                    "updated_at": now,
                    "updated_by": user_name,
                }).eq("id", aid).eq("dimension", dimension).execute()
                sb.table("product_attribute_changelog").insert({
                    "attribute_id": aid,
                    "action": "Renombrado (bulk)",
                    "field": "nombre",
                    "new_value": action_data.newValue,
                    "changed_by": user_name,
                    "changed_at": now,
                }).execute()

        elif action == "activate":
            for aid in ids:
                sb.table("product_attributes").update({
                    "status": "active", "updated_at": now, "updated_by": user_name,
                }).eq("id", aid).eq("dimension", dimension).execute()
                sb.table("product_attribute_changelog").insert({
                    "attribute_id": aid, "action": "Activado (bulk)",
                    "field": "status", "old_value": "inactive", "new_value": "active",
                    "changed_by": user_name, "changed_at": now,
                }).execute()

        elif action == "inactivate":
            for aid in ids:
                sb.table("product_attributes").update({
                    "status": "inactive", "updated_at": now, "updated_by": user_name,
                }).eq("id", aid).eq("dimension", dimension).execute()
                sb.table("product_attribute_changelog").insert({
                    "attribute_id": aid, "action": "Inactivado (bulk)",
                    "field": "status", "old_value": "active", "new_value": "inactive",
                    "changed_by": user_name, "changed_at": now,
                }).execute()

        elif action == "delete":
            for aid in ids:
                sb.table("product_attributes").delete().eq("id", aid).eq("dimension", dimension).execute()

        return {"ok": True, "affected": len(ids)}


# ── Singleton instance ──
products_service = ProductsService()
