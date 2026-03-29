"""
Countries Service — CRUD for countries + product country availability.
"""
import logging
from typing import Optional
from app.config import get_supabase_client
from app.modules.countries.schemas import (
    CountryItem,
    CountryStats,
    CountryListResponse,
    CountryCreateRequest,
    CountryUpdateRequest,
    ProductAvailabilityItem,
    ProductAvailabilityListResponse,
    BulkAssignRequest,
    BulkRemoveRequest,
    ProductCountrySummary,
)

logger = logging.getLogger("agp.countries")


def _sb():
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client not configured")
    return client


def _row_to_country(row: dict, wh_count: int = 0, prod_count: int = 0) -> CountryItem:
    return CountryItem(
        id=str(row["id"]),
        code=row["code"],
        name=row["name"],
        currency=row.get("currency", "USD"),
        phonePrefix=row.get("phone_prefix"),
        flagEmoji=row.get("flag_emoji"),
        isActive=row.get("is_active", True),
        displayOrder=row.get("display_order", 0),
        warehouseCount=wh_count,
        productCount=prod_count,
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


class CountriesService:

    # ── Country CRUD ──

    async def get_countries(self, include_inactive: bool = False) -> CountryListResponse:
        sb = _sb()
        query = sb.table("countries").select("*").order("display_order").order("name")
        if not include_inactive:
            query = query.eq("is_active", True)
        result = query.execute()
        rows = result.data or []

        # Count warehouses per country
        wh_result = sb.table("warehouses").select("country_id").execute()
        wh_counts: dict[str, int] = {}
        for wh in (wh_result.data or []):
            cid = str(wh.get("country_id") or "")
            if cid:
                wh_counts[cid] = wh_counts.get(cid, 0) + 1

        # Count products per country (via availability)
        pca_result = sb.table("product_country_availability").select("country_id").eq("status", "active").execute()
        prod_counts: dict[str, int] = {}
        for pca in (pca_result.data or []):
            cid = str(pca.get("country_id") or "")
            if cid:
                prod_counts[cid] = prod_counts.get(cid, 0) + 1

        items = [
            _row_to_country(row, wh_counts.get(str(row["id"]), 0), prod_counts.get(str(row["id"]), 0))
            for row in rows
        ]

        # Stats from ALL countries (not filtered)
        all_result = sb.table("countries").select("id,is_active").execute()
        all_rows = all_result.data or []

        stats = CountryStats(
            total=len(all_rows),
            active=sum(1 for r in all_rows if r.get("is_active")),
            inactive=sum(1 for r in all_rows if not r.get("is_active")),
            totalProducts=sum(prod_counts.values()),
            totalWarehouses=sum(wh_counts.values()),
        )

        return CountryListResponse(items=items, stats=stats)

    async def get_country_by_id(self, country_id: str) -> Optional[CountryItem]:
        sb = _sb()
        result = sb.table("countries").select("*").eq("id", country_id).maybe_single().execute()
        if not result.data:
            return None
        return _row_to_country(result.data)

    async def create_country(self, data: CountryCreateRequest) -> CountryItem:
        sb = _sb()
        record = {
            "code": data.code.upper(),
            "name": data.name,
            "currency": data.currency.upper(),
            "phone_prefix": data.phonePrefix,
            "flag_emoji": data.flagEmoji,
            "display_order": data.displayOrder,
            "is_active": True,
        }
        result = sb.table("countries").insert(record).execute()
        return _row_to_country(result.data[0])

    async def update_country(self, country_id: str, data: CountryUpdateRequest) -> Optional[CountryItem]:
        sb = _sb()
        current = sb.table("countries").select("*").eq("id", country_id).maybe_single().execute()
        if not current.data:
            return None

        updates: dict = {}
        if data.name is not None:
            updates["name"] = data.name
        if data.currency is not None:
            updates["currency"] = data.currency.upper()
        if data.phonePrefix is not None:
            updates["phone_prefix"] = data.phonePrefix
        if data.flagEmoji is not None:
            updates["flag_emoji"] = data.flagEmoji
        if data.isActive is not None:
            updates["is_active"] = data.isActive
        if data.displayOrder is not None:
            updates["display_order"] = data.displayOrder

        if not updates:
            return _row_to_country(current.data)

        result = sb.table("countries").update(updates).eq("id", country_id).execute()
        if not result.data:
            return None
        return _row_to_country(result.data[0])

    # ── Product Country Availability ──

    async def get_product_availability(
        self, product_id: Optional[int] = None, country_id: Optional[str] = None
    ) -> ProductAvailabilityListResponse:
        sb = _sb()
        query = sb.table("product_country_availability").select(
            "*, country:countries(code, name, flag_emoji), product:products(reference, description)"
        )
        if product_id:
            query = query.eq("product_id", product_id)
        if country_id:
            query = query.eq("country_id", country_id)

        query = query.order("created_at", desc=True)
        result = query.execute()
        rows = result.data or []

        items = []
        for row in rows:
            country = row.get("country") or {}
            product = row.get("product") or {}
            items.append(ProductAvailabilityItem(
                id=str(row["id"]),
                productId=row["product_id"],
                countryId=str(row["country_id"]),
                countryCode=country.get("code"),
                countryName=country.get("name"),
                countryFlag=country.get("flag_emoji"),
                productRef=product.get("reference"),
                productDesc=product.get("description"),
                status=row.get("status", "active"),
                localReference=row.get("local_reference"),
                availableFrom=row.get("available_from"),
                notes=row.get("notes"),
                createdBy=row.get("created_by"),
                createdAt=row.get("created_at"),
            ))

        return ProductAvailabilityListResponse(items=items, total=len(items))

    async def bulk_assign_countries(self, data: BulkAssignRequest, user_name: str = "system") -> dict:
        sb = _sb()
        inserted = 0
        skipped = 0

        for pid in data.productIds:
            for cid in data.countryIds:
                try:
                    # Check if exists
                    existing = sb.table("product_country_availability").select("id").eq(
                        "product_id", pid
                    ).eq("country_id", cid).maybe_single().execute()

                    if existing.data:
                        # Update status
                        sb.table("product_country_availability").update({
                            "status": data.status.value,
                            "notes": data.notes,
                        }).eq("id", existing.data["id"]).execute()
                    else:
                        sb.table("product_country_availability").insert({
                            "product_id": pid,
                            "country_id": cid,
                            "status": data.status.value,
                            "notes": data.notes,
                            "created_by": user_name,
                        }).execute()
                    inserted += 1
                except Exception as e:
                    logger.warning(f"Skip assign pid={pid} cid={cid}: {e}")
                    skipped += 1

        return {
            "action": "bulk_assign",
            "inserted": inserted,
            "skipped": skipped,
            "message": f"{inserted} asignaciones creadas, {skipped} omitidas",
        }

    async def bulk_remove_countries(self, data: BulkRemoveRequest) -> dict:
        sb = _sb()
        removed = 0
        for pid in data.productIds:
            for cid in data.countryIds:
                try:
                    sb.table("product_country_availability").delete().eq(
                        "product_id", pid
                    ).eq("country_id", cid).execute()
                    removed += 1
                except Exception:
                    pass

        return {
            "action": "bulk_remove",
            "removed": removed,
            "message": f"{removed} asignaciones eliminadas",
        }

    async def get_product_countries(self, product_id: int) -> ProductCountrySummary:
        """Get countries assigned to a specific product."""
        sb = _sb()
        result = sb.table("product_country_availability").select(
            "status, country:countries(id, code, name, flag_emoji)"
        ).eq("product_id", product_id).execute()

        countries = []
        for row in (result.data or []):
            c = row.get("country") or {}
            countries.append({
                "id": str(c.get("id", "")),
                "code": c.get("code"),
                "name": c.get("name"),
                "flagEmoji": c.get("flag_emoji"),
                "status": row.get("status", "active"),
            })

        return ProductCountrySummary(productId=product_id, countries=countries)

    async def get_all_countries_simple(self) -> list[dict]:
        """Get minimal country list for dropdowns."""
        sb = _sb()
        result = sb.table("countries").select(
            "id, code, name, flag_emoji, currency"
        ).eq("is_active", True).order("display_order").order("name").execute()
        return [
            {
                "id": str(r["id"]),
                "code": r["code"],
                "name": r["name"],
                "flagEmoji": r.get("flag_emoji"),
                "currency": r.get("currency"),
            }
            for r in (result.data or [])
        ]


countries_service = CountriesService()
