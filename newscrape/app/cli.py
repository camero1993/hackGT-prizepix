"""
CLI for the sports news scraper.
"""

import asyncio
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from app.models import League, SearchQuery, ExportFormat
from app.config import get_settings
from app.sources.googlenews import GoogleNewsAdapter
from app.sources.rss import RSSParser
from app.ingest.fetcher import HTTPFetcher
from app.ingest.normalizer import ArticleNormalizer
from app.ingest.enricher import PlayerMatcher, ArticleEnricher
from app.storage.sqlite import SQLiteStorage
from app.storage.export import ArticleExporter

# Initialize CLI
app = typer.Typer(help="Sports News Scraper - Fetch articles by player within date range")
console = Console()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.command()
def ingest(
    from_date: str = typer.Option(
        None, 
        "--from", 
        help="Start date (YYYY-MM-DD)"
    ),
    to_date: str = typer.Option(
        None, 
        "--to", 
        help="End date (YYYY-MM-DD)"
    ),
    league: Optional[str] = typer.Option(
        None, 
        "--league", 
        help="Filter by league (nba, nfl, mlb, epl, nhl)"
    ),
    sources: Optional[str] = typer.Option(
        None, 
        "--sources", 
        help="Comma-separated list of source IDs"
    ),
    max_articles: int = typer.Option(
        100, 
        "--max-articles", 
        help="Maximum articles to fetch per source"
    )
):
    """Ingest articles from all configured sources within a date range."""
    asyncio.run(_ingest_articles(from_date, to_date, league, sources, max_articles))


@app.command()
def by_player(
    player: str = typer.Argument(..., help="Player name to search for"),
    from_date: Optional[str] = typer.Option(
        None, 
        "--from", 
        help="Start date (YYYY-MM-DD)"
    ),
    to_date: Optional[str] = typer.Option(
        None, 
        "--to", 
        help="End date (YYYY-MM-DD)"
    ),
    league: Optional[str] = typer.Option(
        None, 
        "--league", 
        help="Filter by league (nba, nfl, mlb, epl, nhl)"
    ),
    output: Optional[str] = typer.Option(
        None, 
        "--out", 
        help="Output file path"
    ),
    format: str = typer.Option(
        "json", 
        "--format", 
        help="Output format (json, ndjson, csv)"
    ),
    max_results: int = typer.Option(
        50, 
        "--max-results", 
        help="Maximum number of results"
    )
):
    """Export player-specific items from DB to various formats."""
    asyncio.run(_by_player(player, from_date, to_date, league, output, format, max_results))


@app.command()
def gn_by_player(
    player: str = typer.Argument(..., help="Player name to search for"),
    from_date: Optional[str] = typer.Option(
        None, 
        "--from", 
        help="Start date (YYYY-MM-DD)"
    ),
    to_date: Optional[str] = typer.Option(
        None, 
        "--to", 
        help="End date (YYYY-MM-DD)"
    ),
    output: str = typer.Option(
        "out.json", 
        "--out", 
        help="Output file path"
    ),
    max_results: int = typer.Option(
        50, 
        "--max-results", 
        help="Maximum number of results"
    )
):
    """Fast path: Google News only (no DB), great for demos."""
    asyncio.run(_gn_by_player(player, from_date, to_date, output, max_results))


@app.command()
def stats():
    """Show database statistics."""
    asyncio.run(_show_stats())


async def _ingest_articles(
    from_date: Optional[str],
    to_date: Optional[str], 
    league: Optional[str],
    sources: Optional[str],
    max_articles: int
):
    """Ingest articles from all sources."""
    try:
        settings = get_settings()
        
        # Parse dates
        start_date = None
        end_date = None
        if from_date:
            start_date = datetime.fromisoformat(from_date)
        if to_date:
            end_date = datetime.fromisoformat(to_date)
        
        # Parse league
        league_enum = None
        if league:
            try:
                league_enum = League(league.lower())
            except ValueError:
                console.print(f"[red]Invalid league: {league}[/red]")
                return
        
        # Parse sources
        source_list = None
        if sources:
            source_list = [s.strip() for s in sources.split(',')]
        
        console.print(f"[bold blue]Starting article ingestion...[/bold blue]")
        if start_date:
            console.print(f"[dim]From: {start_date.strftime('%Y-%m-%d')}[/dim]")
        if end_date:
            console.print(f"[dim]To: {end_date.strftime('%Y-%m-%d')}[/dim]")
        if league_enum:
            console.print(f"[dim]League: {league_enum.value}[/dim]")
        
        # Initialize components
        storage = SQLiteStorage()
        exporter = ArticleExporter()
        
        # Load sources configuration
        sources_config = _load_sources_config()
        if not sources_config:
            console.print("[red]No sources configured[/red]")
            return
        
        # Filter sources if specified
        if source_list:
            sources_config = [s for s in sources_config if s.id in source_list]
        
        # Filter by league if specified
        if league_enum:
            sources_config = [s for s in sources_config if s.league == league_enum]
        
        console.print(f"[dim]Processing {len(sources_config)} sources...[/dim]")
        
        total_articles = 0
        processed_sources = 0
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Processing sources...", total=len(sources_config))
            
            async with HTTPFetcher() as fetcher:
                rss_parser = RSSParser(fetcher)
                normalizer = ArticleNormalizer()
                
                for source_config in sources_config:
                    try:
                        progress.update(task, description=f"Processing {source_config.id}...")
                        
                        # Parse RSS feed
                        raw_items = await rss_parser.parse_feed(source_config)
                        
                        if not raw_items:
                            console.print(f"[dim]No articles found in {source_config.id}[/dim]")
                            continue
                        
                        # Normalize articles
                        articles = []
                        for raw_item in raw_items:
                            article = normalizer.normalize(raw_item, source_config)
                            if article:
                                articles.append(article)
                        
                        # Filter by date range
                        if start_date or end_date:
                            from datetime import timezone
                            start_dt = start_date or datetime.min.replace(tzinfo=timezone.utc)
                            end_dt = end_date or datetime.max.replace(tzinfo=timezone.utc)
                            articles = normalizer.filter_by_date_range(articles, start_dt, end_dt)
                        
                        # Limit articles
                        articles = articles[:max_articles]
                        
                        # Save to database
                        saved_count = storage.save_articles(articles)
                        total_articles += saved_count
                        
                        console.print(f"[green]Saved {saved_count} articles from {source_config.id}[/green]")
                        processed_sources += 1
                        
                    except Exception as e:
                        console.print(f"[red]Error processing {source_config.id}: {e}[/red]")
                        continue
                    
                    progress.advance(task)
        
        # Show summary
        summary_text = f"Processed {processed_sources} sources\n"
        summary_text += f"Total articles saved: {total_articles}\n"
        summary_text += f"Database: {settings.db_url}"
        
        panel = Panel(summary_text, title="Ingestion Complete", border_style="green")
        console.print(panel)
        
    except Exception as e:
        console.print(f"[red]Error during ingestion: {e}[/red]")
        logger.error(f"Ingestion error: {e}", exc_info=True)


async def _by_player(
    player: str,
    from_date: Optional[str],
    to_date: Optional[str],
    league: Optional[str],
    output: Optional[str],
    format: str,
    max_results: int
):
    """Export player-specific articles from database."""
    try:
        # Parse dates
        start_date = None
        end_date = None
        if from_date:
            start_date = datetime.fromisoformat(from_date)
        if to_date:
            end_date = datetime.fromisoformat(to_date)
        
        # Parse league
        league_enum = None
        if league:
            try:
                league_enum = League(league.lower())
            except ValueError:
                console.print(f"[red]Invalid league: {league}[/red]")
                return
        
        # Parse format
        try:
            export_format = ExportFormat(format.lower())
        except ValueError:
            console.print(f"[red]Invalid format: {format}[/red]")
            return
        
        console.print(f"[bold blue]Searching for articles about: {player}[/bold blue]")
        
        # Search database
        storage = SQLiteStorage()
        articles = storage.get_articles_by_player(
            player_name=player,
            start_date=start_date,
            end_date=end_date,
            league=league_enum,
            limit=max_results
        )
        
        if not articles:
            console.print(f"[yellow]No articles found about {player}[/yellow]")
            return
        
        console.print(f"[green]Found {len(articles)} articles about {player}[/green]")
        
        # Display results table
        table = Table(title=f"Articles about {player}")
        table.add_column("Title", style="cyan", max_width=60)
        table.add_column("Source", style="magenta", width=15)
        table.add_column("Published", style="green", width=12)
        table.add_column("League", style="blue", width=8)
        
        for article in articles[:10]:  # Show first 10 in table
            title = article.title
            if len(title) > 57:
                title = title[:54] + "..."
            
            table.add_row(
                title,
                article.source.name,
                article.published_at.strftime("%m/%d %H:%M"),
                article.league.value if article.league else "Unknown"
            )
        
        console.print(table)
        
        if len(articles) > 10:
            console.print(f"[dim]... and {len(articles) - 10} more articles[/dim]")
        
        # Export to file if specified
        if output:
            exporter = ArticleExporter()
            success = exporter.export_articles(articles, output, export_format)
            if success:
                console.print(f"[green]Exported to {output}[/green]")
            else:
                console.print(f"[red]Failed to export to {output}[/red]")
        
    except Exception as e:
        console.print(f"[red]Error searching for player: {e}[/red]")
        logger.error(f"Player search error: {e}", exc_info=True)


async def _gn_by_player(
    player: str,
    from_date: Optional[str],
    to_date: Optional[str],
    output: str,
    max_results: int
):
    """Search Google News for player-specific articles."""
    try:
        # Parse dates
        start_date = None
        end_date = None
        if from_date:
            start_date = datetime.fromisoformat(from_date)
        if to_date:
            end_date = datetime.fromisoformat(to_date)
        
        console.print(f"[bold blue]Searching Google News for: {player}[/bold blue]")
        
        # Initialize Google News adapter
        gn_adapter = GoogleNewsAdapter()
        
        # Search for articles
        raw_items = gn_adapter.search_player(
            player_name=player,
            start_date=start_date,
            end_date=end_date,
            max_results=max_results
        )
        
        if not raw_items:
            console.print(f"[yellow]No articles found about {player}[/yellow]")
            return
        
        console.print(f"[green]Found {len(raw_items)} articles about {player}[/green]")
        
        # Normalize articles
        normalizer = ArticleNormalizer()
        articles = []
        for raw_item in raw_items:
            article = normalizer.normalize(raw_item)
            if article:
                articles.append(article)
        
        # Display results table
        table = Table(title=f"Google News Articles about {player}")
        table.add_column("Title", style="cyan", max_width=60)
        table.add_column("Source", style="magenta", width=15)
        table.add_column("Published", style="green", width=12)
        
        for article in articles[:10]:  # Show first 10 in table
            title = article.title
            if len(title) > 57:
                title = title[:54] + "..."
            
            table.add_row(
                title,
                article.source.name,
                article.published_at.strftime("%m/%d %H:%M")
            )
        
        console.print(table)
        
        if len(articles) > 10:
            console.print(f"[dim]... and {len(articles) - 10} more articles[/dim]")
        
        # Export to file
        exporter = ArticleExporter()
        success = exporter.export_articles(articles, output, ExportFormat.JSON)
        if success:
            console.print(f"[green]Exported to {output}[/green]")
        else:
            console.print(f"[red]Failed to export to {output}[/red]")
        
    except Exception as e:
        console.print(f"[red]Error searching Google News: {e}[/red]")
        logger.error(f"Google News search error: {e}", exc_info=True)


async def _show_stats():
    """Show database statistics."""
    try:
        storage = SQLiteStorage()
        stats = storage.get_stats()
        
        if not stats:
            console.print("[red]No statistics available[/red]")
            return
        
        # Create stats table
        table = Table(title="Database Statistics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Total Articles", str(stats.get('total_articles', 0)))
        table.add_row("Recent Articles (24h)", str(stats.get('recent_articles_24h', 0)))
        
        console.print(table)
        
        # League breakdown
        if stats.get('league_stats'):
            league_table = Table(title="Articles by League")
            league_table.add_column("League", style="cyan")
            league_table.add_column("Count", style="green")
            
            for league, count in stats['league_stats'].items():
                league_table.add_row(league.upper(), str(count))
            
            console.print(league_table)
        
        # Source breakdown
        if stats.get('source_stats'):
            source_table = Table(title="Articles by Source")
            source_table.add_column("Source", style="cyan")
            source_table.add_column("Count", style="green")
            
            for source, count in sorted(stats['source_stats'].items(), key=lambda x: x[1], reverse=True):
                source_table.add_row(source, str(count))
            
            console.print(source_table)
        
    except Exception as e:
        console.print(f"[red]Error getting statistics: {e}[/red]")
        logger.error(f"Stats error: {e}", exc_info=True)


def _load_sources_config():
    """Load sources configuration from YAML file."""
    try:
        import yaml
        settings = get_settings()
        
        if not settings.sources_file.exists():
            console.print(f"[yellow]Sources file not found: {settings.sources_file}[/yellow]")
            return []
        
        with open(settings.sources_file, 'r') as f:
            sources_data = yaml.safe_load(f)
        
        from app.models import SourceConfig
        sources = []
        for source_data in sources_data:
            try:
                source = SourceConfig(**source_data)
                sources.append(source)
            except Exception as e:
                console.print(f"[yellow]Error loading source {source_data.get('id', 'unknown')}: {e}[/yellow]")
                continue
        
        return sources
        
    except Exception as e:
        console.print(f"[red]Error loading sources configuration: {e}[/red]")
        return []


def main():
    """Main CLI entry point."""
    app()


if __name__ == "__main__":
    main()
