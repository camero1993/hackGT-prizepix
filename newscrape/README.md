# Sports News Scraper

A reliable, legally-compliant news scraper/ingester that fetches articles by player within a date range, normalizes them to a common schema, and exposes simple CLI + API functions.

## Features

- **Player-Specific Search**: Search for news articles about specific athletes
- **Date Range Filtering**: Filter articles by publication date
- **Multiple Data Sources**: Google News RSS integration with extensible architecture
- **Data Normalization**: Standardized article schema across all sources
- **REST API**: Flask-based API for integration with other applications
- **Export Formats**: JSON, CSV, and NDJSON export capabilities
- **NBA Athletes Tracking**: Pre-configured for 10 tracked NBA athletes

## Quick Start

### Installation

```bash
# Install dependencies
pip install -e .

# Or install specific dependencies
pip install pygooglenews feedparser httpx typer rich pydantic python-dateutil pytz sqlalchemy flask flask-cors
```

### CLI Usage

```bash
# Search for a specific player
python -m app.cli gn-by-player "LeBron James" --from 2025-09-25 --to 2025-09-27 --max-results 10

# Search for all 10 NBA athletes
python -m app.cli gn-by-player "NBA" --max-results 50

# Get help
python -m app.cli --help
```

### API Usage

Start the API server:

```bash
python api_server.py
```

The API will be available at `http://localhost:5001`

#### API Endpoints

- `GET /health` - Health check
- `GET /api/headlines?player=NAME&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` - Get top 3 headlines per player (simple JSON with URLs)
- `GET /api/search/player?player=NAME&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` - Search single player
- `POST /api/search/multiple-players` - Search multiple players
- `GET /api/search/nba-athletes` - Search all 10 NBA athletes

#### Example API Calls

```bash
# Get headlines for LeBron James
curl "http://localhost:5001/api/headlines?player=LeBron%20James"

# Get all NBA headlines
curl "http://localhost:5001/api/headlines"

# Search for LeBron James (full data)
curl "http://localhost:5001/api/search/player?player=LeBron%20James&max_results=5"

# Search all NBA athletes (full data)
curl "http://localhost:5001/api/search/nba-athletes?max_results_per_player=3"
```

#### Node.js/React Integration

```javascript
// Get simple headlines with URLs for a specific player
const response = await fetch('http://localhost:5001/api/headlines?player=LeBron James');
const data = await response.json();
console.log(data.headlines); // Array of {title, url} objects (top 3)

// Get headlines for all NBA athletes
const response2 = await fetch('http://localhost:5001/api/headlines');
const data2 = await response2.json();
console.log(data2.athlete_headlines); // Object with athlete names as keys, arrays of {title, url} as values
console.log(data2.top_headlines); // Top 3 headlines overall

// Search for a player (full data)
const response3 = await fetch('http://localhost:5001/api/search/player?player=LeBron James&max_results=10');
const data3 = await response3.json();
console.log(data3.articles);
```

## Project Structure

```
.
├── app/                    # Main application code
│   ├── __init__.py
│   ├── cli.py             # Command-line interface
│   ├── config.py          # Configuration settings
│   ├── models.py          # Pydantic data models
│   ├── sources/           # Data source adapters
│   │   ├── googlenews.py  # Google News adapter
│   │   └── rss.py         # RSS feed parser
│   ├── ingest/            # Data ingestion
│   │   ├── fetcher.py     # HTTP client
│   │   ├── normalizer.py  # Article normalizer
│   │   └── enricher.py    # Player matching
│   └── storage/           # Data storage
│       ├── sqlite.py      # SQLite database
│       └── export.py      # Export utilities
├── data/                  # Configuration data
│   ├── sources.yaml       # News source configurations
│   └── players.csv        # Player database
├── api_server.py          # Flask REST API server
├── api_examples.js        # Node.js/React integration examples
└── pyproject.toml         # Project dependencies
```

## Tracked NBA Athletes

The system is pre-configured to track these 10 NBA athletes:

1. Shai Gilgeous-Alexander (OKC)
2. Tyrese Haliburton (IND)
3. Nikola Jokić (DEN)
4. Jayson Tatum (BOS)
5. Stephen Curry (GSW)
6. Donovan Mitchell (CLE)
7. LeBron James (LAL)
8. Devin Booker (PHX)
9. Giannis Antetokounmpo
10. Joel Embiid (PHI)

## Data Schema

Articles are normalized to a consistent schema:

```json
{
  "id": "unique-article-id",
  "title": "Article Title",
  "url": "https://...",
  "published_at": "2025-09-27T10:00:00+00:00",
  "byline": "Author Name",
  "summary": "Article summary...",
  "image_url": "https://...",
  "league": "nba",
  "teams": ["LAL"],
  "players": ["LeBron James"],
  "tags": ["injury", "trade"],
  "source": {
    "id": "gn-en-us",
    "name": "Google News",
    "type": "gn"
  }
}
```

## Legal & Ethical Compliance

- Uses official RSS feeds and documented APIs
- Respects rate limits and implements proper throttling
- No paywalled content scraping
- Caches data to minimize requests
- Follows robots.txt guidelines

## Development

### Running Tests

```bash
# Run the test suite
python -m pytest tests/

# Run with coverage
python -m pytest --cov=app tests/
```

### Adding New Data Sources

1. Create a new adapter in `app/sources/`
2. Implement the required interface methods
3. Add configuration to `data/sources.yaml`
4. Update the source registry

### Adding New Players

Edit `data/players.csv` to add new players with their canonical names, alternate names, league, and teams.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions, please open an issue on GitHub.
