"""
Configuration management for the sports news scraper.
"""

import os
from typing import Optional, Dict, Any
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_env: str = Field("dev", env="APP_ENV")
    app_tz: str = Field("America/New_York", env="APP_TZ")
    
    # HTTP Client
    http_timeout_seconds: int = Field(15, env="HTTP_TIMEOUT_SECONDS")
    http_max_retries: int = Field(3, env="HTTP_MAX_RETRIES")
    http_backoff_base: float = Field(0.5, env="HTTP_BACKOFF_BASE")
    user_agent: str = Field("sports-news-scraper/0.1 (+contact:magnus@example.com)", env="USER_AGENT")
    
    # Database
    db_url: str = Field("sqlite:///./news.db", env="DB_URL")
    
    # API Keys
    guardian_api_key: Optional[str] = Field(None, env="GUARDIAN_API_KEY")
    scrapingbee_api_key: Optional[str] = Field(None, env="SCRAPINGBEE_API_KEY")
    
    # Rate Limiting
    default_rate_limit_per_second: float = Field(1.0, env="DEFAULT_RATE_LIMIT_PER_SECOND")
    
    # Player Matching
    player_match_threshold: float = Field(0.7, env="PLAYER_MATCH_THRESHOLD")
    enable_ner: bool = Field(False, env="ENABLE_NER")
    
    # Logging
    log_level: str = Field("INFO", env="LOG_LEVEL")
    log_format: str = Field("json", env="LOG_FORMAT")
    
    # Paths
    data_dir: Path = Field(Path("data"), description="Data directory path")
    sources_file: Path = Field(Path("data/sources.yaml"), description="Sources configuration file")
    players_file: Path = Field(Path("data/players.csv"), description="Players database file")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure data directory exists
        self.data_dir.mkdir(exist_ok=True)
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.app_env.lower() == "prod"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.app_env.lower() == "dev"


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance."""
    return settings
