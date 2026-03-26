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


def parse_maestro(df: pd.DataFrame) -> list[dict]:
    """
    Parse Maestro_Commercial_Items.xlsx

    Important: A single reference can have multiple rows (one per warehouse).
    Stock = sum(Costo prom. total / Costo prom. uni.) per reference.
    """
    required = ["Referencia", "CATEGORIA"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en Maestro: {missing}")

    # Clean data
    df = df.copy()
    df["Referencia"] = df["Referencia"].astype(str).str.strip()
    df = df[df["Referencia"].notna() & (df["Referencia"] != "")]

    results = []
    for ref, group in df.groupby("Referencia"):
        first_row = group.iloc[0]

        # Calculate total stock from cost columns
        stock = 0
        if "Costo prom. uni." in group.columns and "Costo prom. total" in group.columns:
            for _, row in group.iterrows():
                unit_cost = pd.to_numeric(row.get("Costo prom. uni.", 0), errors="coerce") or 0
                total_cost = pd.to_numeric(row.get("Costo prom. total", 0), errors="coerce") or 0
                if unit_cost > 0:
                    stock += total_cost / unit_cost

        results.append({
            "reference": str(ref),
            "description": str(first_row.get("Item", ref)),
            "category": str(first_row.get("CATEGORIA", "")),
            "subcategory": str(first_row.get("SUBCATEGORIA", "")),
            "system": str(first_row.get("SISTEMAS", "")),
            "abc_class": str(first_row.get("abc rotac. veces item", "C")),
            "unit_cost": pd.to_numeric(first_row.get("Costo prom. uni.", 0), errors="coerce") or 0,
            "weight_per_meter": pd.to_numeric(first_row.get("Peso U.M. Inv.", 0), errors="coerce") or 0,
            "stock_quantity": round(stock, 2),
            "status": str(first_row.get("Estado", "Activo")),
        })

    return results


def parse_ventas(df: pd.DataFrame) -> list[dict]:
    """
    Parse Ventas_Siesa_Resumido.xlsx
    Returns list of sale transactions.
    """
    required = ["Referencia", "Fecha", "Cantidad"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes en Ventas: {missing}")

    df = df.copy()
    df["Referencia"] = df["Referencia"].astype(str).str.strip()
    df["Cantidad"] = pd.to_numeric(df["Cantidad"], errors="coerce").fillna(0)
    df["Fecha"] = pd.to_datetime(df["Fecha"], errors="coerce", dayfirst=True)

    results = []
    for _, row in df.iterrows():
        if pd.isna(row["Fecha"]) or not row["Referencia"]:
            continue
        results.append({
            "reference": str(row["Referencia"]),
            "quantity": float(row["Cantidad"]),
            "sale_date": row["Fecha"].isoformat(),
            "price": pd.to_numeric(row.get("Precio unit.", 0), errors="coerce") or 0,
            "warehouse": str(row.get("Desc. bodega", "")),
            "customer": str(row.get("Razón social cliente factura", "")),
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
