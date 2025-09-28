"""
SQLite storage for articles with CRUD operations.
"""

import logging
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sqlite3
from contextlib import contextmanager

from app.models import Article, SearchQuery, League
from app.config import get_settings

logger = logging.getLogger(__name__)


class SQLiteStorage:
    """SQLite storage for articles."""
    
    def __init__(self, db_path: Optional[str] = None):
        """Initialize SQLite storage.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.settings = get_settings()
        self.db_path = db_path or self.settings.db_url.replace("sqlite:///", "")
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Create articles table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS articles (
                        id TEXT PRIMARY KEY,
                        source_id TEXT NOT NULL,
                        source_name TEXT NOT NULL,
                        source_type TEXT NOT NULL,
                        source_homepage TEXT,
                        title TEXT NOT NULL,
                        url TEXT NOT NULL UNIQUE,
                        published_at TIMESTAMP NOT NULL,
                        byline TEXT,
                        summary TEXT,
                        image_url TEXT,
                        league TEXT,
                        teams TEXT,  -- JSON array
                        players TEXT,  -- JSON array
                        tags TEXT,  -- JSON array
                        raw_data TEXT,  -- JSON object
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create indexes for common queries
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_articles_published_at 
                    ON articles(published_at)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_articles_league 
                    ON articles(league)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_articles_source_id 
                    ON articles(source_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_articles_players 
                    ON articles(players)
                """)
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
    
    @contextmanager
    def _get_connection(self):
        """Get database connection with proper error handling."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def save_article(self, article: Article) -> bool:
        """Save an article to the database.
        
        Args:
            article: Article to save
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Check if article already exists
                cursor.execute("SELECT id FROM articles WHERE url = ?", (str(article.url),))
                if cursor.fetchone():
                    logger.debug(f"Article already exists: {article.url}")
                    return False
                
                # Insert article
                cursor.execute("""
                    INSERT OR REPLACE INTO articles (
                        id, source_id, source_name, source_type, source_homepage,
                        title, url, published_at, byline, summary, image_url,
                        league, teams, players, tags, raw_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    article.id,
                    article.source.id,
                    article.source.name,
                    article.source.type.value,
                    str(article.source.homepage) if article.source.homepage else None,
                    article.title,
                    str(article.url),
                    article.published_at.isoformat(),
                    article.byline,
                    article.summary,
                    str(article.image_url) if article.image_url else None,
                    article.league.value if article.league else None,
                    json.dumps(article.teams),
                    json.dumps(article.players),
                    json.dumps(article.tags),
                    json.dumps(article.raw) if article.raw else None
                ))
                
                conn.commit()
                logger.debug(f"Saved article: {article.title}")
                return True
                
        except Exception as e:
            logger.error(f"Error saving article: {e}")
            return False
    
    def save_articles(self, articles: List[Article]) -> int:
        """Save multiple articles to the database.
        
        Args:
            articles: List of articles to save
            
        Returns:
            Number of articles saved successfully
        """
        saved_count = 0
        for article in articles:
            if self.save_article(article):
                saved_count += 1
        
        logger.info(f"Saved {saved_count}/{len(articles)} articles")
        return saved_count
    
    def get_article_by_id(self, article_id: str) -> Optional[Article]:
        """Get article by ID.
        
        Args:
            article_id: Article ID
            
        Returns:
            Article or None if not found
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
                row = cursor.fetchone()
                
                if row:
                    return self._row_to_article(row)
                return None
                
        except Exception as e:
            logger.error(f"Error getting article by ID: {e}")
            return None
    
    def get_article_by_url(self, url: str) -> Optional[Article]:
        """Get article by URL.
        
        Args:
            url: Article URL
            
        Returns:
            Article or None if not found
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM articles WHERE url = ?", (url,))
                row = cursor.fetchone()
                
                if row:
                    return self._row_to_article(row)
                return None
                
        except Exception as e:
            logger.error(f"Error getting article by URL: {e}")
            return None
    
    def search_articles(self, query: SearchQuery) -> List[Article]:
        """Search articles based on query.
        
        Args:
            query: Search query
            
        Returns:
            List of matching articles
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Build query
                where_conditions = []
                params = []
                
                # Player name search
                if query.player_name:
                    where_conditions.append("players LIKE ?")
                    params.append(f"%{query.player_name}%")
                
                # Date range
                if query.start_date:
                    where_conditions.append("published_at >= ?")
                    params.append(query.start_date.isoformat())
                
                if query.end_date:
                    where_conditions.append("published_at <= ?")
                    params.append(query.end_date.isoformat())
                
                # League filter
                if query.league:
                    where_conditions.append("league = ?")
                    params.append(query.league.value)
                
                # Source filter
                if query.sources:
                    placeholders = ','.join(['?' for _ in query.sources])
                    where_conditions.append(f"source_id IN ({placeholders})")
                    params.extend(query.sources)
                
                # Build final query
                sql = "SELECT * FROM articles"
                if where_conditions:
                    sql += " WHERE " + " AND ".join(where_conditions)
                
                sql += " ORDER BY published_at DESC"
                sql += f" LIMIT {query.max_results}"
                
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                
                articles = [self._row_to_article(row) for row in rows]
                logger.info(f"Found {len(articles)} articles matching query")
                return articles
                
        except Exception as e:
            logger.error(f"Error searching articles: {e}")
            return []
    
    def get_articles_by_player(
        self, 
        player_name: str, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        league: Optional[League] = None,
        limit: int = 50
    ) -> List[Article]:
        """Get articles about a specific player.
        
        Args:
            player_name: Player name to search for
            start_date: Start date filter
            end_date: End date filter
            league: League filter
            limit: Maximum number of results
            
        Returns:
            List of articles about the player
        """
        query = SearchQuery(
            player_name=player_name,
            start_date=start_date,
            end_date=end_date,
            league=league,
            max_results=limit
        )
        return self.search_articles(query)
    
    def get_recent_articles(
        self, 
        hours: int = 24, 
        league: Optional[League] = None,
        limit: int = 100
    ) -> List[Article]:
        """Get recent articles.
        
        Args:
            hours: Number of hours to look back
            league: League filter
            limit: Maximum number of results
            
        Returns:
            List of recent articles
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Calculate cutoff time
                cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
                
                # Build query
                where_conditions = ["published_at >= ?"]
                params = [cutoff.isoformat()]
                
                if league:
                    where_conditions.append("league = ?")
                    params.append(league.value)
                
                sql = f"""
                    SELECT * FROM articles 
                    WHERE {' AND '.join(where_conditions)}
                    ORDER BY published_at DESC 
                    LIMIT {limit}
                """
                
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                
                articles = [self._row_to_article(row) for row in rows]
                logger.info(f"Found {len(articles)} recent articles")
                return articles
                
        except Exception as e:
            logger.error(f"Error getting recent articles: {e}")
            return []
    
    def delete_article(self, article_id: str) -> bool:
        """Delete an article by ID.
        
        Args:
            article_id: Article ID to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM articles WHERE id = ?", (article_id,))
                conn.commit()
                
                if cursor.rowcount > 0:
                    logger.info(f"Deleted article: {article_id}")
                    return True
                return False
                
        except Exception as e:
            logger.error(f"Error deleting article: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics.
        
        Returns:
            Dictionary with database statistics
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Total articles
                cursor.execute("SELECT COUNT(*) FROM articles")
                total_articles = cursor.fetchone()[0]
                
                # Articles by league
                cursor.execute("""
                    SELECT league, COUNT(*) 
                    FROM articles 
                    WHERE league IS NOT NULL 
                    GROUP BY league
                """)
                league_stats = dict(cursor.fetchall())
                
                # Articles by source
                cursor.execute("""
                    SELECT source_name, COUNT(*) 
                    FROM articles 
                    GROUP BY source_name
                """)
                source_stats = dict(cursor.fetchall())
                
                # Recent articles (last 24 hours)
                cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
                cursor.execute(
                    "SELECT COUNT(*) FROM articles WHERE published_at >= ?",
                    (cutoff.isoformat(),)
                )
                recent_articles = cursor.fetchone()[0]
                
                return {
                    'total_articles': total_articles,
                    'recent_articles_24h': recent_articles,
                    'league_stats': league_stats,
                    'source_stats': source_stats
                }
                
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}
    
    def _row_to_article(self, row: sqlite3.Row) -> Article:
        """Convert database row to Article object.
        
        Args:
            row: Database row
            
        Returns:
            Article object
        """
        from app.models import Source, SourceType
        
        # Parse JSON fields
        teams = json.loads(row['teams']) if row['teams'] else []
        players = json.loads(row['players']) if row['players'] else []
        tags = json.loads(row['tags']) if row['tags'] else []
        raw_data = json.loads(row['raw_data']) if row['raw_data'] else None
        
        # Create source
        source = Source(
            id=row['source_id'],
            name=row['source_name'],
            type=SourceType(row['source_type']),
            homepage=row['source_homepage'],
            league=League(row['league']) if row['league'] else None
        )
        
        # Parse published date
        published_at = datetime.fromisoformat(row['published_at'].replace('Z', '+00:00'))
        
        return Article(
            id=row['id'],
            source=source,
            title=row['title'],
            url=row['url'],
            published_at=published_at,
            byline=row['byline'],
            summary=row['summary'],
            image_url=row['image_url'],
            league=League(row['league']) if row['league'] else None,
            teams=teams,
            players=players,
            tags=tags,
            raw=raw_data
        )
