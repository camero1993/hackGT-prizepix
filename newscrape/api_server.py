#!/usr/bin/env python3
"""
REST API server for the sports news scraper.
Provides endpoints for Node.js/React applications to search for athlete news.
"""

import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import json
import logging

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from flask import Flask, request, jsonify
from flask_cors import CORS
from app.sources.googlenews_mock import MockGoogleNewsAdapter as GoogleNewsAdapter
from app.ingest.normalizer import ArticleNormalizer
from app.storage.export import ArticleExporter, ExportFormat

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize components
gn_adapter = GoogleNewsAdapter()
normalizer = ArticleNormalizer()
exporter = ArticleExporter()

def serialize_article(article):
    """Serialize an article object for JSON response."""
    article_dict = article.model_dump()
    
    # Convert HttpUrl objects to strings
    if 'url' in article_dict and article_dict['url']:
        article_dict['url'] = str(article_dict['url'])
    if 'image_url' in article_dict and article_dict['image_url']:
        article_dict['image_url'] = str(article_dict['image_url'])
    
    # Convert datetime objects to ISO strings
    if 'published_at' in article_dict and article_dict['published_at']:
        article_dict['published_at'] = article_dict['published_at'].isoformat()
    
    # Handle source object
    if 'source' in article_dict and article_dict['source']:
        source = article_dict['source']
        if 'homepage' in source and source['homepage']:
            source['homepage'] = str(source['homepage'])
    
    return article_dict

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'service': 'sports-news-scraper-api'
    })

@app.route('/api/search/player', methods=['GET'])
def search_player():
    """
    Search for articles about a specific player.
    
    Query Parameters:
    - player: Player name to search for (required)
    - from_date: Start date in YYYY-MM-DD format (optional)
    - to_date: End date in YYYY-MM-DD format (optional)
    - max_results: Maximum number of results (default: 10, max: 50)
    - format: Response format - 'json' or 'summary' (default: 'json')
    """
    try:
        # Get query parameters
        player = request.args.get('player')
        if not player:
            return jsonify({'error': 'Player name is required'}), 400
        
        from_date_str = request.args.get('from_date')
        to_date_str = request.args.get('to_date')
        max_results = min(int(request.args.get('max_results', 10)), 50)
        response_format = request.args.get('format', 'json')
        
        # Parse dates
        from_date = None
        to_date = None
        if from_date_str:
            try:
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            except ValueError:
                return jsonify({'error': 'Invalid from_date format. Use YYYY-MM-DD'}), 400
        
        if to_date_str:
            try:
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            except ValueError:
                return jsonify({'error': 'Invalid to_date format. Use YYYY-MM-DD'}), 400
        
        # Search for articles
        logger.info(f"Searching for player: {player}")
        raw_items = gn_adapter.search_player(player, from_date, to_date, max_results)
        
        # Normalize articles
        articles = []
        for raw_item in raw_items:
            article = normalizer.normalize(raw_item)
            if article:
                articles.append(article)
        
        # Prepare response based on format
        if response_format == 'summary':
            # Return summary format with just headlines and key info
            response_data = {
                'player': player,
                'total_articles': len(articles),
                'search_date': datetime.now(timezone.utc).isoformat(),
                'date_range': {
                    'from': from_date.isoformat() if from_date else None,
                    'to': to_date.isoformat() if to_date else None
                },
                'articles': []
            }
            
            for article in articles:
                response_data['articles'].append({
                    'id': article.id,
                    'title': article.title,
                    'url': str(article.url),
                    'published_at': article.published_at.isoformat(),
                    'source': article.source.name,
                    'summary': article.summary[:200] + '...' if article.summary and len(article.summary) > 200 else article.summary,
                    'image_url': str(article.image_url) if article.image_url else None
                })
        else:
            # Return full JSON format
            response_data = {
                'player': player,
                'total_articles': len(articles),
                'search_date': datetime.now(timezone.utc).isoformat(),
                'date_range': {
                    'from': from_date.isoformat() if from_date else None,
                    'to': to_date.isoformat() if to_date else None
                },
                'articles': [serialize_article(article) for article in articles]
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in search_player: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/search/multiple-players', methods=['POST'])
def search_multiple_players():
    """
    Search for articles about multiple players.
    
    Request Body:
    {
        "players": ["Player 1", "Player 2", ...],
        "from_date": "2025-09-01",
        "to_date": "2025-09-30",
        "max_results_per_player": 5
    }
    """
    try:
        data = request.get_json()
        if not data or 'players' not in data:
            return jsonify({'error': 'Players list is required'}), 400
        
        players = data.get('players', [])
        if not isinstance(players, list) or len(players) == 0:
            return jsonify({'error': 'Players must be a non-empty list'}), 400
        
        from_date_str = data.get('from_date')
        to_date_str = data.get('to_date')
        max_results_per_player = min(int(data.get('max_results_per_player', 5)), 20)
        
        # Parse dates
        from_date = None
        to_date = None
        if from_date_str:
            from_date = datetime.strptime(from_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        if to_date_str:
            to_date = datetime.strptime(to_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        
        # Search for each player
        results = {}
        total_articles = 0
        
        for player in players:
            try:
                raw_items = gn_adapter.search_player(player, from_date, to_date, max_results_per_player)
                articles = []
                for raw_item in raw_items:
                    article = normalizer.normalize(raw_item)
                    if article:
                        articles.append(article)
                
                results[player] = {
                    'articles': [serialize_article(article) for article in articles],
                    'count': len(articles)
                }
                total_articles += len(articles)
                
            except Exception as e:
                logger.warning(f"Error searching for player {player}: {e}")
                results[player] = {
                    'articles': [],
                    'count': 0,
                    'error': str(e)
                }
        
        response_data = {
            'players_searched': players,
            'total_articles': total_articles,
            'search_date': datetime.now(timezone.utc).isoformat(),
            'date_range': {
                'from': from_date.isoformat() if from_date else None,
                'to': to_date.isoformat() if to_date else None
            },
            'results': results
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in search_multiple_players: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/headlines', methods=['GET'])
def get_headlines():
    """
    Get top 3 headlines for a player or all NBA athletes.
    
    Query Parameters:
    - player: Player name to search for (optional, if not provided searches all NBA athletes)
    - from_date: Start date in YYYY-MM-DD format (optional)
    - to_date: End date in YYYY-MM-DD format (optional)
    """
    try:
        player = request.args.get('player')
        from_date_str = request.args.get('from_date')
        to_date_str = request.args.get('to_date')
        
        # Parse dates
        from_date = None
        to_date = None
        if from_date_str:
            from_date = datetime.strptime(from_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        if to_date_str:
            to_date = datetime.strptime(to_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        
        if player:
            # Search for specific player
            raw_items = gn_adapter.search_player(player, from_date, to_date, 3)
            articles = []
            for raw_item in raw_items:
                article = normalizer.normalize(raw_item)
                if article:
                    articles.append(article)
            
            headlines = []
            for article in articles[:3]:
                headlines.append({
                    'title': article.title,
                    'url': str(article.url)
                })
            
            return jsonify({
                'player': player,
                'headlines': headlines,
                'count': len(headlines),
                'search_date': datetime.now(timezone.utc).isoformat()
            })
        else:
            # Search all NBA athletes
            nba_athletes = [
                "Shai Gilgeous-Alexander",
                "Tyrese Haliburton", 
                "Nikola Jokić",
                "Jayson Tatum",
                "Stephen Curry",
                "Donovan Mitchell",
                "LeBron James",
                "Devin Booker",
                "Giannis Antetokounmpo",
                "Joel Embiid"
            ]
            
            all_headlines = []
            athlete_headlines = {}
            
            for athlete in nba_athletes:
                try:
                    raw_items = gn_adapter.search_player(athlete, from_date, to_date, 3)
                    athlete_articles = []
                    for raw_item in raw_items:
                        article = normalizer.normalize(raw_item)
                        if article:
                            headline_data = {
                                'title': article.title,
                                'url': str(article.url)
                            }
                            athlete_articles.append(headline_data)
                            all_headlines.append(headline_data)
                    
                    athlete_headlines[athlete] = athlete_articles
                except Exception as e:
                    logger.warning(f"Error searching for athlete {athlete}: {e}")
                    athlete_headlines[athlete] = []
            
            return jsonify({
                'athletes_searched': nba_athletes,
                'top_headlines': all_headlines[:3],
                'athlete_headlines': athlete_headlines,
                'total_found': len(all_headlines),
                'search_date': datetime.now(timezone.utc).isoformat()
            })
            
    except Exception as e:
        logger.error(f"Error in get_headlines: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/search/nba-athletes', methods=['GET'])
def search_nba_athletes():
    """
    Search for the 10 tracked NBA athletes.
    
    Query Parameters:
    - from_date: Start date in YYYY-MM-DD format (optional)
    - to_date: End date in YYYY-MM-DD format (optional)
    - max_results_per_player: Max results per player (default: 3, max: 10)
    """
    try:
        # The 10 NBA athletes being tracked
        nba_athletes = [
            "Shai Gilgeous-Alexander",
            "Tyrese Haliburton", 
            "Nikola Jokić",
            "Jayson Tatum",
            "Stephen Curry",
            "Donovan Mitchell",
            "LeBron James",
            "Devin Booker",
            "Giannis Antetokounmpo",
            "Joel Embiid"
        ]
        
        from_date_str = request.args.get('from_date')
        to_date_str = request.args.get('to_date')
        max_results_per_player = min(int(request.args.get('max_results_per_player', 3)), 10)
        
        # Parse dates
        from_date = None
        to_date = None
        if from_date_str:
            from_date = datetime.strptime(from_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        if to_date_str:
            to_date = datetime.strptime(to_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        
        # Search for each athlete
        results = {}
        total_articles = 0
        
        for athlete in nba_athletes:
            try:
                raw_items = gn_adapter.search_player(athlete, from_date, to_date, max_results_per_player)
                articles = []
                for raw_item in raw_items:
                    article = normalizer.normalize(raw_item)
                    if article:
                        articles.append(article)
                
                results[athlete] = {
                    'articles': [serialize_article(article) for article in articles],
                    'count': len(articles)
                }
                total_articles += len(articles)
                
            except Exception as e:
                logger.warning(f"Error searching for athlete {athlete}: {e}")
                results[athlete] = {
                    'articles': [],
                    'count': 0,
                    'error': str(e)
                }
        
        response_data = {
            'athletes_searched': nba_athletes,
            'total_articles': total_articles,
            'search_date': datetime.now(timezone.utc).isoformat(),
            'date_range': {
                'from': from_date.isoformat() if from_date else None,
                'to': to_date.isoformat() if to_date else None
            },
            'results': results
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in search_nba_athletes: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/export', methods=['POST'])
def export_articles():
    """
    Export articles to various formats.
    
    Request Body:
    {
        "articles": [...], // Array of article objects
        "format": "json|csv|ndjson",
        "filename": "optional_filename"
    }
    """
    try:
        data = request.get_json()
        if not data or 'articles' not in data:
            return jsonify({'error': 'Articles data is required'}), 400
        
        articles_data = data.get('articles', [])
        export_format = data.get('format', 'json')
        filename = data.get('filename', f'articles_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        
        # Convert to Article objects
        articles = []
        for article_data in articles_data:
            try:
                # This would need proper deserialization in a real implementation
                # For now, we'll return the data as-is
                articles.append(article_data)
            except Exception as e:
                logger.warning(f"Error processing article: {e}")
                continue
        
        # For now, return the articles data
        # In a real implementation, you'd use the exporter
        return jsonify({
            'message': 'Export functionality would be implemented here',
            'articles_count': len(articles),
            'format': export_format,
            'filename': filename
        })
        
    except Exception as e:
        logger.error(f"Error in export_articles: {e}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🏀 Sports News Scraper API Server")
    print("=" * 40)
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  GET  /api/headlines - Get top 3 headlines (simple JSON)")
    print("  GET  /api/search/player - Search single player")
    print("  POST /api/search/multiple-players - Search multiple players")
    print("  GET  /api/search/nba-athletes - Search all 10 NBA athletes")
    print("  POST /api/export - Export articles")
    print("=" * 40)
    print("Starting server on http://localhost:5001")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
