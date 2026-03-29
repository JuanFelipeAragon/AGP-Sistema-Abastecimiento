"""
Warehouses Service — CRUD operations for bodegas/locations.
"""
from typing import Optional
from app.config import get_supabase_client
from app.modules.warehouses.schemas import (
    WarehouseListParams,
    WarehouseListResponse,
    WarehouseItem,
    WarehouseStats,
    WarehouseCreateRequest,
    WarehouseUpdateRequest,
    WarehouseBulkActionRequest,
)


def _sb():
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client not configured")
    return client


def _parse_tags(raw) -> list[str]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            import json
            return json.loads(raw)
        except Exception:
            return []
    return []


def _row_to_item(row: dict, pw_count: int = 0, inv_summary: dict = None) -> WarehouseItem:
    return WarehouseItem(
        id=row["id"],
        name=row["name"],
        code=row.get("code"),
        city=row.get("city"),
        country=row.get("country"),
        address=row.get("address"),
        type=row.get("type"),
        isPhysical=row.get("is_physical", True),
        purpose=row.get("purpose", "storage"),
        siesaName=row.get("siesa_name"),
        notes=row.get("notes"),
        displayOrder=row.get("display_order", 0),
        isActive=row.get("is_active", True),
        contactName=row.get("contact_name"),
        contactPhone=row.get("contact_phone"),
        contactEmail=row.get("contact_email"),
        capacityM2=row.get("capacity_m2"),
        monthlyCostCop=row.get("monthly_cost_cop"),
        isThirdParty=row.get("is_third_party", False),
        lastAuditDate=row.get("last_audit_date"),
        tags=_parse_tags(row.get("tags")),
        productWarehouseCount=pw_count,
        inventorySummary=inv_summary,
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


class WarehouseService:

    async def get_warehouses(self, params: WarehouseListParams) -> WarehouseListResponse:
        sb = _sb()
        query = sb.table("warehouses").select("*")

        if params.search:
            query = query.or_(
                f"name.ilike.%{params.search}%,"
                f"code.ilike.%{params.search}%,"
                f"city.ilike.%{params.search}%,"
                f"siesa_name.ilike.%{params.search}%"
            )
        if params.purpose:
            query = query.eq("purpose", params.purpose)
        if params.is_physical is not None:
            query = query.eq("is_physical", params.is_physical)
        if params.is_active is not None:
            query = query.eq("is_active", params.is_active)

        # Sort
        sort_field = params.sort_field or "display_order"
        sort_map = {
            "name": "name",
            "code": "code",
            "city": "city",
            "purpose": "purpose",
            "displayOrder": "display_order",
            "isActive": "is_active",
            "isPhysical": "is_physical",
        }
        db_field = sort_map.get(sort_field, sort_field)
        sort_desc = params.sort_order.value == "desc"
        query = query.order(db_field, desc=sort_desc)

        result = query.execute()
        rows = result.data or []

        # Get product_warehouse counts per warehouse
        pw_query = sb.table("product_warehouse").select("warehouse_id")
        pw_result = pw_query.execute()
        pw_counts: dict[int, int] = {}
        for pw in (pw_result.data or []):
            wid = pw["warehouse_id"]
            pw_counts[wid] = pw_counts.get(wid, 0) + 1

        # Fetch inventory summary via RPC
        inv_map: dict[int, dict] = {}
        try:
            inv_result = sb.rpc("get_warehouse_inventory_summary", {}).execute()
            for inv in (inv_result.data or []):
                inv_map[inv["warehouse_id"]] = {
                    "totalProducts": inv.get("total_products", 0),
                    "totalQuantity": inv.get("total_quantity", 0),
                    "totalValueCop": float(inv.get("total_value_cop", 0)),
                }
        except Exception:
            pass  # RPC may not exist yet; gracefully degrade

        items = [
            _row_to_item(row, pw_counts.get(row["id"], 0), inv_map.get(row["id"]))
            for row in rows
        ]

        # Compute stats from ALL warehouses (not filtered)
        all_query = sb.table("warehouses").select("id,is_physical,is_active,purpose")
        all_result = all_query.execute()
        all_rows = all_result.data or []
        stats = WarehouseStats(
            total=len(all_rows),
            physical=sum(1 for r in all_rows if r.get("is_physical")),
            virtual=sum(1 for r in all_rows if not r.get("is_physical")),
            active=sum(1 for r in all_rows if r.get("is_active")),
            inactive=sum(1 for r in all_rows if not r.get("is_active")),
            storage=sum(1 for r in all_rows if r.get("purpose") == "storage"),
            transit=sum(1 for r in all_rows if r.get("purpose") == "transit"),
            damaged=sum(1 for r in all_rows if r.get("purpose") == "damaged"),
            external=sum(1 for r in all_rows if r.get("purpose") == "external"),
        )

        return WarehouseListResponse(items=items, stats=stats)

    async def get_warehouse_by_id(self, warehouse_id: int) -> Optional[WarehouseItem]:
        sb = _sb()
        result = sb.table("warehouses").select("*").eq("id", warehouse_id).maybe_single().execute()
        if not result.data:
            return None

        # Count product_warehouse records
        pw_result = sb.table("product_warehouse").select("id", count="exact").eq("warehouse_id", warehouse_id).execute()
        pw_count = pw_result.count if pw_result.count is not None else 0

        return _row_to_item(result.data, pw_count)

    async def create_warehouse(self, data: WarehouseCreateRequest) -> WarehouseItem:
        sb = _sb()
        record = {
            "name": data.name,
            "code": data.code,
            "city": data.city,
            "country": data.country,
            "address": data.address,
            "type": data.type,
            "is_physical": data.isPhysical,
            "purpose": data.purpose.value,
            "siesa_name": data.siesaName or data.name,
            "notes": data.notes,
            "display_order": data.displayOrder,
            "is_active": True,
            "contact_name": data.contactName,
            "contact_phone": data.contactPhone,
            "contact_email": data.contactEmail,
            "capacity_m2": data.capacityM2,
            "monthly_cost_cop": data.monthlyCostCop,
            "is_third_party": data.isThirdParty,
            "last_audit_date": data.lastAuditDate,
            "tags": data.tags,
        }
        result = sb.table("warehouses").insert(record).execute()
        return _row_to_item(result.data[0])

    async def update_warehouse(
        self, warehouse_id: int, data: WarehouseUpdateRequest
    ) -> Optional[WarehouseItem]:
        sb = _sb()

        current = sb.table("warehouses").select("*").eq("id", warehouse_id).maybe_single().execute()
        if not current.data:
            return None

        updates: dict = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.code is not None:
            updates["code"] = data.code
        if data.city is not None:
            updates["city"] = data.city
        if data.country is not None:
            updates["country"] = data.country
        if data.address is not None:
            updates["address"] = data.address
        if data.type is not None:
            updates["type"] = data.type
        if data.isPhysical is not None:
            updates["is_physical"] = data.isPhysical
        if data.purpose is not None:
            updates["purpose"] = data.purpose.value
        if data.siesaName is not None:
            updates["siesa_name"] = data.siesaName
        if data.notes is not None:
            updates["notes"] = data.notes
        if data.displayOrder is not None:
            updates["display_order"] = data.displayOrder
        if data.isActive is not None:
            updates["is_active"] = data.isActive
        if data.contactName is not None:
            updates["contact_name"] = data.contactName
        if data.contactPhone is not None:
            updates["contact_phone"] = data.contactPhone
        if data.contactEmail is not None:
            updates["contact_email"] = data.contactEmail
        if data.capacityM2 is not None:
            updates["capacity_m2"] = data.capacityM2
        if data.monthlyCostCop is not None:
            updates["monthly_cost_cop"] = data.monthlyCostCop
        if data.isThirdParty is not None:
            updates["is_third_party"] = data.isThirdParty
        if data.lastAuditDate is not None:
            updates["last_audit_date"] = data.lastAuditDate
        if data.tags is not None:
            updates["tags"] = data.tags

        if not updates:
            return _row_to_item(current.data)

        result = sb.table("warehouses").update(updates).eq("id", warehouse_id).execute()
        if not result.data:
            return None
        return _row_to_item(result.data[0])

    async def bulk_action(self, action_data: WarehouseBulkActionRequest) -> dict:
        sb = _sb()
        affected = 0
        action = action_data.action.value

        if action in ("activate", "inactivate"):
            is_active = action == "activate"
            for wid in action_data.ids:
                sb.table("warehouses").update({"is_active": is_active}).eq("id", wid).execute()
                affected += 1
        elif action == "export":
            items = []
            for wid in action_data.ids:
                result = sb.table("warehouses").select("*").eq("id", wid).execute()
                if result.data:
                    items.append(result.data[0])
            return {
                "action": "export",
                "affected": len(items),
                "items": items,
                "message": f"Exportando {len(items)} bodegas",
            }

        return {
            "action": action,
            "affected": affected,
            "message": f"Accion '{action}' aplicada a {affected} bodega(s)",
        }


warehouse_service = WarehouseService()
