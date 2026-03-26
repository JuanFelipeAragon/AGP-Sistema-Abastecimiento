"""
Pydantic schemas for SKU catalog.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SkuBase(BaseModel):
    reference: str
    description: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    system: Optional[str] = None
    abc_class: Optional[str] = "C"
    unit_cost: float = 0
    weight_per_meter: float = 0
    is_active: bool = True


class SkuCreate(SkuBase):
    pass


class SkuResponse(SkuBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SkuListResponse(BaseModel):
    items: list[SkuResponse]
    total: int
    page: int
    page_size: int
