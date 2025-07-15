from typing import List, Optional, Union
from pydantic import BaseSettings, validator, AnyHttpUrl
import os
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "AD User Creator API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Database
    DATABASE_URL: Optional[str] = None
    
    # Active Directory Configuration
    AD_SERVER: str = os.getenv("AD_SERVER", "ldap://localhost:389")
    AD_DOMAIN: str = os.getenv("AD_DOMAIN", "example.local")
    AD_BASE_DN: str = os.getenv("AD_BASE_DN", "DC=example,DC=local")
    AD_USERNAME: str = os.getenv("AD_USERNAME", "admin")
    AD_PASSWORD: str = os.getenv("AD_PASSWORD", "password")
    AD_USE_SSL: bool = os.getenv("AD_USE_SSL", "false").lower() == "true"
    AD_USERS_OU: str = os.getenv("AD_USERS_OU", "OU=Users,DC=example,DC=local")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Security Settings
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 3600  # 1 hora em segundos
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings() 