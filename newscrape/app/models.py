"""
Pydantic models for the sports news scraper.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, HttpUrl, validator
from enum import Enum


class SourceType(str, Enum):
    """Source types for news articles."""
    RSS = "rss"
    API = "api"
    HTML = "html"
    GOOGLE_NEWS = "gn"
    UNKNOWN = "unknown"


class League(str, Enum):
    """Supported sports leagues."""
    NBA = "nba"
    NFL = "nfl"
    MLB = "mlb"
    EPL = "epl"
    NHL = "nhl"
    UNKNOWN = "unknown"


class Source(BaseModel):
    """News source information."""
    id: str = Field(..., description="Unique source identifier")
    name: str = Field(..., description="Human-readable source name")
    type: SourceType = Field(..., description="Type of source")
    homepage: Optional[HttpUrl] = Field(None, description="Source homepage URL")
    league: Optional[League] = Field(None, description="Primary league covered")


class SourceConfig(BaseModel):
    """Configuration for a news source."""
    id: str = Field(..., description="Unique source identifier")
    type: SourceType = Field(..., description="Type of source")
    league: League = Field(..., description="Primary league covered")
    url: Optional[HttpUrl] = Field(None, description="Source URL")
    lang: Optional[str] = Field("en", description="Language code")
    country: Optional[str] = Field("US", description="Country code")
    rate_limit: Dict[str, Union[int, float]] = Field(
        default_factory=lambda: {"per_second": 1},
        description="Rate limiting configuration"
    )
    team_ids: Optional[List[str]] = Field(None, description="Team IDs for filtering")
    parser_hint: Optional[str] = Field(None, description="Parser configuration hint")


class Player(BaseModel):
    """Player information."""
    player_id: str = Field(..., description="Unique player identifier")
    canonical_name: str = Field(..., description="Canonical player name")
    alt_names: List[str] = Field(default_factory=list, description="Alternative names")
    league: League = Field(..., description="Primary league")
    teams: List[str] = Field(default_factory=list, description="Current and historical teams")


class Article(BaseModel):
    """Normalized article model."""
    id: Optional[str] = Field(None, description="Unique article identifier")
    source: Source = Field(..., description="Source information")
    title: str = Field(..., description="Article title")
    url: HttpUrl = Field(..., description="Article URL")
    published_at: datetime = Field(..., description="Publication timestamp (UTC)")
    byline: Optional[str] = Field(None, description="Article author")
    summary: Optional[str] = Field(None, description="Article summary/excerpt")
    image_url: Optional[HttpUrl] = Field(None, description="Featured image URL")
    league: Optional[League] = Field(None, description="Primary league")
    teams: List[str] = Field(default_factory=list, description="Mentioned teams")
    players: List[str] = Field(default_factory=list, description="Mentioned players")
    tags: List[str] = Field(default_factory=list, description="Article tags")
    raw: Optional[Dict[str, Any]] = Field(None, description="Raw source data and metadata")

    @validator('published_at', pre=True)
    def ensure_utc(cls, v):
        """Ensure published_at is timezone-aware UTC."""
        from datetime import timezone
        if isinstance(v, str):
            from dateutil import parser
            v = parser.parse(v)
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            HttpUrl: lambda v: str(v),
        }


class RawArticleItem(BaseModel):
    """Raw article item from a source before normalization."""
    source_id: str = Field(..., description="Source identifier")
    title: Optional[str] = Field(None, description="Raw title")
    url: Optional[str] = Field(None, description="Raw URL")
    published_at: Optional[Union[datetime, str]] = Field(None, description="Raw publication date")
    byline: Optional[str] = Field(None, description="Raw byline")
    summary: Optional[str] = Field(None, description="Raw summary")
    image_url: Optional[str] = Field(None, description="Raw image URL")
    content: Optional[str] = Field(None, description="Raw content")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="Complete raw data")


class SearchQuery(BaseModel):
    """Search query parameters."""
    player_name: str = Field(..., description="Player name to search for")
    start_date: Optional[datetime] = Field(None, description="Start date for search")
    end_date: Optional[datetime] = Field(None, description="End date for search")
    league: Optional[League] = Field(None, description="Filter by league")
    max_results: int = Field(50, description="Maximum number of results")
    sources: Optional[List[str]] = Field(None, description="Specific sources to search")


class IngestResult(BaseModel):
    """Result of an ingest operation."""
    source_id: str = Field(..., description="Source that was processed")
    articles_found: int = Field(0, description="Number of articles found")
    articles_processed: int = Field(0, description="Number of articles processed")
    articles_matched: int = Field(0, description="Number of articles matched to players")
    errors: List[str] = Field(default_factory=list, description="Any errors encountered")
    processing_time: float = Field(0.0, description="Processing time in seconds")


class ExportFormat(str, Enum):
    """Supported export formats."""
    JSON = "json"
    NDJSON = "ndjson"
    CSV = "csv"
