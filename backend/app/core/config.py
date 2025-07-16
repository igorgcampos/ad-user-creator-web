from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "AD User Creator API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # CORS - Simple implementation that works with Pydantic v2
    BACKEND_CORS_ORIGINS: str = ""
    
    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from string to list"""
        if not self.BACKEND_CORS_ORIGINS.strip():
            return []
        if self.BACKEND_CORS_ORIGINS.strip().startswith("["):
            # If it's JSON format, try to parse it
            import json
            try:
                return json.loads(self.BACKEND_CORS_ORIGINS)
            except:
                return []
        # If it's comma-separated format
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]

    # Database
    DATABASE_URL: str = "sqlite:///./ad_users.db"
    
    # Active Directory Settings
    AD_SERVER: str = ""
    AD_DOMAIN: str = ""
    AD_BASE_DN: str = ""
    AD_USERNAME: str = ""
    AD_PASSWORD: str = ""
    AD_USE_SSL: bool = True
    AD_USERS_OU: str = ""
    
    # Development/Testing
    DEBUG: bool = False
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Timeouts
    REQUEST_TIMEOUT: int = 30
    AD_TIMEOUT: int = 10
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100
    
    # Password requirements
    MIN_PASSWORD_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # File storage
    UPLOAD_MAX_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".txt", ".csv", ".json"]
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Health check
    HEALTH_CHECK_INTERVAL: int = 30
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    """Get settings instance (cached)"""
    return Settings()


# Global settings instance
settings = get_settings() 