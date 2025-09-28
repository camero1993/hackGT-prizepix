"""
Mock Google News adapter for testing purposes.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import random

from app.models import Source, SourceType, League, RawArticleItem
from app.config import get_settings

logger = logging.getLogger(__name__)


class MockGoogleNewsAdapter:
    """Mock adapter for Google News for testing purposes."""
    
    def __init__(self, lang: str = "en", country: str = "US"):
        """Initialize the mock Google News adapter."""
        self.lang = lang
        self.country = country
        self.settings = get_settings()
        
        # Create source metadata
        self.source = Source(
            id=f"gn-{lang}-{country.lower()}",
            name=f"Google News ({lang.upper()}-{country.upper()})",
            type=SourceType.GOOGLE_NEWS,
            homepage="https://news.google.com/",
            league=League.UNKNOWN
        )
        
        # Sample news data with realistic URLs
        self.sample_articles = [
            {
                "title": "LeBron James Leads Lakers to Victory in Overtime Thriller",
                "summary": "LeBron James scored 35 points and grabbed 12 rebounds as the Los Angeles Lakers defeated the Golden State Warriors 128-125 in overtime.",
                "url": "https://www.espn.com/nba/story/_/id/lebron-lakers-victory-overtime",
                "source": "ESPN"
            },
            {
                "title": "Stephen Curry Breaks Three-Point Record in Warriors Win",
                "summary": "Stephen Curry made 8 three-pointers to break the single-game record as the Warriors beat the Celtics 115-110.",
                "url": "https://www.nba.com/news/curry-three-point-record",
                "source": "NBA.com"
            },
            {
                "title": "Nikola Jokić Triple-Double Powers Nuggets Past Heat",
                "summary": "Nikola Jokić recorded his 15th triple-double of the season with 28 points, 14 rebounds, and 10 assists.",
                "url": "https://www.cbssports.com/nba/news/jokic-triple-double-nuggets",
                "source": "CBS Sports"
            },
            {
                "title": "Jayson Tatum Scores 40 Points in Celtics Comeback Win",
                "summary": "Jayson Tatum led the Boston Celtics to a comeback victory over the Miami Heat with 40 points and 8 rebounds.",
                "url": "https://bleacherreport.com/articles/tatum-celtics-comeback",
                "source": "Bleacher Report"
            },
            {
                "title": "Giannis Antetokounmpo Dominates in Bucks Victory",
                "summary": "Giannis Antetokounmpo had 32 points, 15 rebounds, and 7 assists as the Milwaukee Bucks defeated the Philadelphia 76ers.",
                "url": "https://sports.yahoo.com/giannis-bucks-victory-76ers",
                "source": "Yahoo Sports"
            }
        ]
    
    def search_player(
        self, 
        player_name: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_results: int = 50
    ) -> List[RawArticleItem]:
        """Search for articles about a specific player (mock implementation)."""
        try:
            logger.info(f"Mock search for player: {player_name}")
            
            # Filter articles that mention the player
            matching_articles = []
            for article in self.sample_articles:
                if player_name.lower() in article["title"].lower() or player_name.lower() in article["summary"].lower():
                    matching_articles.append(article)
            
            # If no matches, return some random articles
            if not matching_articles:
                matching_articles = random.sample(self.sample_articles, min(3, len(self.sample_articles)))
            
            # Convert to raw article items
            raw_items = []
            for article in matching_articles[:max_results]:
                try:
                    # Generate a random published date within the last 7 days
                    days_ago = random.randint(0, 7)
                    published_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
                    
                    raw_item = RawArticleItem(
                        source_id=self.source.id,
                        title=article["title"],
                        url=article["url"],
                        published_at=published_at,
                        summary=article["summary"],
                        byline=f"By {article['source']} Staff",
                        image_url=f"https://example.com/images/{player_name.lower().replace(' ', '-')}.jpg",
                        raw_data={
                            'source': 'mock_google_news',
                            'search_term': player_name,
                            'mock_data': True
                        }
                    )
                    raw_items.append(raw_item)
                except Exception as e:
                    logger.warning(f"Error creating mock article: {e}")
                    continue
            
            logger.info(f"Mock found {len(raw_items)} articles for player '{player_name}'")
            return raw_items
            
        except Exception as e:
            logger.error(f"Error in mock search for '{player_name}': {e}")
            return []
    
    def search_topic(
        self, 
        topic: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_results: int = 50
    ) -> List[RawArticleItem]:
        """Search for articles about a specific topic (mock implementation)."""
        return self.search_player(topic, start_date, end_date, max_results)
    
    def get_top_news(self, max_results: int = 50) -> List[RawArticleItem]:
        """Get top news stories (mock implementation)."""
        return self.search_player("NBA", None, None, max_results)
