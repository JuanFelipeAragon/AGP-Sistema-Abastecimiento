"""
Countries Router — CRUD endpoints for countries + product availability.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.dependencies import require_permissions
from app.modules.countries.service import countries_service
from app.modules.countries.schemas import (
    CountryListResponse,
    CountryItem,
    CountryCreateRequest,
    CountryUpdateRequest,
    ProductAvailabilityListResponse,
    BulkAssignRequest,
    BulkRemoveRequest,
    ProductCountrySummary,
)

router = APIRouter(prefix="/api/countries", tags=["countries"])


# ── Countries CRUD ──

@router.get("", response_model=CountryListResponse)
async def list_countries(
    include_inactive: bool = Query(False),
    user=Depends(require_permissions(["settings"])),
):
    """List all countries with stats."""
    return await countries_service.get_countries(include_inactive=include_inactive)


@router.get("/simple")
async def list_countries_simple(
    user=Depends(require_permissions(["products"])),
):
    """Get minimal country list for dropdowns (any products-level user)."""
    return await countries_service.get_all_countries_simple()


@router.get("/{country_id}", response_model=CountryItem)
async def get_country(
    country_id: str,
    user=Depends(require_permissions(["settings"])),
):
    """Get a single country by ID."""
    result = await countries_service.get_country_by_id(country_id)
    if not result:
        raise HTTPException(status_code=404, detail="Pais no encontrado")
    return result


@router.post("", response_model=CountryItem)
async def create_country(
    data: CountryCreateRequest,
    user=Depends(require_permissions(["settings"])),
):
    """Create a new country."""
    return await countries_service.create_country(data)


@router.put("/{country_id}", response_model=CountryItem)
async def update_country(
    country_id: str,
    data: CountryUpdateRequest,
    user=Depends(require_permissions(["settings"])),
):
    """Update a country."""
    result = await countries_service.update_country(country_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Pais no encontrado")
    return result


# ── Product Country Availability ──

@router.get("/availability/list", response_model=ProductAvailabilityListResponse)
async def list_availability(
    product_id: Optional[int] = Query(None),
    country_id: Optional[str] = Query(None),
    user=Depends(require_permissions(["products"])),
):
    """List product-country availability records."""
    return await countries_service.get_product_availability(
        product_id=product_id, country_id=country_id
    )


@router.get("/availability/product/{product_id}", response_model=ProductCountrySummary)
async def get_product_countries(
    product_id: int,
    user=Depends(require_permissions(["products"])),
):
    """Get countries assigned to a product."""
    return await countries_service.get_product_countries(product_id)


@router.post("/availability/assign")
async def bulk_assign(
    data: BulkAssignRequest,
    user=Depends(require_permissions(["products"])),
):
    """Assign products to countries (bulk)."""
    return await countries_service.bulk_assign_countries(
        data, user_name=user.get("name", "system")
    )


@router.post("/availability/remove")
async def bulk_remove(
    data: BulkRemoveRequest,
    user=Depends(require_permissions(["products"])),
):
    """Remove product-country assignments (bulk)."""
    return await countries_service.bulk_remove_countries(data)
