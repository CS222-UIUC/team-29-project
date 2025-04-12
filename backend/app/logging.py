"""Logging configuration for the ThreadFlow backend."""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Create logs directory if it doesn't exist
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)


# Configure root logger
def setup_logger():
    """Configure and return the application logger."""
    app_logger = logging.getLogger("threadflow")
    app_logger.setLevel(logging.DEBUG)

    # Define formatter
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s")

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # File handler
    file_handler = RotatingFileHandler("logs/threadflow.log", maxBytes=10 * 1024 * 1024, backupCount=5)  # 10 MB
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)

    # Add handlers to logger
    app_logger.addHandler(console_handler)
    app_logger.addHandler(file_handler)

    return app_logger


# Create and configure logger
logger = setup_logger()
