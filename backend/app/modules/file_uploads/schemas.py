"""
File Uploads Schemas — Pydantic models for file upload audit trail.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


class FileUploadStatus(str, Enum):
    processing = "processing"
    success = "success"
    error = "error"


# ── Request models ──

class FileUploadListParams(BaseModel):
    search: Optional[str] = None
    file_type: Optional[str] = None
    status: Optional[str] = None
    sort_field: Optional[str] = None
    sort_order: SortOrder = SortOrder.desc


# ── Response models ──

class ChangedField(BaseModel):
    field: str
    old: Optional[str] = None
    new: Optional[str] = None


class DiffRow(BaseModel):
    reference: str
    description: Optional[str] = None
    changes: Optional[list[ChangedField]] = None


class FileUploadItem(BaseModel):
    id: int
    fileName: str
    fileType: str
    fileTypeLabel: str
    status: str = "processing"
    recordsTotal: int = 0
    recordsNew: int = 0
    recordsUpdated: int = 0
    recordsDeleted: int = 0
    fileSizeBytes: int = 0
    uploadedBy: Optional[str] = None
    changesSummary: Optional[dict] = None
    errorMessage: Optional[str] = None
    createdAt: Optional[str] = None


class FileUploadStats(BaseModel):
    total: int = 0
    success: int = 0
    error: int = 0
    maestro: int = 0
    ventas: int = 0
    transito: int = 0
    lastUploadDate: Optional[str] = None


class FileUploadListResponse(BaseModel):
    items: list[FileUploadItem]
    stats: FileUploadStats


class FileUploadDiffResponse(BaseModel):
    uploadId: int
    fileType: str
    newRows: list[DiffRow] = []
    updatedRows: list[DiffRow] = []
    deletedRows: list[DiffRow] = []
    totalNew: int = 0
    totalUpdated: int = 0
    totalDeleted: int = 0


class SyncResult(BaseModel):
    uploadId: int
    status: str = "success"
    productsCreated: int = 0
    productsUpdated: int = 0
    variantsCreated: int = 0
    variantsUpdated: int = 0
    warehouseRecordsUpserted: int = 0
    classificationsDiscovered: int = 0
    acabadosDiscovered: int = 0
    attributesDiscovered: int = 0
    refsInactivated: int = 0
    refsNotInFile: int = 0
    # Ventas sync counters
    salesInserted: int = 0
    salesSkipped: int = 0
    customersCreated: int = 0
    salespeopleCreated: int = 0
    geographyCreated: int = 0
    variantsMatched: int = 0
    variantsUnmatched: int = 0
    errors: list[str] = []
    message: str = ""
