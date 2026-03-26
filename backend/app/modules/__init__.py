"""
Module auto-discovery — finds and registers all module routers.
Each module package must have a router.py with a `router` variable.
"""
import importlib
import pkgutil
import logging
from fastapi import APIRouter

logger = logging.getLogger("agp.modules")


def discover_module_routers() -> list[APIRouter]:
    """
    Auto-discover all module routers in the modules package.
    Each module must have a router.py with a `router` APIRouter instance.
    """
    routers = []
    package = importlib.import_module("app.modules")

    for importer, module_name, is_pkg in pkgutil.iter_modules(package.__path__):
        if not is_pkg:
            continue
        try:
            mod = importlib.import_module(f"app.modules.{module_name}.router")
            if hasattr(mod, "router"):
                routers.append(mod.router)
                logger.info(f"Registered module: {module_name}")
            else:
                logger.warning(f"Module {module_name} has no router")
        except Exception as e:
            logger.error(f"Failed to load module {module_name}: {e}")
    return routers
