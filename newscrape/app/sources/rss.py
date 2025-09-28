"""
RSS/Atom feed parser for news sources.
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import feedparser
from urllib.parse import urljoin, urlparse

from app.models import SourceConfig, RawArticleItem, Source, SourceType, League
from app.ingest.fetcher import HTTPFetcher

logger = logging.getLogger(__name__)


class RSSParser:
    """Parser for RSS and Atom feeds."""
    
    def __init__(self, fetcher: HTTPFetcher):
        """Initialize the RSS parser.
        
        Args:
            fetcher: HTTP client for fetching feeds
        """
        self.fetcher = fetcher
    
    async def parse_feed(self, source_config: SourceConfig) -> List[RawArticleItem]:
        """Parse an RSS/Atom feed.
        
        Args:
            source_config: Source configuration
            
        Returns:
            List of raw article items
        """
        if source_config.type != SourceType.RSS:
            logger.warning(f"Source {source_config.id} is not an RSS source")
            return []
        
        try:
            logger.info(f"Fetching RSS feed: {source_config.url}")
            
            # Fetch the feed content
            response = await self.fetcher.get(str(source_config.url))
            if not response or not response.text:
                logger.warning(f"No content received from {source_config.url}")
                return []
            
            # Parse the feed
            feed = feedparser.parse(response.text)
            
            if feed.bozo:
                logger.warning(f"Feed parsing warnings for {source_config.url}: {feed.bozo_exception}")
            
            if not feed.entries:
                logger.warning(f"No entries found in feed {source_config.url}")
                return []
            
            # Convert entries to raw article items
            raw_items = []
            for entry in feed.entries:
                try:
                    raw_item = self._convert_entry_to_raw_item(entry, source_config)
                    if raw_item:
                        raw_items.append(raw_item)
                except Exception as e:
                    logger.warning(f"Error converting RSS entry: {e}")
                    continue
            
            logger.info(f"Parsed {len(raw_items)} articles from {source_config.id}")
            return raw_items
            
        except Exception as e:
            logger.error(f"Error parsing RSS feed {source_config.url}: {e}")
            return []
    
    def _convert_entry_to_raw_item(
        self, 
        entry: Any, 
        source_config: SourceConfig
    ) -> Optional[RawArticleItem]:
        """Convert an RSS entry to a RawArticleItem.
        
        Args:
            entry: RSS entry object from feedparser
            source_config: Source configuration
            
        Returns:
            RawArticleItem or None if conversion fails
        """
        try:
            # Extract basic fields
            title = getattr(entry, 'title', None)
            url = getattr(entry, 'link', None)
            published = getattr(entry, 'published', None)
            summary = getattr(entry, 'summary', None)
            byline = getattr(entry, 'author', None)
            
            # Parse published date
            published_at = None
            if published:
                try:
                    # feedparser provides parsed time as a struct_time
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        from time import mktime
                        from datetime import datetime
                        published_at = datetime.fromtimestamp(
                            mktime(entry.published_parsed), 
                            tz=timezone.utc
                        )
                    else:
                        from dateutil import parser
                        published_at = parser.parse(published)
                        if published_at.tzinfo is None:
                            published_at = published_at.replace(tzinfo=timezone.utc)
                except Exception as e:
                    logger.warning(f"Error parsing published date '{published}': {e}")
            
            # Extract image URL
            image_url = self._extract_image_url(entry, source_config.url)
            
            # Extract content
            content = self._extract_content(entry)
            
            # Create raw data dictionary
            raw_data = {
                'source': 'rss',
                'source_config': source_config.dict(),
                'entry_data': {
                    'title': title,
                    'link': url,
                    'published': published,
                    'summary': summary,
                    'author': byline,
                    'tags': getattr(entry, 'tags', []),
                    'media_content': getattr(entry, 'media_content', []),
                    'enclosures': getattr(entry, 'enclosures', []),
                }
            }
            
            return RawArticleItem(
                source_id=source_config.id,
                title=title,
                url=url,
                published_at=published_at,
                byline=byline,
                summary=summary,
                image_url=image_url,
                content=content,
                raw_data=raw_data
            )
            
        except Exception as e:
            logger.error(f"Error converting RSS entry: {e}")
            return None
    
    def _extract_image_url(self, entry: Any, base_url: str) -> Optional[str]:
        """Extract image URL from RSS entry.
        
        Args:
            entry: RSS entry object
            base_url: Base URL for resolving relative URLs
            
        Returns:
            Image URL or None
        """
        try:
            # Check for media:content
            if hasattr(entry, 'media_content') and entry.media_content:
                for media in entry.media_content:
                    if hasattr(media, 'type') and media.type.startswith('image/'):
                        return urljoin(base_url, media.url)
            
            # Check for enclosures
            if hasattr(entry, 'enclosures') and entry.enclosures:
                for enclosure in entry.enclosures:
                    if hasattr(enclosure, 'type') and enclosure.type.startswith('image/'):
                        return urljoin(base_url, enclosure.href)
            
            # Check for media:thumbnail
            if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                for thumb in entry.media_thumbnail:
                    if hasattr(thumb, 'url'):
                        return urljoin(base_url, thumb.url)
            
            # Check for content with images
            content = getattr(entry, 'content', [])
            if content and len(content) > 0:
                content_text = content[0].get('value', '') if hasattr(content[0], 'get') else str(content[0])
                # Simple regex to find img tags (could be improved)
                import re
                img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content_text)
                if img_match:
                    return urljoin(base_url, img_match.group(1))
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting image URL: {e}")
            return None
    
    def _extract_content(self, entry: Any) -> Optional[str]:
        """Extract full content from RSS entry.
        
        Args:
            entry: RSS entry object
            
        Returns:
            Content text or None
        """
        try:
            # Try content first
            if hasattr(entry, 'content') and entry.content:
                content_list = entry.content
                if isinstance(content_list, list) and len(content_list) > 0:
                    content_obj = content_list[0]
                    if hasattr(content_obj, 'value'):
                        return content_obj.value
                    elif isinstance(content_obj, str):
                        return content_obj
            
            # Fall back to summary
            if hasattr(entry, 'summary'):
                return entry.summary
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting content: {e}")
            return None

