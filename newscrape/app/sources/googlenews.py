"""
Google News adapter using pygooglenews for player-specific searches.
"""

import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging

# Add pygooglenews to path
pygooglenews_path = Path(__file__).parent.parent.parent / "pygooglenews-master"
sys.path.insert(0, str(pygooglenews_path))

try:
    from pygooglenews import GoogleNews
except ImportError:
    GoogleNews = None

from app.models import Source, SourceType, League, RawArticleItem
from app.config import get_settings

logger = logging.getLogger(__name__)


class GoogleNewsAdapter:
    """Adapter for Google News using pygooglenews."""
    
    def __init__(self, lang: str = "en", country: str = "US"):
        """Initialize the Google News adapter.
        
        Args:
            lang: Language code (e.g., 'en', 'es', 'fr')
            country: Country code (e.g., 'US', 'GB', 'CA')
        """
        if GoogleNews is None:
            raise ImportError("pygooglenews is not available. Please install it or check the path.")
        
        self.lang = lang
        self.country = country
        self.gn = GoogleNews(lang=lang, country=country)
        self.settings = get_settings()
        
        # Create source metadata
        self.source = Source(
            id=f"gn-{lang}-{country.lower()}",
            name=f"Google News ({lang.upper()}-{country.upper()})",
            type=SourceType.GOOGLE_NEWS,
            homepage="https://news.google.com/",
            league=League.UNKNOWN
        )
    
    def search_player(
        self, 
        player_name: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_results: int = 50
    ) -> List[RawArticleItem]:
        """Search for articles about a specific player.
        
        Args:
            player_name: Name of the player to search for
            start_date: Start date for search (optional)
            end_date: End date for search (optional)
            max_results: Maximum number of results to return
            
        Returns:
            List of raw article items
        """
        try:
            # Build search query with player name in quotes for exact matching
            query = f'"{player_name}"'
            
            # Convert dates to string format if provided
            from_date = None
            to_date = None
            if start_date:
                from_date = start_date.strftime("%Y-%m-%d")
            if end_date:
                to_date = end_date.strftime("%Y-%m-%d")
            
            logger.info(f"Searching Google News for '{player_name}' from {from_date} to {to_date}")
            
            # Perform search
            results = self.gn.search(
                query=query,
                from_=from_date,
                to_=to_date,
                helper=True  # Enable URL escaping
            )
            
            if not results or 'entries' not in results:
                logger.warning(f"No results found for player '{player_name}'")
                return []
            
            # Convert to raw article items
            raw_items = []
            for entry in results['entries'][:max_results]:
                try:
                    raw_item = self._convert_entry_to_raw_item(entry, player_name)
                    if raw_item:
                        raw_items.append(raw_item)
                except Exception as e:
                    logger.warning(f"Error converting entry: {e}", exc_info=True)
                    continue
            
            logger.info(f"Found {len(raw_items)} articles for player '{player_name}'")
            return raw_items
            
        except Exception as e:
            logger.error(f"Error searching Google News for '{player_name}': {e}")
            return []
    
    def search_topic(
        self, 
        topic: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_results: int = 50
    ) -> List[RawArticleItem]:
        """Search for articles about a specific topic.
        
        Args:
            topic: Topic to search for
            start_date: Start date for search (optional)
            end_date: End date for search (optional)
            max_results: Maximum number of results to return
            
        Returns:
            List of raw article items
        """
        try:
            # Convert dates to string format if provided
            from_date = None
            to_date = None
            if start_date:
                from_date = start_date.strftime("%Y-%m-%d")
            if end_date:
                to_date = end_date.strftime("%Y-%m-%d")
            
            logger.info(f"Searching Google News for topic '{topic}' from {from_date} to {to_date}")
            
            # Perform search
            results = self.gn.search(
                query=topic,
                from_=from_date,
                to_=to_date,
                helper=True
            )
            
            if not results or 'entries' not in results:
                logger.warning(f"No results found for topic '{topic}'")
                return []
            
            # Convert to raw article items
            raw_items = []
            for entry in results['entries'][:max_results]:
                try:
                    raw_item = self._convert_entry_to_raw_item(entry, topic)
                    if raw_item:
                        raw_items.append(raw_item)
                except Exception as e:
                    logger.warning(f"Error converting entry: {e}")
                    continue
            
            logger.info(f"Found {len(raw_items)} articles for topic '{topic}'")
            return raw_items
            
        except Exception as e:
            logger.error(f"Error searching Google News for topic '{topic}': {e}")
            return []
    
    def get_top_news(self, max_results: int = 50) -> List[RawArticleItem]:
        """Get top news stories.
        
        Args:
            max_results: Maximum number of results to return
            
        Returns:
            List of raw article items
        """
        try:
            logger.info("Fetching top news from Google News")
            
            results = self.gn.top_news()
            
            if not results or 'entries' not in results:
                logger.warning("No top news found")
                return []
            
            # Convert to raw article items
            raw_items = []
            for entry in results['entries'][:max_results]:
                try:
                    raw_item = self._convert_entry_to_raw_item(entry, "top_news")
                    if raw_item:
                        raw_items.append(raw_item)
                except Exception as e:
                    logger.warning(f"Error converting entry: {e}")
                    continue
            
            logger.info(f"Found {len(raw_items)} top news articles")
            return raw_items
            
        except Exception as e:
            logger.error(f"Error fetching top news: {e}")
            return []
    
    def _convert_entry_to_raw_item(self, entry: Any, search_term: str) -> Optional[RawArticleItem]:
        """Convert a Google News entry to a RawArticleItem.
        
        Args:
            entry: Google News entry object
            search_term: The search term used to find this entry
            
        Returns:
            RawArticleItem or None if conversion fails
        """
        try:
            # Extract basic fields
            title = getattr(entry, 'title', None)
            url = getattr(entry, 'link', None)
            published = getattr(entry, 'published', None)
            summary = getattr(entry, 'summary', None)
            
            # Parse published date
            published_at = None
            if published:
                try:
                    from dateutil import parser
                    published_at = parser.parse(published)
                    if published_at.tzinfo is None:
                        published_at = published_at.replace(tzinfo=timezone.utc)
                except Exception as e:
                    logger.warning(f"Error parsing published date '{published}': {e}")
            
            # Extract image URL if available
            image_url = None
            if hasattr(entry, 'media_content') and entry.media_content:
                try:
                    # Try to get the first media content item
                    if isinstance(entry.media_content, list) and len(entry.media_content) > 0:
                        media = entry.media_content[0]
                        if hasattr(media, 'url'):
                            image_url = media.url
                except Exception as e:
                    logger.debug(f"Error extracting image URL: {e}")
            
            # Create raw data dictionary
            raw_data = {
                'source': 'google_news',
                'search_term': search_term,
                'entry_data': {
                    'title': title,
                    'link': url,
                    'published': published,
                    'summary': summary,
                    'source': getattr(entry, 'source', None),
                    'media_content': getattr(entry, 'media_content', None),
                    'sub_articles': getattr(entry, 'sub_articles', None),
                }
            }
            
            return RawArticleItem(
                source_id=self.source.id,
                title=title,
                url=url,
                published_at=published_at,
                summary=summary,
                image_url=image_url,
                raw_data=raw_data
            )
            
        except Exception as e:
            logger.error(f"Error converting Google News entry: {e}")
            return None
