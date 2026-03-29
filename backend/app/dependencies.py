"""
Dependency injection — Auth guards, role checks, permission checks.
"""
import logging
from fastapi import Depends, HTTPException, status, Header
from typing import Optional

logger = logging.getLogger("agp.auth")


async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Extract and validate the user from the Authorization header.
    For MVP: returns a mock user. Replace with Supabase Auth validation.
    """
    # TODO: Validate JWT token with Supabase Auth
    # For development, return mock user
    return {
        "id": "mock-user-id",
        "email": "jfaragon@agp.com",
        "name": "Juan Felipe Aragon",
        "role": "admin",
        "permissions": ["dashboard", "products", "inventory", "sales",
                        "purchases", "logistics", "supply", "users", "settings"],
    }


def require_role(roles: list[str]):
    """Dependency that requires the user to have one of the specified roles."""
    async def check(user=Depends(get_current_user)):
        if user["role"] not in roles:
            logger.warning(f"Role denied: {user['email']} needs {roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para esta acción",
            )
        return user
    return check


def require_permissions(permissions: list[str]):
    """Dependency that requires the user to have specific module permissions."""
    async def check(user=Depends(get_current_user)):
        if user["role"] == "admin":
            return user  # Admin has all permissions
        user_perms = set(user.get("permissions", []))
        required = set(permissions)
        if not required.issubset(user_perms):
            logger.warning(f"Permission denied: {user['email']} needs {permissions}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para acceder a este módulo",
            )
        return user
    return check
