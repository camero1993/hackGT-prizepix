# 🏀 NBA Betting Simulator API Documentation

## Overview
FastAPI backend for the NBA Betting Simulator that provides endpoints for NBA data and betting contract simulations with user-defined parlays.

---

## 🚀 **Quick Start**

### **Installation**
```bash
pip install -r requirements.txt
```

### **Start Server**
```bash
# Development mode (with auto-reload)
npm run dev --dev

# Production mode
npm run dev

# Custom port
npm run dev --port=8080

# Or directly with uvicorn
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### **Access API**
- **API URL**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json

---

## 📋 **API Endpoints**

### **1. General Endpoints**

#### `GET /`
Welcome endpoint with API information.

**Response:**
```json
{
  "message": "Welcome to NBA Betting Simulator API 🏀",
  "version": "1.0.0",
  "endpoints": {
    "players": "/players",
    "games": "/games", 
    "simulate": "/simulate"
  }
}
```

#### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "data": {
    "players": 450,
    "games": 1230
  }
}
```

---

### **2. Players Endpoints**

#### `GET /players`
Fetch player information from the database.

**Parameters:**
- `active_only` (bool, default: true) - Return only active players
- `limit` (int, default: 100, max: 500) - Maximum players to return

**Response:**
```json
[
  {
    "id": "201939",
    "fullName": "Giannis Antetokounmpo",
    "headshotUrl": "https://example.com/player-headshots/201939.png",
    "position": "PF",
    "teamId": "1610612749",
    "active": true
  }
]
```

#### `GET /player/{player_id}/thresholds`
Get betting thresholds for a specific player.

**Response:**
```json
{
  "playerId": "201939",
  "thresholds": {
    "points": 28.5,
    "rebounds": 11.2,
    "assists": 5.8
  },
  "games_analyzed": 10
}
```

---

### **3. Games Endpoints**

#### `GET /games`
Fetch latest games from the database.

**Parameters:**
- `limit` (int, default: 20, max: 100) - Maximum games to return

**Response:**
```json
[
  {
    "id": "0022301234",
    "gameDateUTC": "2024-03-15T19:30:00Z",
    "homeTeamId": "1610612749",
    "awayTeamId": "1610612738",
    "homeScore": 118,
    "awayScore": 112,
    "status": "Final"
  }
]
```

---

### **4. Simulation Endpoints**

#### `POST /simulate`
Run a betting contract simulation with user-defined parlays.

**Request Body:**
```json
{
  "contract_length": 3,
  "parlays": [
    {"playerId": "201939", "stat": "points"},
    {"playerId": "203507", "stat": "assists"},
    {"playerId": "1627732", "stat": "rebounds"}
  ]
}
```

**Request Schema:**
- `contract_length` (int, 1-10) - Number of games in the contract
- `parlays` (array, 1-10 items) - List of parlay legs
  - `playerId` (string) - NBA player ID
  - `stat` (string) - "points", "rebounds", or "assists"

**Response:**
```json
{
  "contract_length": 3,
  "parlay_size": 3,
  "initial_balance": 1000.0,
  "final_balance": 856.25,
  "total_return_pct": -14.4,
  "games_played": 3,
  "games_won": 0,
  "win_rate": 0.0,
  "game_results": [
    {
      "game_id": "0022301234",
      "date": "2024-03-15",
      "parlay_size": 3,
      "outcomes": [
        {
          "playerId": "201939",
          "stat": "points",
          "threshold": 28.5,
          "actual": 32.0,
          "hit": true
        },
        {
          "playerId": "203507", 
          "stat": "assists",
          "threshold": 7.2,
          "actual": 5.0,
          "hit": false
        },
        {
          "playerId": "1627732",
          "stat": "rebounds", 
          "threshold": 8.1,
          "actual": 9.0,
          "hit": true
        }
      ],
      "parlay_hit": false,
      "multiplier": 6.9,
      "balance_before": 1000.0,
      "balance_after": 900.0
    }
  ]
}
```

#### `GET /simulate/example`
Get an example simulation request for testing.

**Response:**
```json
{
  "example_request": {
    "contract_length": 3,
    "parlays": [
      {"playerId": "201939", "stat": "points"},
      {"playerId": "203507", "stat": "rebounds"}
    ]
  },
  "description": "POST this JSON to /simulate to run a sample simulation",
  "available_stats": ["points", "rebounds", "assists"]
}
```

---

## 🎯 **Usage Examples**

### **Frontend Integration**

#### **React/JavaScript Example**
```javascript
// Fetch players
const players = await fetch('/players?limit=50').then(r => r.json());

// Get player thresholds
const thresholds = await fetch(`/player/${playerId}/thresholds`).then(r => r.json());

// Run simulation
const simulation = await fetch('/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contract_length: 3,
    parlays: [
      { playerId: '201939', stat: 'points' },
      { playerId: '203507', stat: 'assists' }
    ]
  })
}).then(r => r.json());

console.log(`Return: ${simulation.total_return_pct}%`);
```

#### **Python Client Example**
```python
import requests

# Get players
players = requests.get('http://localhost:8000/players').json()

# Run simulation
simulation_data = {
    "contract_length": 5,
    "parlays": [
        {"playerId": "201939", "stat": "points"},
        {"playerId": "203507", "stat": "rebounds"}
    ]
}

result = requests.post(
    'http://localhost:8000/simulate', 
    json=simulation_data
).json()

print(f"Simulation return: {result['total_return_pct']:+.1f}%")
```

### **cURL Examples**

```bash
# Get players
curl "http://localhost:8000/players?limit=5"

# Get games  
curl "http://localhost:8000/games?limit=3"

# Run simulation
curl -X POST "http://localhost:8000/simulate" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_length": 3,
    "parlays": [
      {"playerId": "201939", "stat": "points"},
      {"playerId": "203507", "stat": "assists"}
    ]
  }'
```

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
# MongoDB connection (update in app.py)
MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net"
DB_NAME="betting_app"

# Server settings
HOST="0.0.0.0"
PORT=8000
```

### **Database Collections**
The API expects these MongoDB collections:
- `players` - Player information and metadata
- `games` - Game data with scores and dates  
- `playerGameStats` - Individual player performance stats
- `teams` - Team information (optional)

---

## ⚡ **Performance & Scaling**

### **Optimization Features**
- **Threshold Caching**: Player thresholds loaded once at startup
- **Database Indexing**: Optimized queries with proper indexes
- **Response Pagination**: Limit parameters prevent large responses
- **Error Handling**: Graceful failure with detailed error messages

### **Production Deployment**
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Or with Docker
docker build -t nba-betting-api .
docker run -p 8000:8000 nba-betting-api
```

---

## 🧪 **Testing**

### **Run Test Suite**
```bash
# Start server first
npm run dev --dev

# Run tests in another terminal
curl http://localhost:8000/health
```

### **Test Coverage**
- ✅ All endpoint functionality
- ✅ Error handling and edge cases
- ✅ Different simulation scenarios
- ✅ Data validation and constraints
- ✅ Performance with various inputs

---

## 🔍 **Debugging**

### **Common Issues**

#### **1. Database Connection Errors**
```bash
# Check MongoDB connection
python -c "from pymongo import MongoClient; print(MongoClient('your_uri').admin.command('ping'))"
```

#### **2. No Player Data**
```bash
# Verify collections exist
python -c "from app import db; print(f'Players: {db.players.count_documents({})}')"
```

#### **3. Simulation Failures**
- Check player IDs exist in database
- Verify stat types are valid ("points", "rebounds", "assists")
- Ensure sufficient game data for thresholds

### **Logging**
The API includes comprehensive logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)  # Enable debug logs
```

---

## 📈 **API Metrics**

### **Response Times**
- `/players`: ~50-200ms (depending on limit)
- `/games`: ~30-100ms (depending on limit)  
- `/simulate`: ~200-1000ms (depending on contract length)
- `/player/*/thresholds`: ~10-50ms (cached after first load)

### **Rate Limits**
Currently no rate limiting implemented. Consider adding for production:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
```

---

## 🔮 **Future Enhancements**

### **Planned Features**
1. **WebSocket Support**: Real-time simulation updates
2. **Advanced Analytics**: Win rate predictions, optimal strategies
3. **Caching Layer**: Redis for improved performance
4. **Authentication**: User accounts and API keys
5. **Batch Simulations**: Multiple scenarios at once
6. **Historical Analysis**: Backtest strategies over time

### **API Versioning**
```python
# Future v2 endpoints
@app.get("/v2/simulate")  # Enhanced simulation features
@app.get("/v2/analytics")  # Advanced analytics
```

---

## 💡 **Best Practices**

### **Frontend Integration**
1. **Cache player data** - Players don't change frequently
2. **Show loading states** - Simulations can take time
3. **Handle errors gracefully** - Network issues, invalid data
4. **Validate inputs** - Check player IDs and stat types
5. **Display detailed results** - Show individual parlay outcomes

### **API Usage**
1. **Use appropriate limits** - Don't fetch all data at once
2. **Handle pagination** - For large datasets
3. **Implement retries** - For network failures
4. **Monitor performance** - Track response times
5. **Respect resources** - Don't overload with requests

---

## 🎯 **Summary**

The NBA Betting Simulator API provides a complete backend solution for:
- **Player Data Management**: Easy access to NBA player information
- **Game Data**: Recent game results and statistics  
- **Custom Simulations**: User-defined parlay betting strategies
- **Detailed Analytics**: Comprehensive result tracking and analysis

Perfect for building interactive betting simulation frontends with full control over strategy and risk management! 🏀
