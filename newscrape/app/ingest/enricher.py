"""
Player matching and article enrichment.
"""

import csv
import logging
import re
from typing import List, Dict, Set, Optional, Tuple
from pathlib import Path
from difflib import SequenceMatcher

from app.models import Article, Player, League
from app.config import get_settings

logger = logging.getLogger(__name__)


class PlayerMatcher:
    """Matches articles to players using various strategies."""
    
    def __init__(self, players_file: str):
        """Initialize the player matcher.
        
        Args:
            players_file: Path to players CSV file
        """
        self.players_file = Path(players_file)
        self.players: List[Player] = []
        self.player_lookup: Dict[str, Player] = {}
        self.name_variations: Dict[str, Player] = {}
        self.settings = get_settings()
        
        self._load_players()
    
    def _load_players(self):
        """Load players from CSV file."""
        try:
            if not self.players_file.exists():
                logger.warning(f"Players file not found: {self.players_file}")
                return
            
            with open(self.players_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        # Parse alternative names
                        alt_names = []
                        if row.get('alt_names'):
                            alt_names = [name.strip() for name in row['alt_names'].split(';') if name.strip()]
                        
                        # Parse teams
                        teams = []
                        if row.get('teams'):
                            teams = [team.strip() for team in row['teams'].split(',') if team.strip()]
                        
                        player = Player(
                            player_id=row['player_id'],
                            canonical_name=row['canonical_name'],
                            alt_names=alt_names,
                            league=League(row['league']),
                            teams=teams
                        )
                        
                        self.players.append(player)
                        self.player_lookup[player.player_id] = player
                        
                        # Index all name variations
                        all_names = [player.canonical_name] + alt_names
                        for name in all_names:
                            self.name_variations[name.lower()] = player
                        
                    except Exception as e:
                        logger.warning(f"Error loading player from row {row}: {e}")
                        continue
            
            logger.info(f"Loaded {len(self.players)} players from {self.players_file}")
            
        except Exception as e:
            logger.error(f"Error loading players from {self.players_file}: {e}")
    
    def find_matching_players(self, text: str, league: Optional[League] = None) -> List[Tuple[Player, float]]:
        """Find players mentioned in text.
        
        Args:
            text: Text to search for players
            league: Optional league filter
            
        Returns:
            List of (Player, confidence_score) tuples
        """
        if not text:
            return []
        
        text_lower = text.lower()
        matches = []
        
        # Exact matches (highest confidence)
        for name, player in self.name_variations.items():
            if league and player.league != league:
                continue
            
            # Check for exact match
            if name in text_lower:
                # Calculate confidence based on context
                confidence = self._calculate_confidence(text, name, player)
                if confidence >= self.settings.player_match_threshold:
                    matches.append((player, confidence))
        
        # Fuzzy matches for partial names
        for player in self.players:
            if league and player.league != league:
                continue
            
            # Check canonical name and alt names
            all_names = [player.canonical_name] + player.alt_names
            for name in all_names:
                if len(name.split()) >= 2:  # Only fuzzy match multi-word names
                    confidence = self._fuzzy_match(text, name)
                    if confidence >= self.settings.player_match_threshold:
                        matches.append((player, confidence))
        
        # Remove duplicates and sort by confidence
        unique_matches = {}
        for player, confidence in matches:
            if player.player_id not in unique_matches or confidence > unique_matches[player.player_id][1]:
                unique_matches[player.player_id] = (player, confidence)
        
        return sorted(unique_matches.values(), key=lambda x: x[1], reverse=True)
    
    def _calculate_confidence(self, text: str, name: str, player: Player) -> float:
        """Calculate confidence score for a player match.
        
        Args:
            text: Text being searched
            name: Name that was matched
            player: Player object
            
        Returns:
            Confidence score between 0 and 1
        """
        text_lower = text.lower()
        name_lower = name.lower()
        
        # Base confidence
        confidence = 0.7
        
        # Boost for exact match in title
        if 'title' in text_lower or len(text.split()) < 50:  # Assume short text is title
            confidence += 0.2
        
        # Boost for team context
        for team in player.teams:
            if team.lower() in text_lower:
                confidence += 0.1
                break
        
        # Boost for league context
        league_keywords = {
            League.NBA: ['nba', 'basketball', 'lakers', 'warriors', 'celtics'],
            League.NFL: ['nfl', 'football', 'patriots', 'chiefs', 'bills'],
            League.MLB: ['mlb', 'baseball', 'yankees', 'dodgers', 'red sox'],
            League.EPL: ['epl', 'premier league', 'soccer', 'manchester', 'liverpool'],
            League.NHL: ['nhl', 'hockey', 'bruins', 'rangers', 'maple leafs'],
        }
        
        if player.league in league_keywords:
            for keyword in league_keywords[player.league]:
                if keyword in text_lower:
                    confidence += 0.05
                    break
        
        # Boost for position/role keywords
        position_keywords = ['quarterback', 'running back', 'wide receiver', 'point guard', 
                           'shooting guard', 'small forward', 'power forward', 'center',
                           'pitcher', 'catcher', 'first base', 'second base', 'third base',
                           'shortstop', 'left field', 'center field', 'right field']
        
        for keyword in position_keywords:
            if keyword in text_lower:
                confidence += 0.05
                break
        
        return min(confidence, 1.0)
    
    def _fuzzy_match(self, text: str, name: str) -> float:
        """Perform fuzzy matching between text and name.
        
        Args:
            text: Text to search
            name: Name to match
            
        Returns:
            Similarity score between 0 and 1
        """
        text_lower = text.lower()
        name_lower = name.lower()
        
        # Split name into words
        name_words = name_lower.split()
        if len(name_words) < 2:
            return 0.0
        
        # Check if all words in name appear in text
        words_found = 0
        for word in name_words:
            if word in text_lower:
                words_found += 1
        
        # Calculate similarity
        similarity = words_found / len(name_words)
        
        # Use SequenceMatcher for more sophisticated matching
        matcher = SequenceMatcher(None, text_lower, name_lower)
        sequence_similarity = matcher.ratio()
        
        # Combine both approaches
        return max(similarity * 0.7, sequence_similarity * 0.3)
    
    def get_player_by_id(self, player_id: str) -> Optional[Player]:
        """Get player by ID.
        
        Args:
            player_id: Player ID
            
        Returns:
            Player object or None
        """
        return self.player_lookup.get(player_id)
    
    def get_players_by_league(self, league: League) -> List[Player]:
        """Get all players in a league.
        
        Args:
            league: League to filter by
            
        Returns:
            List of players in the league
        """
        return [player for player in self.players if player.league == league]


class ArticleEnricher:
    """Enriches articles with player and team information."""
    
    def __init__(self, player_matcher: PlayerMatcher):
        """Initialize the article enricher.
        
        Args:
            player_matcher: Player matcher instance
        """
        self.player_matcher = player_matcher
        self.settings = get_settings()
    
    def enrich_articles(self, articles: List[Article]) -> List[Article]:
        """Enrich a list of articles with player and team information.
        
        Args:
            articles: List of articles to enrich
            
        Returns:
            Enriched articles
        """
        enriched = []
        
        for article in articles:
            try:
                enriched_article = self.enrich_article(article)
                if enriched_article:
                    enriched.append(enriched_article)
            except Exception as e:
                logger.warning(f"Error enriching article '{article.title}': {e}")
                enriched.append(article)  # Return original if enrichment fails
        
        logger.info(f"Enriched {len(enriched)} articles")
        return enriched
    
    def enrich_article(self, article: Article) -> Article:
        """Enrich a single article with player and team information.
        
        Args:
            article: Article to enrich
            
        Returns:
            Enriched article
        """
        # Combine text for player matching
        text_parts = [article.title]
        if article.summary:
            text_parts.append(article.summary)
        
        combined_text = ' '.join(text_parts)
        
        # Find matching players
        player_matches = self.player_matcher.find_matching_players(
            combined_text, 
            article.league
        )
        
        # Extract players and teams
        players = []
        teams = set()
        
        for player, confidence in player_matches:
            players.append(player.canonical_name)
            teams.update(player.teams)
        
        # Generate tags
        tags = self._generate_tags(article, players, teams)
        
        # Create enriched article
        enriched_article = article.copy(deep=True)
        enriched_article.players = players
        enriched_article.teams = list(teams)
        enriched_article.tags = tags
        
        return enriched_article
    
    def _generate_tags(self, article: Article, players: List[str], teams: Set[str]) -> List[str]:
        """Generate tags for an article.
        
        Args:
            article: Original article
            players: List of player names
            teams: Set of team names
            
        Returns:
            List of tags
        """
        tags = []
        
        # Add league tag
        if article.league and article.league != League.UNKNOWN:
            tags.append(article.league.value)
        
        # Add player tags
        for player in players:
            tags.append(f"player:{player}")
        
        # Add team tags
        for team in teams:
            tags.append(f"team:{team}")
        
        # Add content-based tags
        content = f"{article.title} {article.summary or ''}".lower()
        
        content_tags = {
            'injury': ['injury', 'hurt', 'injured', 'out', 'day-to-day', 'questionable'],
            'trade': ['trade', 'traded', 'deal', 'acquisition', 'signing'],
            'contract': ['contract', 'extension', 'deal', 'signing', 'free agent'],
            'draft': ['draft', 'picked', 'selection', 'rookie'],
            'award': ['award', 'honor', 'recognition', 'player of the week', 'mvp'],
            'record': ['record', 'milestone', 'achievement', 'first', 'most'],
            'playoff': ['playoff', 'postseason', 'championship', 'finals'],
        }
        
        for tag, keywords in content_tags.items():
            if any(keyword in content for keyword in keywords):
                tags.append(tag)
        
        return list(set(tags))  # Remove duplicates

