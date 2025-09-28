"""
Article normalizer to convert raw items to Article schema.
"""

import logging
import hashlib
import re
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse, parse_qs
import html

from app.models import (
    Article, Source, SourceType, League, RawArticleItem, 
    SourceConfig, SearchQuery
)
from app.config import get_settings

logger = logging.getLogger(__name__)


class ArticleNormalizer:
    """Normalizes raw article items to Article schema."""
    
    def __init__(self):
        """Initialize the article normalizer."""
        self.settings = get_settings()
    
    def normalize(self, raw_item: RawArticleItem, source_config: Optional[SourceConfig] = None) -> Optional[Article]:
        """Normalize a raw article item to Article schema.
        
        Args:
            raw_item: Raw article item to normalize
            source_config: Optional source configuration
            
        Returns:
            Normalized Article or None if normalization fails
        """
        try:
            # Validate required fields
            if not raw_item.title or not raw_item.url:
                logger.warning(f"Skipping item with missing title or URL: {raw_item}")
                return None
            
            # Create source object
            source = self._create_source(raw_item, source_config)
            
            # Clean and validate URL
            clean_url = self._clean_url(raw_item.url)
            if not clean_url:
                logger.warning(f"Invalid URL after cleaning: {raw_item.url}")
                return None
            
            # Normalize published date
            published_at = self._normalize_published_date(raw_item.published_at)
            if not published_at:
                logger.warning(f"Could not parse published date: {raw_item.published_at}")
                return None
            
            # Clean and normalize text fields
            title = self._clean_text(raw_item.title)
            summary = self._clean_text(raw_item.summary) if raw_item.summary else None
            byline = self._clean_text(raw_item.byline) if raw_item.byline else None
            
            # Extract image URL
            image_url = self._extract_image_url(raw_item)
            
            # Determine league
            league = self._determine_league(raw_item, source_config)
            
            # Create article ID
            article_id = self._generate_article_id(raw_item, clean_url)
            
            # Create raw data
            raw_data = {
                'source_item_hash': self._generate_content_hash(raw_item),
                'extras': {
                    'original_url': raw_item.url,
                    'source_id': raw_item.source_id,
                    'normalized_at': datetime.now(timezone.utc).isoformat(),
                }
            }
            
            # Merge with existing raw data
            if raw_item.raw_data:
                raw_data.update(raw_item.raw_data)
            
            return Article(
                id=article_id,
                source=source,
                title=title,
                url=clean_url,
                published_at=published_at,
                byline=byline,
                summary=summary,
                image_url=image_url,
                league=league,
                teams=[],  # Will be populated by enricher
                players=[],  # Will be populated by enricher
                tags=[],  # Will be populated by enricher
                raw=raw_data
            )
            
        except Exception as e:
            logger.error(f"Error normalizing article: {e}", exc_info=True)
            return None
    
    def filter_by_date_range(
        self, 
        articles: List[Article], 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Article]:
        """Filter articles by date range.
        
        Args:
            articles: List of articles to filter
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            
        Returns:
            Filtered list of articles
        """
        filtered = []
        for article in articles:
            if start_date <= article.published_at <= end_date:
                filtered.append(article)
            else:
                logger.debug(f"Filtered out article '{article.title}' - outside date range")
        
        logger.info(f"Filtered {len(articles)} articles to {len(filtered)} within date range")
        return filtered
    
    def _create_source(self, raw_item: RawArticleItem, source_config: Optional[SourceConfig]) -> Source:
        """Create Source object from raw item and config.
        
        Args:
            raw_item: Raw article item
            source_config: Optional source configuration
            
        Returns:
            Source object
        """
        if source_config:
            return Source(
                id=source_config.id,
                name=self._get_source_name(source_config),
                type=source_config.type,
                homepage=self._get_source_homepage(source_config),
                league=source_config.league
            )
        else:
            # Fallback to basic source info
            return Source(
                id=raw_item.source_id,
                name=raw_item.source_id.replace('-', ' ').title(),
                type=SourceType.UNKNOWN,
                homepage=None,
                league=League.UNKNOWN
            )
    
    def _get_source_name(self, source_config: SourceConfig) -> str:
        """Get human-readable source name from config.
        
        Args:
            source_config: Source configuration
            
        Returns:
            Source name
        """
        # Map common source IDs to friendly names
        source_names = {
            'espn-nba-rss': 'ESPN NBA',
            'espn-nfl-rss': 'ESPN NFL',
            'espn-mlb-rss': 'ESPN MLB',
            'cbs-nba-rss': 'CBS Sports NBA',
            'cbs-nfl-rss': 'CBS Sports NFL',
            'cbs-mlb-rss': 'CBS Sports MLB',
            'yahoo-nba-rss': 'Yahoo Sports NBA',
            'yahoo-nfl-rss': 'Yahoo Sports NFL',
            'yahoo-mlb-rss': 'Yahoo Sports MLB',
            'bleacher-nba-rss': 'Bleacher Report NBA',
            'bleacher-nfl-rss': 'Bleacher Report NFL',
            'bleacher-mlb-rss': 'Bleacher Report MLB',
        }
        
        return source_names.get(source_config.id, source_config.id.replace('-', ' ').title())
    
    def _get_source_homepage(self, source_config: SourceConfig) -> Optional[str]:
        """Get source homepage URL from config.
        
        Args:
            source_config: Source configuration
            
        Returns:
            Homepage URL or None
        """
        if source_config.url:
            # Extract domain from RSS URL
            parsed = urlparse(str(source_config.url))
            return f"{parsed.scheme}://{parsed.netloc}"
        return None
    
    def _clean_url(self, url: str) -> Optional[str]:
        """Clean and normalize URL.
        
        Args:
            url: URL to clean
            
        Returns:
            Cleaned URL or None if invalid
        """
        try:
            if not url:
                return None
            
            # Parse URL
            parsed = urlparse(url)
            
            # Ensure scheme
            if not parsed.scheme:
                parsed = parsed._replace(scheme='https')
            
            # Remove tracking parameters
            query_params = parse_qs(parsed.query)
            filtered_params = {}
            for key, values in query_params.items():
                if not any(tracking_param in key.lower() for tracking_param in 
                          ['utm_', 'gclid', 'fbclid', 'ref', 'source']):
                    filtered_params[key] = values
            
            # Rebuild query string
            new_query = '&'.join(
                f"{key}={value[0]}" if len(value) == 1 else f"{key}={','.join(value)}"
                for key, value in filtered_params.items()
            )
            
            # Remove trailing slash
            path = parsed.path.rstrip('/')
            
            # Rebuild URL
            cleaned = urlunparse((
                parsed.scheme,
                parsed.netloc,
                path,
                parsed.params,
                new_query,
                parsed.fragment
            ))
            
            return cleaned
            
        except Exception as e:
            logger.warning(f"Error cleaning URL '{url}': {e}")
            return None
    
    def _normalize_published_date(self, published_at: Optional[datetime]) -> Optional[datetime]:
        """Normalize published date to UTC.
        
        Args:
            published_at: Published date to normalize
            
        Returns:
            Normalized datetime in UTC or None if invalid
        """
        if not published_at:
            return None
        
        try:
            if isinstance(published_at, str):
                from dateutil import parser
                published_at = parser.parse(published_at)
            
            # Ensure timezone aware
            if published_at.tzinfo is None:
                published_at = published_at.replace(tzinfo=timezone.utc)
            
            # Convert to UTC
            return published_at.astimezone(timezone.utc)
            
        except Exception as e:
            logger.warning(f"Error normalizing published date '{published_at}': {e}")
            return None
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content.
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Decode HTML entities
        text = html.unescape(text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def _extract_image_url(self, raw_item: RawArticleItem) -> Optional[str]:
        """Extract and clean image URL.
        
        Args:
            raw_item: Raw article item
            
        Returns:
            Cleaned image URL or None
        """
        if not raw_item.image_url:
            return None
        
        return self._clean_url(raw_item.image_url)
    
    def _determine_league(self, raw_item: RawArticleItem, source_config: Optional[SourceConfig]) -> League:
        """Determine league from raw item and source config.
        
        Args:
            raw_item: Raw article item
            source_config: Optional source configuration
            
        Returns:
            League enum value
        """
        if source_config and source_config.league != League.UNKNOWN:
            return source_config.league
        
        # Try to determine from content
        content = f"{raw_item.title or ''} {raw_item.summary or ''}".lower()
        
        league_keywords = {
            League.NBA: ['nba', 'basketball', 'lakers', 'warriors', 'celtics', 'heat'],
            League.NFL: ['nfl', 'football', 'patriots', 'chiefs', 'bills', 'cowboys'],
            League.MLB: ['mlb', 'baseball', 'yankees', 'dodgers', 'red sox', 'astros'],
            League.EPL: ['epl', 'premier league', 'soccer', 'football', 'manchester', 'liverpool'],
            League.NHL: ['nhl', 'hockey', 'bruins', 'rangers', 'maple leafs'],
        }
        
        for league, keywords in league_keywords.items():
            if any(keyword in content for keyword in keywords):
                return league
        
        return League.UNKNOWN
    
    def _generate_article_id(self, raw_item: RawArticleItem, clean_url: str) -> str:
        """Generate unique article ID.
        
        Args:
            raw_item: Raw article item
            clean_url: Cleaned URL
            
        Returns:
            Unique article ID
        """
        # Use URL and title to generate a consistent ID
        content = f"{clean_url}:{raw_item.title or ''}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _generate_content_hash(self, raw_item: RawArticleItem) -> str:
        """Generate content hash for deduplication.
        
        Args:
            raw_item: Raw article item
            
        Returns:
            Content hash
        """
        # Create hash from title, summary, and URL
        content = f"{raw_item.title or ''}:{raw_item.summary or ''}:{raw_item.url or ''}"
        return hashlib.sha256(content.encode()).hexdigest()
