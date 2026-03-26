"""
Transit Service — Business logic for transit/shipment data.

Delegates to ProductsService for data access, providing a dedicated
entry point for the transit module.
"""
import logging
from typing import Optional

from app.modules.products.service import products_service
from app.modules.products.schemas import TransitListResponse

logger = logging.getLogger("agp.transit")


class TransitService:
    """
    Service layer for the Transit module.
    Wraps ProductsService.get_transit for module separation.
    """

    async def get_transit(
        self,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        sort_field: Optional[str] = None,
        sort_order: str = "asc",
    ) -> TransitListResponse:
        """Get paginated transit data with search and sorting."""
        return await products_service.get_transit(
            search=search,
            page=page,
            page_size=page_size,
            sort_field=sort_field,
            sort_order=sort_order,
        )


# ── Singleton instance ──
transit_service = TransitService()
