# Sports News Scraper API Setup Guide

This guide will help you get the Sports News Scraper API up and running for your frontend application.

## Quick Start

### Option 1: Using the Startup Script (Recommended)

```bash
cd /Users/magnusgraham/Documents/hackGT/hackGT-prizepix/newscrape
./start_api.sh
```

This script will:
- Create a virtual environment if it doesn't exist
- Install all required dependencies
- Set up the environment configuration
- Start the API server on `http://localhost:5001`

### Option 2: Manual Setup

1. **Navigate to the API directory:**
   ```bash
   cd /Users/magnusgraham/Documents/hackGT/hackGT-prizepix/newscrape
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install flask flask-cors pydantic pydantic-settings httpx typer rich python-dateutil pytz sqlalchemy alembic pyyaml structlog selectolax beautifulsoup4 lxml feedparser requests dateparser pygooglenews
   ```

4. **Set up environment:**
   ```bash
   cp env.example .env
   ```

5. **Start the API server:**
   ```bash
   python api_server.py
   ```

## API Endpoints

The API will be available at `http://localhost:5001` with the following endpoints:

### Health Check
- **GET** `/health` - Check if the API is running

### Headlines
- **GET** `/api/headlines` - Get top 3 headlines for all NBA athletes
- **GET** `/api/headlines?player=PLAYER_NAME` - Get headlines for a specific player

### Search
- **GET** `/api/search/player?player=PLAYER_NAME` - Search for articles about a specific player
- **GET** `/api/search/nba-athletes` - Search all 10 tracked NBA athletes
- **POST** `/api/search/multiple-players` - Search multiple players

## Testing the API

### Using Python Test Script
```bash
# Quick test
python test_api.py --quick

# Full test suite
python test_api.py
```

### Using Node.js Test Script
```bash
# Quick test
node test_frontend_integration.js --quick

# Full test suite
node test_frontend_integration.js
```

### Manual Testing with curl

```bash
# Health check
curl http://localhost:5001/health

# Get headlines for LeBron James
curl "http://localhost:5001/api/headlines?player=LeBron%20James"

# Search for Stephen Curry
curl "http://localhost:5001/api/search/player?player=Stephen%20Curry&max_results=5"

# Get all NBA headlines
curl http://localhost:5001/api/headlines
```

## Frontend Integration

### JavaScript/React Example

```javascript
// Get headlines for a specific player
const getPlayerHeadlines = async (playerName) => {
  try {
    const response = await fetch(`http://localhost:5001/api/headlines?player=${encodeURIComponent(playerName)}`);
    const data = await response.json();
    return data.headlines;
  } catch (error) {
    console.error('Error fetching headlines:', error);
    return [];
  }
};

// Search for player articles
const searchPlayer = async (playerName, maxResults = 10) => {
  try {
    const response = await fetch(`http://localhost:5001/api/search/player?player=${encodeURIComponent(playerName)}&max_results=${maxResults}`);
    const data = await response.json();
    return data.articles;
  } catch (error) {
    console.error('Error searching player:', error);
    return [];
  }
};

// Get all NBA headlines
const getAllNBAHeadlines = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/headlines');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching NBA headlines:', error);
    return { top_headlines: [], athlete_headlines: {} };
  }
};
```

### Response Format

#### Headlines Response
```json
{
  "player": "LeBron James",
  "headlines": [
    {
      "title": "LeBron James Leads Lakers to Victory in Overtime Thriller",
      "url": "https://example.com/lebron-lakers-victory"
    }
  ],
  "count": 1,
  "search_date": "2025-09-28T02:55:04.641592+00:00"
}
```

#### Search Response
```json
{
  "player": "Stephen Curry",
  "total_articles": 1,
  "search_date": "2025-09-28T02:55:07.005983+00:00",
  "date_range": {
    "from": null,
    "to": null
  },
  "articles": [
    {
      "id": "91f526e6becd9efb",
      "title": "Stephen Curry Breaks Three-Point Record in Warriors Win",
      "url": "https://example.com/curry-three-point-record",
      "published_at": "2025-09-28T02:55:07.005846+00:00",
      "summary": "Stephen Curry made 8 three-pointers to break the single-game record...",
      "source": {
        "id": "gn-en-us",
        "name": "Gn En Us",
        "type": "unknown"
      },
      "league": "nba",
      "players": [],
      "teams": [],
      "tags": []
    }
  ]
}
```

## Configuration

The API uses environment variables for configuration. Edit the `.env` file to customize:

```env
# Application Environment
APP_ENV=dev
APP_TZ=America/New_York

# HTTP Client Configuration
HTTP_TIMEOUT_SECONDS=15
HTTP_MAX_RETRIES=3

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_SECOND=1

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

## Troubleshooting

### Common Issues

1. **Port 5001 already in use:**
   ```bash
   # Find and kill the process using port 5001
   lsof -ti:5001 | xargs kill -9
   ```

2. **Dependencies not found:**
   ```bash
   # Reinstall dependencies
   pip install -r requirements.txt
   ```

3. **Import errors:**
   ```bash
   # Make sure virtual environment is activated
   source venv/bin/activate
   ```

4. **CORS issues:**
   - The API includes CORS headers for frontend integration
   - If you still have issues, check that your frontend is making requests to the correct URL

### Logs

The API server logs information to the console. Look for:
- `[INFO]` - General information
- `[WARNING]` - Non-critical issues
- `[ERROR]` - Critical errors

## Development

### Adding New Endpoints

1. Add the endpoint to `api_server.py`
2. Update the test scripts
3. Update this documentation

### Modifying Mock Data

Edit `app/sources/googlenews_mock.py` to change the sample articles returned by the API.

## Production Deployment

For production deployment:

1. Set `APP_ENV=prod` in `.env`
2. Use a production WSGI server like Gunicorn
3. Set up proper logging and monitoring
4. Configure reverse proxy (nginx)
5. Set up SSL certificates

## Support

If you encounter issues:

1. Check the logs for error messages
2. Run the test scripts to verify functionality
3. Ensure all dependencies are installed correctly
4. Verify the API server is running on the correct port

The API is currently using mock data for testing. To use real Google News data, you'll need to resolve the dependency conflicts with `pygooglenews` and `feedparser`.
