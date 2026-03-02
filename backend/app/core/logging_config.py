"""
Logging configuration for DSA Problem Tracker Backend
"""

import logging
import logging.config
from app.core.config import settings
import json
from datetime import datetime
import os

def setup_logging():
    """Setup logging configuration"""
    
    # Create logs directory if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(funcName)s() - %(message)s"
            },
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "default",
                "stream": "ext://sys.stdout"
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "detailed",
                "filename": f"logs/dsa_tracker_{datetime.now().strftime('%Y%m%d')}.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 10
            }
        },
        "loggers": {
            "": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console", "file"]
            },
            "uvicorn": {
                "level": settings.LOG_LEVEL,
                "handlers": ["console", "file"]
            },
            "sqlalchemy": {
                "level": "WARNING" if not settings.DB_ECHO else "DEBUG",
                "handlers": ["console"]
            }
        }
    }
    
    logging.config.dictConfig(log_config)
    logger = logging.getLogger(__name__)
    logger.info(f"Logging configured with level: {settings.LOG_LEVEL}")
