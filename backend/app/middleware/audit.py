"""
Audit Trail Middleware — Logs all create, update, delete operations.
TODO: Implement as FastAPI middleware or dependency that wraps service calls.
"""
from datetime import datetime, timezone
from typing import Optional


async def log_audit(
    user_id: str,
    action: str,  # CREATE, UPDATE, DELETE
    module: str,
    record_id: str,
    changes: Optional[dict] = None,
):
    """
    Log an audit entry.
    In production, this writes to the audit_logs table in Supabase.
    """
    entry = {
        "user_id": user_id,
        "action": action,
        "module": module,
        "record_id": record_id,
        "changes": changes,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    # TODO: Insert into Supabase audit_logs table
    print(f"AUDIT: {entry}")
    return entry
