"""
Pydantic schemas for the Countries module — CRUD for countries + product availability.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


class AvailabilityStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    planned = "planned"


# ── Country Schemas ──

class CountryItem(BaseModel):
    id: str
    code: str
    name: str
    currency: str = "USD"
    phonePrefix: Optional[str] = None
    flagEmoji: Optional[str] = None
    isActive: bool = True
    displayOrder: int = 0
    warehouseCount: int = 0
    productCount: int = 0
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class CountryStats(BaseModel):
    total: int = 0
    active: int = 0
    inactive: int = 0
    totalProducts: int = 0
    totalWarehouses: int = 0


class CountryListResponse(BaseModel):
    items: list[CountryItem]
    stats: CountryStats


class CountryCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=3, description="ISO country code")
    name: str = Field(..., min_length=1, description="Country name")
    currency: str = Field("USD", min_length=3, max_length=3)
    phonePrefix: Optional[str] = None
    flagEmoji: Optional[str] = None
    displayOrder: int = 0


class CountryUpdateRequest(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    phonePrefix: Optional[str] = None
    flagEmoji: Optional[str] = None
    isActive: Optional[bool] = None
    displayOrder: Optional[int] = None


# ── Product Country Availability Schemas ──

class ProductAvailabilityItem(BaseModel):
    id: str
    productId: int
    countryId: str
    countryCode: Optional[str] = None
    countryName: Optional[str] = None
    countryFlag: Optional[str] = None
    productRef: Optional[str] = None
    productDesc: Optional[str] = None
    status: str = "active"
    localReference: Optional[str] = None
    availableFrom: Optional[str] = None
    notes: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: Optional[str] = None


class ProductAvailabilityListResponse(BaseModel):
    items: list[ProductAvailabilityItem]
    total: int = 0


class BulkAssignRequest(BaseModel):
    """Assign multiple products to one or more countries."""
    productIds: list[int] = Field(..., min_length=1)
    countryIds: list[str] = Field(..., min_length=1)
    status: AvailabilityStatus = AvailabilityStatus.active
    notes: Optional[str] = None


class BulkRemoveRequest(BaseModel):
    """Remove country assignments from products."""
    productIds: list[int] = Field(..., min_length=1)
    countryIds: list[str] = Field(..., min_length=1)


class ProductCountrySummary(BaseModel):
    """Summary of countries assigned to a product."""
    productId: int
    countries: list[dict]  # [{id, code, name, flagEmoji, status}]
