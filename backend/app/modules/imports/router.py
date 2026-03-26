"""
Imports Router — Upload Excel files from ERP (Siesa).
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from app.dependencies import require_permissions
from app.modules.imports.service import process_upload

router = APIRouter(prefix="/api/imports", tags=["imports"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user=Depends(require_permissions(["supply"])),
):
    """
    Upload an Excel file from the ERP.
    Auto-detects file type (maestro, ventas, tránsito) by column headers.
    """
    # Validate file type
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no soportado. Use .xlsx, .xls o .csv",
        )

    # Read file content
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="El archivo es demasiado grande (máx. 50MB)")

    try:
        result = await process_upload(content, file.filename)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")
