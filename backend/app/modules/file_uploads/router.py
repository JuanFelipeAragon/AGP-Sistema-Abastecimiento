"""
File Uploads Router — Endpoints for file upload audit trail and processing.
"""
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from typing import Optional

from app.dependencies import require_permissions
from app.modules.file_uploads.service import file_upload_service
from app.modules.file_uploads.schemas import (
    FileUploadListParams,
    FileUploadListResponse,
    FileUploadItem,
    FileUploadDiffResponse,
    SyncResult,
    SortOrder,
)

router = APIRouter(prefix="/api/file-uploads", tags=["file-uploads"])


@router.get("", response_model=FileUploadListResponse)
async def list_uploads(
    search: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_field: Optional[str] = Query(None),
    sort_order: SortOrder = Query(SortOrder.desc),
    user=Depends(require_permissions(["settings"])),
):
    """List all file uploads with optional filters."""
    params = FileUploadListParams(
        search=search,
        file_type=file_type,
        status=status,
        sort_field=sort_field,
        sort_order=sort_order,
    )
    return await file_upload_service.get_uploads(params)


@router.get("/{upload_id}", response_model=FileUploadItem)
async def get_upload(
    upload_id: int,
    user=Depends(require_permissions(["settings"])),
):
    """Get a single file upload by ID."""
    result = await file_upload_service.get_upload_by_id(upload_id)
    if not result:
        raise HTTPException(status_code=404, detail="Registro de subida no encontrado")
    return result


@router.get("/{upload_id}/diff", response_model=FileUploadDiffResponse)
async def get_upload_diff(
    upload_id: int,
    user=Depends(require_permissions(["settings"])),
):
    """Get the diff/changelog for a specific upload."""
    result = await file_upload_service.get_diff(upload_id)
    if not result:
        raise HTTPException(status_code=404, detail="Registro de subida no encontrado")
    return result


@router.post("/upload", response_model=FileUploadItem)
async def upload_file(
    file: UploadFile = File(...),
    user=Depends(require_permissions(["settings"])),
):
    """Upload an Excel file — auto-detect type, parse, diff, and log."""
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use .xlsx, .xls o .csv",
        )

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx. 50MB)")

    try:
        result = await file_upload_service.process_and_log_upload(
            content, file.filename, user.get("email", "unknown")
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar: {str(e)}")


@router.post("/{upload_id}/apply", response_model=SyncResult)
async def apply_sync(
    upload_id: int,
    user=Depends(require_permissions(["settings"])),
):
    """Apply an upload to the database — routes to maestro or ventas sync engine."""
    upload = await file_upload_service.get_upload_by_id(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload no encontrado")

    if upload.fileType == "maestro":
        result = await file_upload_service.apply_maestro_sync(upload_id)
    elif upload.fileType == "ventas":
        result = await file_upload_service.apply_ventas_sync(upload_id)
    else:
        raise HTTPException(status_code=400, detail=f"Sync no soportado para tipo: {upload.fileType}")

    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.message)
    return result


@router.delete("/{upload_id}")
async def delete_upload(
    upload_id: int,
    user=Depends(require_permissions(["settings"])),
):
    """Delete a file upload record."""
    deleted = await file_upload_service.delete_upload(upload_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {"message": "Registro eliminado", "id": upload_id}
