"""
Import Service — Process uploaded Excel files from Siesa ERP.
"""
import pandas as pd
from io import BytesIO
from app.core.excel_parsers import detect_file_type, parse_maestro, parse_ventas, parse_transito


async def process_upload(file_content: bytes, filename: str) -> dict:
    """
    Process an uploaded Excel file.
    Auto-detects file type and parses accordingly.

    Returns:
        Dict with type, records_count, and parsed data summary.
    """
    try:
        df = pd.read_excel(BytesIO(file_content), engine="openpyxl")
    except Exception as e:
        raise ValueError(f"No se pudo leer el archivo Excel: {str(e)}")

    if df.empty:
        raise ValueError("El archivo está vacío")

    file_type = detect_file_type(df)
    if not file_type:
        raise ValueError(
            f"No se reconoce el formato del archivo. "
            f"Columnas encontradas: {', '.join(df.columns[:10])}"
        )

    if file_type == "maestro":
        records = parse_maestro(df)
        # TODO: Upsert into sku_catalog table via Supabase
        return {
            "type": "maestro",
            "type_label": "Maestro de Ítems",
            "records_imported": len(records),
            "message": f"Se importaron {len(records)} referencias del maestro de ítems.",
        }

    elif file_type == "ventas":
        records = parse_ventas(df)
        # TODO: Insert into sales_history table via Supabase
        return {
            "type": "ventas",
            "type_label": "Ventas Históricas",
            "records_imported": len(records),
            "message": f"Se importaron {len(records)} transacciones de venta.",
        }

    elif file_type in ("transito_flex", "transito_siesa"):
        records = parse_transito(df, file_type)
        # TODO: Upsert into transit_orders table via Supabase
        return {
            "type": "transito",
            "type_label": "Tránsito Activo",
            "records_imported": len(records),
            "message": f"Se importaron {len(records)} órdenes de tránsito.",
        }

    raise ValueError(f"Tipo de archivo no soportado: {file_type}")
