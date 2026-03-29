"""
File Uploads Service — Process uploads, compute diffs, manage audit trail.
"""
import json
import logging
import pandas as pd
from io import BytesIO
from typing import Optional

from app.config import get_supabase_client
from app.core.excel_parsers import (
    detect_file_type, parse_maestro, parse_maestro_full,
    parse_ventas, parse_transito,
)
from app.modules.file_uploads.schemas import (
    FileUploadItem,
    FileUploadStats,
    FileUploadListParams,
    FileUploadListResponse,
    FileUploadDiffResponse,
    DiffRow,
    ChangedField,
    SyncResult,
)

logger = logging.getLogger(__name__)

# Key field used to match rows across uploads, per file type
KEY_FIELDS = {
    "maestro": "reference",
    "ventas": "reference",
    "transito": "reference",
    "transito_flex": "reference",
    "transito_siesa": "reference",
}

FILE_TYPE_LABELS = {
    "maestro": "Maestro de Items",
    "ventas": "Ventas / Facturación",
    "transito": "Tránsito Activo",
    "transito_flex": "Tránsito Activo",
    "transito_siesa": "Tránsito Activo",
}


def _sb():
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client not configured")
    return client


def _row_to_item(row: dict) -> FileUploadItem:
    return FileUploadItem(
        id=row["id"],
        fileName=row.get("file_name", ""),
        fileType=row.get("file_type", ""),
        fileTypeLabel=row.get("file_type_label", ""),
        status=row.get("status", "processing"),
        recordsTotal=row.get("records_total", 0) or 0,
        recordsNew=row.get("records_new", 0) or 0,
        recordsUpdated=row.get("records_updated", 0) or 0,
        recordsDeleted=row.get("records_deleted", 0) or 0,
        fileSizeBytes=row.get("file_size_bytes", 0) or 0,
        uploadedBy=row.get("uploaded_by"),
        changesSummary=row.get("changes_summary"),
        errorMessage=row.get("error_message"),
        createdAt=row.get("created_at"),
    )


def _compute_diff(old_records: list[dict], new_records: list[dict], key_field: str) -> dict:
    """
    Compare two lists of parsed records by key_field.
    Returns { new_rows, updated_rows, deleted_rows } with field-level changes.
    """
    old_map = {}
    for r in old_records:
        k = str(r.get(key_field, "")).strip()
        if k:
            old_map[k] = r

    new_map = {}
    for r in new_records:
        k = str(r.get(key_field, "")).strip()
        if k:
            new_map[k] = r

    new_keys = set(new_map.keys()) - set(old_map.keys())
    deleted_keys = set(old_map.keys()) - set(new_map.keys())
    common_keys = set(new_map.keys()) & set(old_map.keys())

    new_rows = []
    for k in sorted(new_keys):
        r = new_map[k]
        new_rows.append(DiffRow(
            reference=k,
            description=r.get("description", r.get("category", "")),
        ))

    deleted_rows = []
    for k in sorted(deleted_keys):
        r = old_map[k]
        deleted_rows.append(DiffRow(
            reference=k,
            description=r.get("description", r.get("category", "")),
        ))

    updated_rows = []
    for k in sorted(common_keys):
        old_r = old_map[k]
        new_r = new_map[k]
        changes = []
        all_fields = set(list(old_r.keys()) + list(new_r.keys()))
        for field in sorted(all_fields):
            if field == key_field:
                continue
            old_val = str(old_r.get(field, ""))
            new_val = str(new_r.get(field, ""))
            if old_val != new_val:
                changes.append(ChangedField(field=field, old=old_val, new=new_val))
        if changes:
            updated_rows.append(DiffRow(
                reference=k,
                description=new_r.get("description", new_r.get("category", "")),
                changes=changes,
            ))

    return {
        "new_rows": new_rows,
        "updated_rows": updated_rows,
        "deleted_rows": deleted_rows,
    }


class FileUploadService:

    async def get_uploads(self, params: FileUploadListParams) -> FileUploadListResponse:
        sb = _sb()
        query = sb.table("file_uploads").select("*")

        if params.search:
            query = query.or_(
                f"file_name.ilike.%{params.search}%,"
                f"file_type_label.ilike.%{params.search}%,"
                f"uploaded_by.ilike.%{params.search}%"
            )
        if params.file_type:
            query = query.eq("file_type", params.file_type)
        if params.status:
            query = query.eq("status", params.status)

        sort_map = {
            "fileName": "file_name",
            "fileType": "file_type",
            "recordsTotal": "records_total",
            "createdAt": "created_at",
            "status": "status",
        }
        sort_field = sort_map.get(params.sort_field, "created_at")
        sort_desc = params.sort_order.value == "desc"
        query = query.order(sort_field, desc=sort_desc)

        result = query.execute()
        rows = result.data or []
        items = [_row_to_item(r) for r in rows]

        # Stats from ALL uploads
        all_rows = sb.table("file_uploads").select("id,file_type,status,created_at").execute().data or []
        stats = FileUploadStats(
            total=len(all_rows),
            success=sum(1 for r in all_rows if r.get("status") == "success"),
            error=sum(1 for r in all_rows if r.get("status") == "error"),
            maestro=sum(1 for r in all_rows if r.get("file_type") == "maestro"),
            ventas=sum(1 for r in all_rows if r.get("file_type") == "ventas"),
            transito=sum(1 for r in all_rows if "transito" in (r.get("file_type") or "")),
            lastUploadDate=max((r.get("created_at") for r in all_rows), default=None) if all_rows else None,
        )

        return FileUploadListResponse(items=items, stats=stats)

    async def get_upload_by_id(self, upload_id: int) -> Optional[FileUploadItem]:
        sb = _sb()
        result = sb.table("file_uploads").select("*").eq("id", upload_id).maybe_single().execute()
        if not result.data:
            return None
        return _row_to_item(result.data)

    async def get_diff(self, upload_id: int) -> Optional[FileUploadDiffResponse]:
        sb = _sb()
        upload = sb.table("file_uploads").select("*").eq("id", upload_id).maybe_single().execute()
        if not upload.data:
            return None

        row = upload.data
        summary = row.get("changes_summary") or {}

        return FileUploadDiffResponse(
            uploadId=row["id"],
            fileType=row.get("file_type", ""),
            newRows=[DiffRow(**r) for r in summary.get("new_rows", [])],
            updatedRows=[DiffRow(**r) for r in summary.get("updated_rows", [])],
            deletedRows=[DiffRow(**r) for r in summary.get("deleted_rows", [])],
            totalNew=row.get("records_new", 0) or 0,
            totalUpdated=row.get("records_updated", 0) or 0,
            totalDeleted=row.get("records_deleted", 0) or 0,
        )

    async def process_and_log_upload(self, file_content: bytes, filename: str, user_email: str) -> FileUploadItem:
        sb = _sb()
        file_size = len(file_content)

        # 1. Create initial record (processing)
        initial = sb.table("file_uploads").insert({
            "file_name": filename,
            "file_type": "unknown",
            "file_type_label": "Detectando...",
            "status": "processing",
            "file_size_bytes": file_size,
            "uploaded_by": user_email,
        }).execute()
        upload_id = initial.data[0]["id"]

        try:
            # 2. Read and parse Excel
            try:
                df = pd.read_excel(BytesIO(file_content), engine="openpyxl")
            except Exception:
                df = pd.read_csv(BytesIO(file_content))

            if df.empty:
                raise ValueError("El archivo está vacío")

            file_type = detect_file_type(df)
            if not file_type:
                raise ValueError(
                    f"No se reconoce el formato. Columnas: {', '.join(df.columns[:10])}"
                )

            # 3. Parse records
            if file_type == "maestro":
                full_data = parse_maestro_full(df)
                # Use products list for diff (backward compat with simple format)
                records = parse_maestro(df)
                # Store full data alongside for sync
                _maestro_full_data = full_data
            elif file_type == "ventas":
                records = parse_ventas(df)
            elif file_type in ("transito_flex", "transito_siesa"):
                records = parse_transito(df, file_type)
            else:
                raise ValueError(f"Tipo no soportado: {file_type}")

            # Normalize transito types for storage
            storage_type = "transito" if file_type.startswith("transito") else file_type
            label = FILE_TYPE_LABELS.get(file_type, file_type)
            key_field = KEY_FIELDS.get(file_type, "reference")

            # 4. Get previous snapshot for diff
            prev_snapshot = (
                sb.table("file_upload_snapshots")
                .select("snapshot_data")
                .eq("file_type", storage_type)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            old_records = []
            if prev_snapshot.data:
                old_records = prev_snapshot.data[0].get("snapshot_data", [])

            # 5. Compute diff
            diff = _compute_diff(old_records, records, key_field)

            # 6. Serialize diff for JSON storage (convert Pydantic models to dicts)
            changes_summary = {
                "new_rows": [r.model_dump() for r in diff["new_rows"][:100]],
                "updated_rows": [r.model_dump() for r in diff["updated_rows"][:100]],
                "deleted_rows": [r.model_dump() for r in diff["deleted_rows"][:100]],
                "new_rows_total": len(diff["new_rows"]),
                "updated_rows_total": len(diff["updated_rows"]),
                "deleted_rows_total": len(diff["deleted_rows"]),
            }

            # 7. Save new snapshot (include full data for maestro sync)
            snapshot_payload = records
            if file_type == "maestro" and _maestro_full_data:
                snapshot_payload = {
                    "_version": 2,
                    "records": records,
                    "variants": _maestro_full_data.get("variants", []),
                    "warehouse_records": _maestro_full_data.get("warehouse_records", []),
                    "summary": _maestro_full_data.get("summary", {}),
                }
            sb.table("file_upload_snapshots").insert({
                "file_type": storage_type,
                "snapshot_data": snapshot_payload,
                "upload_id": upload_id,
            }).execute()

            # 8. Update upload record with results
            sb.table("file_uploads").update({
                "file_type": storage_type,
                "file_type_label": label,
                "status": "success",
                "records_total": len(records),
                "records_new": len(diff["new_rows"]),
                "records_updated": len(diff["updated_rows"]),
                "records_deleted": len(diff["deleted_rows"]),
                "changes_summary": changes_summary,
            }).eq("id", upload_id).execute()

        except Exception as e:
            logger.error(f"Upload processing error: {e}")
            sb.table("file_uploads").update({
                "status": "error",
                "error_message": str(e),
            }).eq("id", upload_id).execute()
            raise

        # Return final record
        final = sb.table("file_uploads").select("*").eq("id", upload_id).maybe_single().execute()
        return _row_to_item(final.data)

    async def delete_upload(self, upload_id: int) -> bool:
        sb = _sb()
        existing = sb.table("file_uploads").select("id").eq("id", upload_id).maybe_single().execute()
        if not existing.data:
            return False
        sb.table("file_uploads").delete().eq("id", upload_id).execute()
        return True

    # ══════════════════════════════════════════════════════════════
    # Sync Engine — Apply parsed data to real DB tables
    # ══════════════════════════════════════════════════════════════

    async def apply_maestro_sync(self, upload_id: int) -> SyncResult:
        """
        Apply a previously uploaded maestro file to the database.
        Reads the snapshot, parses full data, and upserts to
        products, product_variants, product_warehouse, classifications, acabados.
        """
        sb = _sb()
        result = SyncResult(uploadId=upload_id)

        # 1. Get the upload record
        upload = sb.table("file_uploads").select("*").eq("id", upload_id).maybe_single().execute()
        if not upload.data:
            result.status = "error"
            result.message = "Upload no encontrado"
            return result

        row = upload.data
        if row.get("file_type") != "maestro":
            result.status = "error"
            result.message = f"Solo se puede sincronizar tipo maestro, este es: {row.get('file_type')}"
            return result

        # 2. Get the snapshot (full parsed data)
        snap = (
            sb.table("file_upload_snapshots")
            .select("snapshot_data")
            .eq("upload_id", upload_id)
            .maybe_single()
            .execute()
        )
        if not snap.data or not snap.data.get("snapshot_data"):
            result.status = "error"
            result.message = "No se encontró snapshot de datos para este upload"
            return result

        # Parse snapshot — support both v1 (simple list) and v2 (full data with variants)
        raw_snapshot = snap.data["snapshot_data"]
        if not raw_snapshot:
            result.status = "error"
            result.message = "Snapshot vacío"
            return result

        # Detect snapshot version
        if isinstance(raw_snapshot, dict) and raw_snapshot.get("_version") == 2:
            snapshot_records = raw_snapshot.get("records", [])
            snapshot_variants = raw_snapshot.get("variants", [])
            snapshot_warehouse = raw_snapshot.get("warehouse_records", [])
        else:
            # Legacy v1 snapshot — only product-level records, no variant detail
            snapshot_records = raw_snapshot if isinstance(raw_snapshot, list) else []
            snapshot_variants = []
            snapshot_warehouse = []

        try:
            # ── Step 1: Build lookup maps ──
            existing_products = sb.table("products").select("id,reference,product_type,technical_specs").execute().data or []
            product_map = {p["reference"]: p for p in existing_products}

            # Existing variants by (reference_siesa, acabado_code) composite key
            existing_variants_raw = []
            offset = 0
            while True:
                batch = sb.table("product_variants").select("id,reference_siesa,acabado_code,product_id,acabado_id").range(offset, offset + 999).execute().data or []
                existing_variants_raw.extend(batch)
                if len(batch) < 1000:
                    break
                offset += 1000
            variant_map = {}  # (ref, acabado_code) -> variant dict
            variant_map_by_ref = {}  # ref -> variant dict (legacy fallback)
            for v in existing_variants_raw:
                key = (v["reference_siesa"], v.get("acabado_code") or None)
                variant_map[key] = v
                variant_map_by_ref.setdefault(v["reference_siesa"], v)

            existing_warehouses = sb.table("warehouses").select("id,name").execute().data or []
            warehouse_map = {w["name"]: w["id"] for w in existing_warehouses}

            existing_cls = sb.table("classifications").select("id,dimension,original_value").execute().data or []
            cls_set = {(c["dimension"], c["original_value"]) for c in existing_cls}

            existing_acabados = sb.table("acabados").select("id,codigo").execute().data or []
            acabado_code_map = {a["codigo"]: a["id"] for a in existing_acabados}

            refs_in_file = set()

            # ── Step 2: Sync products ──
            for rec in snapshot_records:
                ref = rec.get("reference", "").strip()
                if not ref:
                    continue
                refs_in_file.add(ref)

                cat_raw = rec.get("category", "")
                subcat_raw = rec.get("subcategory", "")
                sys_raw = rec.get("system", "")
                status_val = "active" if rec.get("status", "Activo").lower() in ("activo", "active") else "inactive"

                if ref in product_map:
                    pid = product_map[ref]["id"]
                    sb.table("products").update({
                        "description": rec.get("description", ref),
                        "categoria_raw": cat_raw,
                        "subcategoria_raw": subcat_raw,
                        "sistema_raw": sys_raw,
                        "peso_um": rec.get("weight_per_meter", 0),
                        "status": status_val,
                        "updated_at": "now()",
                    }).eq("id", pid).execute()
                    result.productsUpdated += 1
                else:
                    new_prod = sb.table("products").insert({
                        "reference": ref,
                        "description": rec.get("description", ref),
                        "categoria_raw": cat_raw,
                        "subcategoria_raw": subcat_raw,
                        "sistema_raw": sys_raw,
                        "peso_um": rec.get("weight_per_meter", 0),
                        "status": status_val,
                        "product_type": "Otro",
                    }).execute()
                    pid = new_prod.data[0]["id"]
                    product_map[ref] = {"id": pid, "reference": ref}
                    result.productsCreated += 1

                # Auto-discover classifications
                for dim, raw_val in [("categoria", cat_raw), ("subcategoria", subcat_raw), ("sistema", sys_raw)]:
                    if raw_val and (dim, raw_val) not in cls_set:
                        sb.table("classifications").insert({
                            "dimension": dim,
                            "original_value": raw_val,
                            "normalized_value": raw_val,
                            "status": "active",
                            "created_by": "import",
                        }).execute()
                        cls_set.add((dim, raw_val))
                        result.classificationsDiscovered += 1

            # ── Step 3: Sync variants (per acabado) ──
            if snapshot_variants:
                for vrec in snapshot_variants:
                    ref = vrec.get("reference", "").strip()
                    acabado_code = vrec.get("acabado_code") or None
                    if not ref:
                        continue

                    pid = (product_map.get(ref) or {}).get("id")
                    if not pid:
                        continue

                    status_val = vrec.get("status", "active")
                    acabado_id = acabado_code_map.get(acabado_code) if acabado_code else None

                    variant_key = (ref, acabado_code)
                    existing = variant_map.get(variant_key)

                    variant_fields = {
                        "acabado_code": acabado_code,
                        "acabado_id": acabado_id,
                        "acabado_name": vrec.get("acabado_name"),
                        "temple": vrec.get("temple") or None,
                        "aleacion": vrec.get("aleacion") or None,
                        "aleacion_code": vrec.get("aleacion_code") or None,
                        "subcategoria_raw": vrec.get("subcategoria_raw"),
                        "categoria_raw": vrec.get("categoria_raw"),
                        "sistema_raw": vrec.get("sistema_raw"),
                        "linea_raw": vrec.get("linea_raw"),
                        "item_id": vrec.get("item_id"),
                        "flag_compra": vrec.get("flag_compra", False),
                        "flag_venta": vrec.get("flag_venta", False),
                        "status": status_val,
                        "updated_at": "now()",
                    }

                    if existing:
                        sb.table("product_variants").update(variant_fields).eq("id", existing["id"]).execute()
                        result.variantsUpdated += 1
                    else:
                        variant_fields["product_id"] = pid
                        variant_fields["reference_siesa"] = ref
                        new_var = sb.table("product_variants").insert(variant_fields).execute()
                        vid = new_var.data[0]["id"]
                        variant_map[variant_key] = {"id": vid, "reference_siesa": ref, "acabado_code": acabado_code, "product_id": pid}
                        result.variantsCreated += 1
            else:
                # Legacy v1 fallback: create one variant per product (no acabado info)
                for rec in snapshot_records:
                    ref = rec.get("reference", "").strip()
                    if not ref:
                        continue
                    pid = (product_map.get(ref) or {}).get("id")
                    if not pid:
                        continue
                    status_val = "active" if rec.get("status", "Activo").lower() in ("activo", "active") else "inactive"
                    variant_key = (ref, None)
                    existing = variant_map.get(variant_key) or variant_map_by_ref.get(ref)
                    if existing:
                        sb.table("product_variants").update({"status": status_val, "updated_at": "now()"}).eq("id", existing["id"]).execute()
                        result.variantsUpdated += 1
                    else:
                        new_var = sb.table("product_variants").insert({"product_id": pid, "reference_siesa": ref, "status": status_val}).execute()
                        result.variantsCreated += 1

            # ── Step 4: Sync warehouse records ──
            if snapshot_warehouse:
                # Refresh variant_map after inserts
                variant_id_lookup = {}
                offset = 0
                while True:
                    batch = sb.table("product_variants").select("id,reference_siesa,acabado_code").range(offset, offset + 999).execute().data or []
                    for v in batch:
                        variant_id_lookup[(v["reference_siesa"], v.get("acabado_code") or None)] = v["id"]
                    if len(batch) < 1000:
                        break
                    offset += 1000

                pw_count = 0
                pw_batch = []
                for wrec in snapshot_warehouse:
                    ref = wrec.get("reference", "").strip()
                    acabado_code = wrec.get("acabado_code") or None
                    bodega = wrec.get("bodega_name", "")
                    if not ref or not bodega:
                        continue
                    wh_id = warehouse_map.get(bodega)
                    vid = variant_id_lookup.get((ref, acabado_code))
                    if not wh_id or not vid:
                        continue
                    pw_batch.append({
                        "variant_id": vid,
                        "warehouse_id": wh_id,
                        "costo_promedio": wrec.get("costo_promedio", 0),
                        "precio_unitario": wrec.get("precio_unitario", 0),
                        "costo_promedio_total": wrec.get("costo_promedio_total", 0),
                        "margen_pct": wrec.get("margen_pct", 0),
                        "unidad_precio": wrec.get("unidad_precio"),
                        "abc_rotacion_veces": wrec.get("abc_rotacion_veces"),
                        "abc_rotacion_costo": wrec.get("abc_rotacion_costo"),
                        "abc_rotacion_veces_bod": wrec.get("abc_rotacion_veces_bod"),
                        "abc_rotacion_costo_bod": wrec.get("abc_rotacion_costo_bod"),
                        "fecha_ultima_venta": wrec.get("fecha_ultima_venta"),
                        "fecha_ultima_entrada": wrec.get("fecha_ultima_entrada"),
                        "fecha_ultima_salida": wrec.get("fecha_ultima_salida"),
                        "fecha_ultima_compra": wrec.get("fecha_ultima_compra"),
                        "fecha_ultimo_conteo": wrec.get("fecha_ultimo_conteo"),
                    })

                # Batch upsert warehouse records
                for i in range(0, len(pw_batch), 500):
                    chunk = pw_batch[i:i + 500]
                    try:
                        sb.table("product_warehouse").upsert(chunk, on_conflict="variant_id,warehouse_id").execute()
                        pw_count += len(chunk)
                    except Exception as e:
                        logger.warning(f"Warehouse upsert error: {e}")
                result.warehouseRecordsUpserted = pw_count

            # ── Step 5: Detect inactivations ──
            for ref in product_map:
                if ref not in refs_in_file:
                    result.refsNotInFile += 1

            for rec in snapshot_records:
                ref = rec.get("reference", "").strip()
                status_val = "active" if rec.get("status", "Activo").lower() in ("activo", "active") else "inactive"
                if status_val == "inactive" and variant_map_by_ref.get(ref):
                    result.refsInactivated += 1

            # ── Step 6: Update upload status ──
            sb.table("file_uploads").update({
                "status": "success",
                "changes_summary": {
                    **(upload.data.get("changes_summary") or {}),
                    "sync_result": {
                        "products_created": result.productsCreated,
                        "products_updated": result.productsUpdated,
                        "variants_created": result.variantsCreated,
                        "variants_updated": result.variantsUpdated,
                        "warehouse_records": result.warehouseRecordsUpserted,
                        "classifications_discovered": result.classificationsDiscovered,
                        "refs_not_in_file": result.refsNotInFile,
                        "refs_inactivated": result.refsInactivated,
                    },
                },
            }).eq("id", upload_id).execute()

            result.message = (
                f"Sync completado: {result.productsCreated} productos nuevos, "
                f"{result.productsUpdated} actualizados, "
                f"{result.variantsCreated} variantes nuevas, "
                f"{result.variantsUpdated} variantes actualizadas, "
                f"{result.warehouseRecordsUpserted} registros bodega, "
                f"{result.classificationsDiscovered} clasificaciones descubiertas"
            )

        except Exception as e:
            logger.error(f"Maestro sync error: {e}", exc_info=True)
            result.status = "error"
            result.errors.append(str(e))
            result.message = f"Error durante sync: {str(e)}"

        return result

    # ══════════════════════════════════════════════════════════════
    # Ventas Sync — Apply parsed ventas to sales + lookup tables
    # ══════════════════════════════════════════════════════════════

    async def apply_ventas_sync(self, upload_id: int) -> SyncResult:
        """
        Apply a previously uploaded ventas file to the database.
        1. Auto-creates missing customers, salespeople, geography entries
        2. Resolves FKs (variant, warehouse, customer, salesperson, geography)
        3. Replaces all rows in `sales` with fresh data from the file
        """
        sb = _sb()
        result = SyncResult(uploadId=upload_id)

        upload = sb.table("file_uploads").select("*").eq("id", upload_id).maybe_single().execute()
        if not upload.data:
            result.status = "error"
            result.message = "Upload no encontrado"
            return result

        if upload.data.get("file_type") != "ventas":
            result.status = "error"
            result.message = f"Solo se puede sincronizar tipo ventas, este es: {upload.data.get('file_type')}"
            return result

        snap = (
            sb.table("file_upload_snapshots")
            .select("snapshot_data")
            .eq("upload_id", upload_id)
            .maybe_single()
            .execute()
        )
        if not snap.data or not snap.data.get("snapshot_data"):
            result.status = "error"
            result.message = "No se encontró snapshot para este upload"
            return result

        records = snap.data["snapshot_data"]
        if not records:
            result.status = "error"
            result.message = "Snapshot vacío"
            return result

        try:
            # ── Step 1: Build lookup maps ──

            # Customers
            existing_custs = sb.table("customers").select("id,siesa_code").execute().data or []
            cust_map = {c["siesa_code"]: c["id"] for c in existing_custs}

            # Salespeople
            existing_sp = sb.table("salespeople").select("id,name").execute().data or []
            sp_map = {s["name"]: s["id"] for s in existing_sp}

            # Geography
            existing_geo = sb.table("geography").select("id,country,department,city").execute().data or []
            geo_map = {(g["country"], g["department"], g["city"]): g["id"] for g in existing_geo}

            # Warehouses
            existing_wh = sb.table("warehouses").select("id,siesa_name").execute().data or []
            wh_map = {w["siesa_name"]: w["id"] for w in existing_wh}

            # Variants (paginated)
            all_variants = []
            offset = 0
            while True:
                batch = sb.table("product_variants").select("id,reference_siesa").range(offset, offset + 999).execute().data
                if not batch:
                    break
                all_variants.extend(batch)
                offset += 1000
            variant_map = {v["reference_siesa"]: v["id"] for v in all_variants if v.get("reference_siesa")}

            # Countries (for geography FK)
            existing_countries = sb.table("countries").select("id,name").execute().data or []
            country_name_map = {c["name"]: c["id"] for c in existing_countries}
            for c in existing_countries:
                country_name_map[c["name"].upper()] = c["id"]

            # ── Step 2: Auto-create missing lookup entries ──

            for rec in records:
                # Customers
                ccode = rec.get("customer_siesa_code", 0)
                if ccode and ccode not in cust_map:
                    new_c = sb.table("customers").insert({
                        "siesa_code": ccode,
                        "name": rec.get("customer_name", ""),
                    }).execute()
                    cust_map[ccode] = new_c.data[0]["id"]
                    result.customersCreated += 1

                # Salespeople
                sp_name = rec.get("salesperson_name", "").strip()
                if sp_name and sp_name not in sp_map:
                    new_sp = sb.table("salespeople").insert({"name": sp_name}).execute()
                    sp_map[sp_name] = new_sp.data[0]["id"]
                    result.salespeopleCreated += 1

                # Geography
                country = rec.get("country", "").strip()
                dept = rec.get("department", "").strip()
                city = rec.get("city", "").strip()
                geo_key = (country, dept, city)
                if country and geo_key not in geo_map:
                    country_id = country_name_map.get(country) or country_name_map.get(country.upper())
                    new_geo = sb.table("geography").insert({
                        "country": country,
                        "department": dept,
                        "city": city,
                        "country_id": country_id,
                    }).execute()
                    geo_map[geo_key] = new_geo.data[0]["id"]
                    result.geographyCreated += 1

            # ── Step 3: Clear existing sales and insert fresh ──

            sb.table("sales").delete().neq("id", 0).execute()

            BATCH_SIZE = 500
            sales_batch = []

            for rec in records:
                ref = rec.get("reference_siesa", "")
                acabado = rec.get("acabado_code")
                var_id = variant_map.get(ref)
                if var_id:
                    result.variantsMatched += 1
                else:
                    result.variantsUnmatched += 1

                country = rec.get("country", "").strip()
                dept = rec.get("department", "").strip()
                city = rec.get("city", "").strip()

                # Convert weight from kg to ton
                weight_kg = rec.get("weight_kg", 0) or 0
                weight_ton = round(weight_kg / 1000, 4)

                # Parse invoice_date to date-only string
                inv_date = rec.get("invoice_date", "")
                if inv_date and "T" in str(inv_date):
                    inv_date = str(inv_date)[:10]

                def date_only(val):
                    if not val:
                        return None
                    return str(val)[:10] if "T" in str(val) else val

                sales_batch.append({
                    "invoice_number": rec.get("invoice_number", ""),
                    "order_number": rec.get("order_number"),
                    "item_siesa": rec.get("item_siesa", 0),
                    "reference_siesa": ref,
                    "acabado_code": acabado,
                    "variant_id": var_id,
                    "customer_id": cust_map.get(rec.get("customer_siesa_code", 0)),
                    "salesperson_id": sp_map.get(rec.get("salesperson_name", "").strip()),
                    "warehouse_id": wh_map.get(rec.get("warehouse_name", "").strip()),
                    "geography_id": geo_map.get((country, dept, city)),
                    "currency": rec.get("currency", "COP"),
                    "invoice_date": inv_date,
                    "order_date": date_only(rec.get("order_date")),
                    "delivery_date": date_only(rec.get("delivery_date")),
                    "item_delivery_date": date_only(rec.get("item_delivery_date")),
                    "quantity": rec.get("quantity", 0),
                    "weight_ton": weight_ton,
                    "unit_price": rec.get("unit_price", 0),
                    "price_per_kg": rec.get("price_per_kg", 0),
                    "subtotal": rec.get("subtotal", 0),
                    "taxes": rec.get("taxes", 0),
                    "net_total": rec.get("net_total", 0),
                    "discounts": rec.get("discounts", 0),
                    "status": rec.get("status", "aprobada"),
                })

                if len(sales_batch) >= BATCH_SIZE:
                    sb.table("sales").insert(sales_batch).execute()
                    result.salesInserted += len(sales_batch)
                    sales_batch = []

            # Insert remaining
            if sales_batch:
                sb.table("sales").insert(sales_batch).execute()
                result.salesInserted += len(sales_batch)

            # ── Step 4: Update upload record ──
            sb.table("file_uploads").update({
                "status": "success",
                "changes_summary": {
                    **(upload.data.get("changes_summary") or {}),
                    "sync_result": {
                        "sales_inserted": result.salesInserted,
                        "customers_created": result.customersCreated,
                        "salespeople_created": result.salespeopleCreated,
                        "geography_created": result.geographyCreated,
                        "variants_matched": result.variantsMatched,
                        "variants_unmatched": result.variantsUnmatched,
                    },
                },
            }).eq("id", upload_id).execute()

            result.message = (
                f"Ventas sync completado: {result.salesInserted:,} líneas insertadas, "
                f"{result.variantsMatched:,} variantes resueltas, "
                f"{result.customersCreated} clientes nuevos, "
                f"{result.salespeopleCreated} vendedores nuevos"
            )

        except Exception as e:
            logger.error(f"Ventas sync error: {e}", exc_info=True)
            result.status = "error"
            result.errors.append(str(e))
            result.message = f"Error durante sync ventas: {str(e)}"

        return result


file_upload_service = FileUploadService()
