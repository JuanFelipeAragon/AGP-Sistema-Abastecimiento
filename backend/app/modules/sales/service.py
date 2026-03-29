"""
Sales Service — Read queries for sales (via sales_enriched view),
customers, salespeople, geography. Sales data is read-only (from Siesa).
Customers/salespeople support activate/inactivate.
"""
from typing import Optional
from app.config import get_supabase_client
from app.modules.sales.schemas import (
    SalesListParams,
    SalesListResponse,
    SaleItem,
    SalesSummaryResponse,
    SalesFilterOptions,
    FilterOptionItem,
    CustomerListParams,
    CustomerListResponse,
    CustomerWithStats,
    CustomerBulkActionRequest,
    SalespersonListParams,
    SalespersonListResponse,
    SalespersonWithStats,
    SalespersonBulkActionRequest,
    GeographyListParams,
    GeographyListResponse,
    GeographyWithStats,
)


def _sb():
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client not configured")
    return client


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(val, default=0) -> int:
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _row_to_sale(row: dict) -> SaleItem:
    """Map a sales_enriched view row to SaleItem (all columns are flat)."""
    return SaleItem(
        id=row["id"],
        invoiceNumber=row.get("invoice_number"),
        orderNumber=row.get("order_number"),
        itemSiesa=row.get("item_siesa"),
        referenceSiesa=row.get("reference_siesa", ""),
        acabadoCode=row.get("acabado_code"),
        variantId=row.get("variant_id"),
        customerId=row.get("customer_id"),
        customerName=row.get("customer_name"),
        salespersonId=row.get("salesperson_id"),
        salespersonName=row.get("salesperson_name"),
        warehouseId=row.get("warehouse_id"),
        warehouseName=row.get("warehouse_name"),
        geographyId=row.get("geography_id"),
        country=row.get("country"),
        department=row.get("department"),
        city=row.get("city"),
        categoriaRaw=row.get("categoria_raw"),
        subcategoriaRaw=row.get("subcategoria_raw"),
        sistemaRaw=row.get("sistema_raw"),
        docType=row.get("doc_type"),
        docPrefix=row.get("doc_prefix"),
        invoiceDate=row.get("invoice_date"),
        orderDate=row.get("order_date"),
        deliveryDate=row.get("delivery_date"),
        itemDeliveryDate=row.get("item_delivery_date"),
        currency=row.get("currency", "COP"),
        quantity=_safe_int(row.get("quantity")),
        weightTon=_safe_float(row.get("weight_ton")),
        unitPrice=_safe_float(row.get("unit_price")),
        pricePerKg=_safe_float(row.get("price_per_kg")),
        subtotal=_safe_float(row.get("subtotal")),
        taxes=_safe_float(row.get("taxes")),
        netTotal=_safe_float(row.get("net_total")),
        discounts=_safe_float(row.get("discounts")),
        status=row.get("status", "aprobada"),
    )


# Flat column list from the sales_enriched view
SELECT_ENRICHED = """
    id, invoice_number, order_number, item_siesa, reference_siesa, acabado_code,
    variant_id, customer_id, salesperson_id, warehouse_id, geography_id,
    invoice_date, order_date, delivery_date, item_delivery_date,
    currency, quantity, weight_ton, unit_price, price_per_kg,
    subtotal, taxes, net_total, discounts, status,
    customer_name, salesperson_name, warehouse_name,
    country, department, city,
    categoria_raw, subcategoria_raw, sistema_raw,
    invoice_year, invoice_quarter, invoice_month,
    doc_type, doc_prefix
"""

SORT_MAP = {
    "invoiceDate": "invoice_date",
    "invoiceNumber": "invoice_number",
    "referenceSiesa": "reference_siesa",
    "customerName": "customer_name",
    "salespersonName": "salesperson_name",
    "quantity": "quantity",
    "netTotal": "net_total",
    "subtotal": "subtotal",
    "weightTon": "weight_ton",
    "currency": "currency",
    "status": "status",
    "sistemaRaw": "sistema_raw",
    "categoriaRaw": "categoria_raw",
    "docType": "doc_type",
}


class SalesService:

    # ── Sales list (from sales_enriched view) ──

    async def get_sales(self, params: SalesListParams) -> SalesListResponse:
        sb = _sb()
        query = sb.table("sales_enriched").select(SELECT_ENRICHED, count="exact")

        # Text search
        if params.search:
            s = params.search.strip()
            query = query.or_(
                f"invoice_number.ilike.%{s}%,"
                f"reference_siesa.ilike.%{s}%,"
                f"acabado_code.ilike.%{s}%,"
                f"customer_name.ilike.%{s}%"
            )
        # Date range
        if params.date_from:
            query = query.gte("invoice_date", params.date_from)
        if params.date_to:
            query = query.lte("invoice_date", params.date_to)
        # Simple filters
        if params.currency:
            query = query.eq("currency", params.currency)
        if params.status:
            query = query.eq("status", params.status)
        if params.customer_id:
            query = query.eq("customer_id", params.customer_id)
        if params.salesperson_id:
            query = query.eq("salesperson_id", params.salesperson_id)
        if params.warehouse_id:
            query = query.eq("warehouse_id", params.warehouse_id)
        # Time period filters
        if params.year:
            query = query.eq("invoice_year", params.year)
        if params.quarter:
            query = query.eq("invoice_quarter", params.quarter)
        if params.month:
            query = query.eq("invoice_month", params.month)
        # Product dimension filters
        if params.sistema:
            query = query.eq("sistema_raw", params.sistema)
        if params.subcategoria:
            query = query.eq("subcategoria_raw", params.subcategoria)
        if params.categoria:
            query = query.eq("categoria_raw", params.categoria)
        if params.doc_type:
            query = query.eq("doc_type", params.doc_type)

        # Sort
        sort_field = SORT_MAP.get(params.sort_field or "invoiceDate", "invoice_date")
        sort_desc = params.sort_order.value == "desc"
        query = query.order(sort_field, desc=sort_desc)

        # Pagination
        page = max(1, params.page)
        page_size = min(200, max(1, params.page_size))
        from_row = (page - 1) * page_size
        to_row = from_row + page_size - 1
        query = query.range(from_row, to_row)

        result = query.execute()
        rows = result.data or []
        total = result.count or 0
        pages = max(1, (total + page_size - 1) // page_size)

        return SalesListResponse(
            items=[_row_to_sale(r) for r in rows],
            total=total,
            page=page,
            pageSize=page_size,
            pages=pages,
        )

    async def get_sale_by_id(self, sale_id: int) -> Optional[SaleItem]:
        sb = _sb()
        result = (
            sb.table("sales_enriched")
            .select(SELECT_ENRICHED)
            .eq("id", sale_id)
            .maybe_single()
            .execute()
        )
        if not result.data:
            return None
        return _row_to_sale(result.data)

    # ── Summary / KPIs via RPC ──

    async def get_summary(self, params: SalesListParams) -> SalesSummaryResponse:
        sb = _sb()
        try:
            rpc_params: dict = {}
            if params.date_from:
                rpc_params["p_date_from"] = params.date_from
            if params.date_to:
                rpc_params["p_date_to"] = params.date_to
            if params.currency:
                rpc_params["p_currency"] = params.currency
            if params.status:
                rpc_params["p_status"] = params.status
            if params.customer_id:
                rpc_params["p_customer_id"] = params.customer_id
            if params.salesperson_id:
                rpc_params["p_salesperson_id"] = params.salesperson_id
            if params.warehouse_id:
                rpc_params["p_warehouse_id"] = params.warehouse_id
            if params.year:
                rpc_params["p_year"] = params.year
            if params.quarter:
                rpc_params["p_quarter"] = params.quarter
            if params.month:
                rpc_params["p_month"] = params.month
            if params.sistema:
                rpc_params["p_sistema"] = params.sistema
            if params.subcategoria:
                rpc_params["p_subcategoria"] = params.subcategoria
            if params.categoria:
                rpc_params["p_categoria"] = params.categoria
            if params.doc_type:
                rpc_params["p_doc_type"] = params.doc_type

            result = sb.rpc("get_sales_summary", rpc_params).execute()
            data = result.data[0] if result.data else {}
            return SalesSummaryResponse(
                totalInvoices=_safe_int(data.get("total_invoices")),
                uniqueInvoices=_safe_int(data.get("unique_invoices")),
                totalQuantity=_safe_int(data.get("total_quantity")),
                totalWeightTon=_safe_float(data.get("total_weight_ton")),
                subtotalCop=_safe_float(data.get("subtotal_cop")),
                subtotalUsd=_safe_float(data.get("subtotal_usd")),
                totalNetCop=_safe_float(data.get("total_net_cop")),
                totalNetUsd=_safe_float(data.get("total_net_usd")),
                uniqueCustomers=_safe_int(data.get("unique_customers")),
                uniqueReferences=_safe_int(data.get("unique_references")),
                dateFrom=data.get("date_from"),
                dateTo=data.get("date_to"),
            )
        except Exception as e:
            print(f"[SalesService] get_summary RPC error: {e}")
            return SalesSummaryResponse()

    # ── Filter options via RPC ──

    async def get_filter_options(self) -> SalesFilterOptions:
        sb = _sb()
        try:
            result = sb.rpc("get_sales_filter_options", {}).execute()
            # RPC returning json type: unwrap from various Supabase response formats
            raw = result.data
            print(f"[SalesService] filter-options raw type={type(raw).__name__}, repr={repr(raw)[:300]}")
            if isinstance(raw, list) and len(raw) > 0:
                first = raw[0]
                # Supabase wraps json return in {"function_name": {...}}
                if isinstance(first, dict) and "get_sales_filter_options" in first:
                    raw = first["get_sales_filter_options"]
                elif isinstance(first, dict):
                    raw = first
                elif isinstance(first, str):
                    import json as _json
                    raw = _json.loads(first)
            if isinstance(raw, str):
                import json as _json
                raw = _json.loads(raw)
            data = raw if isinstance(raw, dict) else {}
            print(f"[SalesService] filter-options parsed keys={list(data.keys())[:5]}")
            return SalesFilterOptions(
                currencies=data.get("currencies") or [],
                statuses=data.get("statuses") or [],
                years=[int(y) for y in (data.get("years") or [])],
                vendedores=[FilterOptionItem(**v) for v in (data.get("vendedores") or [])],
                clientes=[FilterOptionItem(**c) for c in (data.get("clientes") or [])],
                bodegas=[FilterOptionItem(**b) for b in (data.get("bodegas") or [])],
                sistemas=data.get("sistemas") or [],      # [{value, count}]
                subcategorias=data.get("subcategorias") or [],  # [{value, count}]
                categorias=data.get("categorias") or [],   # [{value, count}]
                doc_types=data.get("doc_types") or [],     # [{value, count}]
            )
        except Exception as e:
            print(f"[SalesService] get_filter_options RPC error: {e}")
            return SalesFilterOptions()

    # ── Customers ──

    async def get_customers(self, params: CustomerListParams) -> CustomerListResponse:
        sb = _sb()
        try:
            result = sb.rpc("get_customers_with_stats", {}).execute()
            rows = result.data or []
        except Exception:
            q = sb.table("customers").select("*")
            result = q.execute()
            rows = [
                {**r, "total_sales": 0, "total_net_cop": 0, "total_net_usd": 0,
                 "total_weight_ton": 0, "last_invoice_date": None}
                for r in (result.data or [])
            ]

        if params.search:
            s = params.search.lower()
            rows = [r for r in rows if s in str(r.get("name", "")).lower()
                    or s in str(r.get("siesa_code", ""))]
        if params.is_active is not None:
            rows = [r for r in rows if r.get("is_active") == params.is_active]

        sort_key = params.sort_field or "name"
        reverse = params.sort_order.value == "desc"
        db_sort = {"name": "name", "totalSales": "total_sales",
                   "totalNetCop": "total_net_cop", "totalWeightTon": "total_weight_ton"}
        rows.sort(key=lambda r: (r.get(db_sort.get(sort_key, sort_key)) or ""), reverse=reverse)

        items = [
            CustomerWithStats(
                id=r["id"],
                siesaCode=r.get("siesa_code"),
                name=r.get("name", ""),
                isActive=r.get("is_active", True),
                totalSales=_safe_int(r.get("total_sales")),
                totalNetCop=_safe_float(r.get("total_net_cop")),
                totalNetUsd=_safe_float(r.get("total_net_usd")),
                totalWeightTon=_safe_float(r.get("total_weight_ton")),
                lastInvoiceDate=r.get("last_invoice_date"),
            )
            for r in rows
        ]
        return CustomerListResponse(items=items, total=len(items))

    async def get_customer_by_id(self, customer_id: int) -> Optional[CustomerWithStats]:
        sb = _sb()
        result = sb.table("customers").select("*").eq("id", customer_id).maybe_single().execute()
        if not result.data:
            return None
        r = result.data
        return CustomerWithStats(
            id=r["id"], siesaCode=r.get("siesa_code"),
            name=r.get("name", ""), isActive=r.get("is_active", True),
        )

    async def bulk_customers(self, action_data: CustomerBulkActionRequest) -> dict:
        sb = _sb()
        is_active = action_data.action.value == "activate"
        for cid in action_data.ids:
            sb.table("customers").update({"is_active": is_active}).eq("id", cid).execute()
        return {
            "action": action_data.action.value,
            "affected": len(action_data.ids),
            "message": f"Acción '{action_data.action.value}' aplicada a {len(action_data.ids)} cliente(s)",
        }

    # ── Salespeople ──

    async def get_salespeople(self, params: SalespersonListParams) -> SalespersonListResponse:
        sb = _sb()
        try:
            result = sb.rpc("get_salespeople_with_stats", {}).execute()
            rows = result.data or []
        except Exception:
            q = sb.table("salespeople").select("*")
            result = q.execute()
            rows = [
                {**r, "total_sales": 0, "total_net_cop": 0, "total_net_usd": 0,
                 "unique_customers": 0, "total_weight_ton": 0, "last_invoice_date": None}
                for r in (result.data or [])
            ]

        if params.search:
            s = params.search.lower()
            rows = [r for r in rows if s in str(r.get("name", "")).lower()]
        if params.is_active is not None:
            rows = [r for r in rows if r.get("is_active") == params.is_active]

        sort_key = params.sort_field or "name"
        reverse = params.sort_order.value == "desc"
        db_sort = {"name": "name", "totalSales": "total_sales", "totalNetCop": "total_net_cop"}
        rows.sort(key=lambda r: (r.get(db_sort.get(sort_key, sort_key)) or ""), reverse=reverse)

        items = [
            SalespersonWithStats(
                id=r["id"], name=r.get("name", ""),
                isActive=r.get("is_active", True),
                totalSales=_safe_int(r.get("total_sales")),
                totalNetCop=_safe_float(r.get("total_net_cop")),
                totalNetUsd=_safe_float(r.get("total_net_usd")),
                uniqueCustomers=_safe_int(r.get("unique_customers")),
                totalWeightTon=_safe_float(r.get("total_weight_ton")),
                lastInvoiceDate=r.get("last_invoice_date"),
            )
            for r in rows
        ]
        return SalespersonListResponse(items=items, total=len(items))

    async def get_salesperson_by_id(self, sp_id: int) -> Optional[SalespersonWithStats]:
        sb = _sb()
        result = sb.table("salespeople").select("*").eq("id", sp_id).maybe_single().execute()
        if not result.data:
            return None
        r = result.data
        return SalespersonWithStats(
            id=r["id"], name=r.get("name", ""), isActive=r.get("is_active", True),
        )

    async def bulk_salespeople(self, action_data: SalespersonBulkActionRequest) -> dict:
        sb = _sb()
        is_active = action_data.action.value == "activate"
        for sp_id in action_data.ids:
            sb.table("salespeople").update({"is_active": is_active}).eq("id", sp_id).execute()
        return {
            "action": action_data.action.value,
            "affected": len(action_data.ids),
            "message": f"Acción '{action_data.action.value}' aplicada a {len(action_data.ids)} vendedor(es)",
        }

    # ── Geography ──

    async def get_geography(self, params: GeographyListParams) -> GeographyListResponse:
        sb = _sb()
        try:
            result = sb.rpc("get_geography_with_stats", {}).execute()
            rows = result.data or []
        except Exception:
            q = sb.table("geography").select("*")
            result = q.execute()
            rows = [
                {**r, "total_sales": 0, "total_net_cop": 0, "total_net_usd": 0, "total_weight_ton": 0}
                for r in (result.data or [])
            ]

        if params.search:
            s = params.search.lower()
            rows = [
                r for r in rows
                if s in str(r.get("city", "")).lower()
                or s in str(r.get("department", "")).lower()
                or s in str(r.get("country", "")).lower()
            ]
        if params.country:
            rows = [r for r in rows if r.get("country") == params.country]

        rows.sort(key=lambda r: (r.get("country") or "", r.get("department") or "", r.get("city") or ""))

        items = [
            GeographyWithStats(
                id=r["id"],
                country=r.get("country", ""),
                department=r.get("department"),
                city=r.get("city"),
                totalSales=_safe_int(r.get("total_sales")),
                totalNetCop=_safe_float(r.get("total_net_cop")),
                totalNetUsd=_safe_float(r.get("total_net_usd")),
                totalWeightTon=_safe_float(r.get("total_weight_ton")),
            )
            for r in rows
        ]
        return GeographyListResponse(items=items, total=len(items))


sales_service = SalesService()
