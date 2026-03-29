"""
Excel Parsers — Parse specific Siesa ERP export formats.

Each parser validates column names and returns normalized data.
The detect_file_type function auto-detects which parser to use.
"""
import pandas as pd
from typing import Optional


# Column signatures for auto-detection
MAESTRO_COLUMNS = {"Item", "Referencia", "Estado", "CATEGORIA"}
VENTAS_COLUMNS = {"Item", "Referencia", "Fecha", "Cantidad", "Precio unit."}
TRANSITO_FLEX_COLUMNS = {"Referencia Siesa", "Cantidad", "Fecha", "Destino"}
TRANSITO_SIESA_COLUMNS = {"Estado importación", "Referencia item importado", "Cant. ordenada"}


def detect_file_type(df: pd.DataFrame) -> Optional[str]:
    """
    Auto-detect file type by matching column names.

    Returns: 'maestro', 'ventas', 'transito_flex', 'transito_siesa', or None
    """
    cols = set(df.columns)

    if MAESTRO_COLUMNS.issubset(cols):
        return "maestro"
    if VENTAS_COLUMNS.issubset(cols):
        return "ventas"
    if TRANSITO_FLEX_COLUMNS.issubset(cols):
        return "transito_flex"
    if TRANSITO_SIESA_COLUMNS.issubset(cols):
        return "transito_siesa"

    return None


# ── Helpers ──

def _str(val, default="") -> str:
    """Safe string conversion; returns default for NaN/None."""
    if pd.isna(val):
        return default
    return str(val).strip()


def _num(val, default=0) -> float:
    """Safe numeric conversion."""
    n = pd.to_numeric(val, errors="coerce")
    return default if pd.isna(n) else float(n)


def _flag(val) -> bool:
    """Convert Si/No to bool."""
    return _str(val).lower() in ("si", "sí", "yes", "true", "1")


def _date_iso(val) -> Optional[str]:
    """Convert to ISO date string or None."""
    try:
        d = pd.to_datetime(val, errors="coerce", dayfirst=True)
        if pd.isna(d):
            return None
        return d.isoformat()
    except Exception:
        return None


def _parse_ext1(ext1: str) -> dict:
    """
    Parse 'Ext. 1 detalle' to extract temple and aleacion.
    Examples: 'T5-A6063' → {temple:'T5', aleacion_code:'6063', aleacion:'A6063'}
              'H14-A1100' → {temple:'H14', aleacion_code:'1100', aleacion:'A1100'}
              'AZUL' → {temple:'', aleacion_code:'', aleacion:'AZUL'}
    """
    ext1 = _str(ext1)
    if not ext1 or ext1 in ("N/D", "nan"):
        return {"temple": "", "aleacion_code": "", "aleacion": ""}

    if "-" in ext1 and ext1[0] in ("T", "H"):
        parts = ext1.split("-", 1)
        temple = parts[0].strip()
        aleacion_raw = parts[1].strip() if len(parts) > 1 else ""
        aleacion_code = aleacion_raw.lstrip("A") if aleacion_raw.startswith("A") else aleacion_raw
        return {"temple": temple, "aleacion_code": aleacion_code, "aleacion": aleacion_raw}

    return {"temple": "", "aleacion_code": "", "aleacion": ext1}


# ── Legacy parser (kept for diff/snapshot compatibility) ──

def parse_maestro(df: pd.DataFrame) -> list[dict]:
    """
    Parse Maestro — simplified version for diff snapshots.
    Groups by reference, returns 1 record per reference.
    """
    required = ["Referencia", "CATEGORIA"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en Maestro: {missing}")

    df = df.copy()
    df["Referencia"] = df["Referencia"].astype(str).str.strip()
    df = df[df["Referencia"].notna() & (df["Referencia"] != "")]

    results = []
    for ref, group in df.groupby("Referencia"):
        first_row = group.iloc[0]
        stock = 0
        if "Costo prom. uni." in group.columns and "Costo prom. total" in group.columns:
            for _, row in group.iterrows():
                unit_cost = _num(row.get("Costo prom. uni.", 0))
                total_cost = _num(row.get("Costo prom. total", 0))
                if unit_cost > 0:
                    stock += total_cost / unit_cost

        results.append({
            "reference": str(ref),
            "description": _str(first_row.get("Item", ref)),
            "category": _str(first_row.get("CATEGORIA", "")),
            "subcategory": _str(first_row.get("SUBCATEGORIA", "")),
            "system": _str(first_row.get("SISTEMAS", "")),
            "abc_class": _str(first_row.get("abc rotac. veces item", "C")),
            "unit_cost": _num(first_row.get("Costo prom. uni.", 0)),
            "weight_per_meter": _num(first_row.get("Peso U.M. Inv.", 0)),
            "stock_quantity": round(stock, 2),
            "status": _str(first_row.get("Estado", "Activo")),
        })

    return results


# ── Full parser for DB sync ──

def parse_maestro_full(df: pd.DataFrame) -> dict:
    """
    Parse Maestro — full extraction for DB sync.

    Returns:
        {
            "products": [...]            # 1 per unique reference
            "warehouse_records": [...]   # 1 per Excel row (ref + bodega + item_id)
            "summary": { total_rows, unique_refs, unique_bodegas }
        }
    """
    required = ["Referencia", "CATEGORIA"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en Maestro: {missing}")

    df = df.copy()
    df["Referencia"] = df["Referencia"].astype(str).str.strip()
    df = df[df["Referencia"].notna() & (df["Referencia"] != "") & (df["Referencia"] != "nan")]

    products = []
    warehouse_records = []

    for ref, group in df.groupby("Referencia"):
        first_row = group.iloc[0]
        ext1_info = _parse_ext1(first_row.get("Ext. 1 detalle", ""))

        # ── Product-level record (1 per reference) ──
        products.append({
            "reference": str(ref),
            "description": _str(first_row.get("Desc. item", first_row.get("Item", ref))),
            "categoria_raw": _str(first_row.get("CATEGORIA", "")),
            "subcategoria_raw": _str(first_row.get("SUBCATEGORIA", "")),
            "sistema_raw": _str(first_row.get("SISTEMAS", "")),
            "linea_raw": _str(first_row.get("LINEA", "")),
            "peso_um": _num(first_row.get("Peso U.M. Inv.", 0)),
            "status": "active" if _str(first_row.get("Estado", "Activo")).lower() == "activo" else "inactive",
            # Variant-level fields extracted from first row
            "item_id": int(_num(first_row.get("Item", 0))),
            "acabado_code": _str(first_row.get("Ext. 2 detalle", "")),
            "temple": ext1_info["temple"],
            "aleacion": ext1_info["aleacion"],
            "aleacion_code": ext1_info["aleacion_code"],
            "posicion_arancelaria": _str(first_row.get("Desc. posición arancelaria",
                                        first_row.get("Desc. posici\xf3n arancelaria", ""))),
            # Flags
            "flag_compra": _flag(first_row.get("Compra", "No")),
            "flag_venta": _flag(first_row.get("Venta", "No")),
            "flag_manufactura": _flag(first_row.get("Manufactura", "No")),
            "flag_lote": _flag(first_row.get("Maneja lote", "No")),
            "flag_paquete": _flag(first_row.get("Maneja paquete", "No")),
            # Dates
            "fecha_creacion_siesa": _date_iso(first_row.get("Fecha creación",
                                              first_row.get("Fecha creaci\xf3n", None))),
            "fecha_actualizacion_siesa": _date_iso(first_row.get("Fecha actualización",
                                                   first_row.get("Fecha actualizaci\xf3n", None))),
            "fecha_inactivacion": _date_iso(first_row.get("Fecha inactivación",
                                            first_row.get("Fecha inactivaci\xf3n", None))),
        })

        # ── Warehouse-level records (1 per Excel row) ──
        for _, row in group.iterrows():
            bodega = _str(row.get("Desc. bodega", ""))
            if not bodega:
                continue
            warehouse_records.append({
                "reference": str(ref),
                "item_id": int(_num(row.get("Item", 0))),
                "bodega_name": bodega,
                "costo_promedio": _num(row.get("Costo prom. uni.", 0)),
                "precio_unitario": _num(row.get("Precio unit.", 0)),
                "costo_promedio_total": _num(row.get("Costo prom. total", 0)),
                "margen_pct": _num(row.get("Margen(%)", 0)),
                "unidad_precio": _str(row.get("Unidad de precio", "")),
                "abc_rotacion_veces": _str(row.get("abc rotac. veces item", "")),
                "abc_rotacion_costo": _str(row.get("abc rotac. costo item", "")),
                "abc_rotacion_veces_bod": _str(row.get("abc rotac. veces bod.", "")),
                "abc_rotacion_costo_bod": _str(row.get("abc rotac. costo bod.", "")),
                "fecha_ultima_venta": _date_iso(row.get("Fecha última venta",
                                                row.get("Fecha \xfaltima venta", None))),
                "fecha_ultima_entrada": _date_iso(row.get("Fecha última entrada",
                                                  row.get("Fecha \xfaltima entrada", None))),
                "fecha_ultima_salida": _date_iso(row.get("Fecha última salida",
                                                 row.get("Fecha \xfaltima salida", None))),
                "fecha_ultima_compra": _date_iso(row.get("Fecha última compra",
                                                 row.get("Fecha \xfaltima compra", None))),
                "fecha_ultimo_conteo": _date_iso(row.get("Fecha último conteo",
                                                 row.get("Fecha \xfaltimo conteo", None))),
            })

    return {
        "products": products,
        "warehouse_records": warehouse_records,
        "summary": {
            "total_rows": len(df),
            "unique_refs": len(products),
            "unique_bodegas": len(set(r["bodega_name"] for r in warehouse_records)),
        },
    }


def parse_ventas(df: pd.DataFrame) -> list[dict]:
    """
    Parse Ventas_Siesa_Resumido.xlsx — full 26-column extraction.
    Returns list of sale transaction dicts ready for sales table sync.
    """
    required = ["Referencia", "Fecha", "Cantidad"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en Ventas: {missing}")

    df = df.copy()

    # Find columns with encoding-safe matching
    def find_col(pattern: str) -> Optional[str]:
        for c in df.columns:
            if pattern.lower() in c.lower():
                return c
        return None

    pais_col = find_col("pa") or "Desc. país"
    depto_col = find_col("depto") or "Desc. depto"
    ciudad_col = find_col("ciudad") or "Desc. ciudad"
    fecha_item_col = find_col("tem") or "Fecha entrega ítem"
    peso_col = find_col("peso") or "Peso en KG"
    precio_kg_col = find_col("por kg") or "Precio por KG"

    # Coerce types
    df["Referencia"] = df["Referencia"].astype(str).str.strip()
    df["Cantidad"] = pd.to_numeric(df["Cantidad"], errors="coerce").fillna(0).astype(int)
    df["Item"] = pd.to_numeric(df.get("Item", pd.Series(dtype=int)), errors="coerce").fillna(0).astype(int)
    df["Cliente factura"] = pd.to_numeric(
        df.get("Cliente factura", pd.Series(dtype=int)), errors="coerce"
    ).fillna(0).astype("int64")
    for dcol in ["Fecha", "Fecha pedido", "Fecha entrega pedido", fecha_item_col]:
        if dcol in df.columns:
            df[dcol] = pd.to_datetime(df[dcol], errors="coerce", dayfirst=True)

    def safe_date(val):
        if pd.isna(val):
            return None
        try:
            return pd.Timestamp(val).isoformat()
        except Exception:
            return None

    def safe_float(val, default=0.0):
        try:
            v = float(val)
            return v if not pd.isna(v) else default
        except Exception:
            return default

    results = []
    for _, row in df.iterrows():
        if pd.isna(row["Fecha"]) or not row["Referencia"]:
            continue

        acabado = str(row.get("Detalle ext. 2", "")).strip() if pd.notna(row.get("Detalle ext. 2")) else None
        if acabado in ("nan", ""):
            acabado = None

        results.append({
            # Identifiers
            "invoice_number": str(row.get("Nro documento", "")).strip(),
            "order_number": str(row.get("Pedido documento", "")).strip() or None,
            "item_siesa": int(row.get("Item", 0)),
            "reference_siesa": str(row["Referencia"]),
            "acabado_code": acabado,
            # Raw lookup fields (resolved to FKs during sync)
            "customer_siesa_code": int(row.get("Cliente factura", 0)),
            "customer_name": str(row.get("Razon social cliente factura", "")).strip(),
            "salesperson_name": str(row.get("Nombre vendedor", "")).strip(),
            "warehouse_name": str(row.get("Desc. bodega", "")).strip(),
            "country": str(row.get(pais_col, "")).strip(),
            "department": str(row.get(depto_col, "")).strip(),
            "city": str(row.get(ciudad_col, "")).strip(),
            # Dates
            "invoice_date": safe_date(row["Fecha"]),
            "order_date": safe_date(row.get("Fecha pedido")),
            "delivery_date": safe_date(row.get("Fecha entrega pedido")),
            "item_delivery_date": safe_date(row.get(fecha_item_col)),
            # Quantities
            "currency": str(row.get("Moneda", "COP")).strip(),
            "quantity": int(row["Cantidad"]),
            "weight_kg": safe_float(row.get(peso_col, 0)),
            # Pricing
            "unit_price": safe_float(row.get("Precio unit.", 0)),
            "price_per_kg": safe_float(row.get(precio_kg_col, 0)),
            "subtotal": safe_float(row.get("Valor subtotal", 0)),
            "taxes": safe_float(row.get("Valor impuestos", 0)),
            "net_total": safe_float(row.get("Valor neto", 0)),
            "discounts": safe_float(row.get("Valor descuentos", 0)),
            # Status
            "status": str(row.get("Estado", "aprobada")).strip().lower(),
        })

    return results


def parse_transito(df: pd.DataFrame, file_type: str) -> list[dict]:
    """
    Parse transit files (either format).
    Returns list of transit orders.
    """
    df = df.copy()

    if file_type == "transito_flex":
        ref_col = "Referencia Siesa"
        qty_col = "Cantidad"
        date_col = "Fecha"
    else:  # transito_siesa
        ref_col = "Referencia item importado"
        qty_col = "Cant. ordenada"
        date_col = "Fecha arribo"

    df[ref_col] = df[ref_col].astype(str).str.strip()
    df[qty_col] = pd.to_numeric(df[qty_col], errors="coerce").fillna(0)
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)

    results = []
    for _, row in df.iterrows():
        if not row[ref_col] or row[ref_col] == "nan":
            continue
        results.append({
            "reference": str(row[ref_col]),
            "quantity": float(row[qty_col]),
            "eta_date": row[date_col].isoformat() if pd.notna(row[date_col]) else None,
            "status": str(row.get("Estado importación", "en_proceso")),
            "supplier": str(row.get("Razón social proveedor", "")),
            "import_order": str(row.get("Nro. importación", "")),
        })

    return results
