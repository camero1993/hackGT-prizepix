"""
Export functionality for articles in various formats.
"""

import json
import csv
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

from app.models import Article, ExportFormat
from app.config import get_settings

logger = logging.getLogger(__name__)


class ArticleExporter:
    """Exports articles in various formats."""
    
    def __init__(self):
        """Initialize the article exporter."""
        self.settings = get_settings()
    
    def export_articles(
        self, 
        articles: List[Article], 
        output_path: str, 
        format: ExportFormat = ExportFormat.JSON
    ) -> bool:
        """Export articles to a file.
        
        Args:
            articles: List of articles to export
            output_path: Output file path
            format: Export format
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            if format == ExportFormat.JSON:
                return self._export_json(articles, output_file)
            elif format == ExportFormat.NDJSON:
                return self._export_ndjson(articles, output_file)
            elif format == ExportFormat.CSV:
                return self._export_csv(articles, output_file)
            else:
                logger.error(f"Unsupported export format: {format}")
                return False
                
        except Exception as e:
            logger.error(f"Error exporting articles: {e}")
            return False
    
    def _export_json(self, articles: List[Article], output_file: Path) -> bool:
        """Export articles as JSON.
        
        Args:
            articles: List of articles to export
            output_file: Output file path
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            # Convert articles to dictionaries
            articles_data = []
            for article in articles:
                article_dict = article.dict()
                # Convert datetime to ISO string
                article_dict['published_at'] = article.published_at.isoformat()
                # Convert HttpUrl objects to strings
                if 'url' in article_dict:
                    article_dict['url'] = str(article_dict['url'])
                if 'image_url' in article_dict and article_dict['image_url']:
                    article_dict['image_url'] = str(article_dict['image_url'])
                if 'source' in article_dict and 'homepage' in article_dict['source'] and article_dict['source']['homepage']:
                    article_dict['source']['homepage'] = str(article_dict['source']['homepage'])
                articles_data.append(article_dict)
            
            # Write JSON file
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(articles_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Exported {len(articles)} articles to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting JSON: {e}")
            return False
    
    def _export_ndjson(self, articles: List[Article], output_file: Path) -> bool:
        """Export articles as NDJSON (newline-delimited JSON).
        
        Args:
            articles: List of articles to export
            output_file: Output file path
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                for article in articles:
                    article_dict = article.dict()
                    # Convert datetime to ISO string
                    article_dict['published_at'] = article.published_at.isoformat()
                    # Convert HttpUrl objects to strings
                    if 'url' in article_dict:
                        article_dict['url'] = str(article_dict['url'])
                    if 'image_url' in article_dict and article_dict['image_url']:
                        article_dict['image_url'] = str(article_dict['image_url'])
                    if 'source' in article_dict and 'homepage' in article_dict['source'] and article_dict['source']['homepage']:
                        article_dict['source']['homepage'] = str(article_dict['source']['homepage'])
                    f.write(json.dumps(article_dict, ensure_ascii=False) + '\n')
            
            logger.info(f"Exported {len(articles)} articles to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting NDJSON: {e}")
            return False
    
    def _export_csv(self, articles: List[Article], output_file: Path) -> bool:
        """Export articles as CSV.
        
        Args:
            articles: List of articles to export
            output_file: Output file path
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            if not articles:
                logger.warning("No articles to export")
                return True
            
            # Define CSV columns
            fieldnames = [
                'id', 'title', 'url', 'published_at', 'byline', 'summary',
                'image_url', 'league', 'source_name', 'source_type',
                'teams', 'players', 'tags'
            ]
            
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for article in articles:
                    row = {
                        'id': article.id,
                        'title': article.title,
                        'url': str(article.url),
                        'published_at': article.published_at.isoformat(),
                        'byline': article.byline or '',
                        'summary': article.summary or '',
                        'image_url': str(article.image_url) if article.image_url else '',
                        'league': article.league.value if article.league else '',
                        'source_name': article.source.name,
                        'source_type': article.source.type.value,
                        'teams': '; '.join(article.teams),
                        'players': '; '.join(article.players),
                        'tags': '; '.join(article.tags)
                    }
                    writer.writerow(row)
            
            logger.info(f"Exported {len(articles)} articles to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting CSV: {e}")
            return False
    
    def export_player_summary(
        self, 
        articles: List[Article], 
        player_name: str, 
        output_path: str
    ) -> bool:
        """Export a player-specific summary.
        
        Args:
            articles: List of articles about the player
            player_name: Name of the player
            output_path: Output file path
            
        Returns:
            True if export successful, False otherwise
        """
        try:
            # Generate summary data
            summary = self._generate_player_summary(articles, player_name)
            
            # Write summary to file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Exported player summary for {player_name} to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting player summary: {e}")
            return False
    
    def _generate_player_summary(
        self, 
        articles: List[Article], 
        player_name: str
    ) -> Dict[str, Any]:
        """Generate a summary for a player's articles.
        
        Args:
            articles: List of articles about the player
            player_name: Name of the player
            
        Returns:
            Summary dictionary
        """
        # Count articles by source
        source_counts = {}
        for article in articles:
            source_name = article.source.name
            source_counts[source_name] = source_counts.get(source_name, 0) + 1
        
        # Count articles by league
        league_counts = {}
        for article in articles:
            league = article.league.value if article.league else 'unknown'
            league_counts[league] = league_counts.get(league, 0) + 1
        
        # Count articles by team
        team_counts = {}
        for article in articles:
            for team in article.teams:
                team_counts[team] = team_counts.get(team, 0) + 1
        
        # Count articles by tag
        tag_counts = {}
        for article in articles:
            for tag in article.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        # Get date range
        if articles:
            dates = [article.published_at for article in articles]
            min_date = min(dates)
            max_date = max(dates)
        else:
            min_date = max_date = None
        
        return {
            'player_name': player_name,
            'total_articles': len(articles),
            'date_range': {
                'start': min_date.isoformat() if min_date else None,
                'end': max_date.isoformat() if max_date else None
            },
            'sources': source_counts,
            'leagues': league_counts,
            'teams': team_counts,
            'top_tags': dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
            'articles': [
                {
                    'title': article.title,
                    'url': str(article.url),
                    'published_at': article.published_at.isoformat(),
                    'source': article.source.name,
                    'league': article.league.value if article.league else None,
                    'teams': article.teams,
                    'tags': article.tags
                }
                for article in articles
            ]
        }
