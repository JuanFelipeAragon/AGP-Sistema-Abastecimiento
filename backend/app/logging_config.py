"""
Structured logging configuration for the AGP system.
Replaces all print() statements with proper logging.
"""
import logging
import sys


def setup_logging(level: str = "INFO"):
    """Configure structured logging for the application."""
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger("agp")
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    root_logger.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    return root_logger
