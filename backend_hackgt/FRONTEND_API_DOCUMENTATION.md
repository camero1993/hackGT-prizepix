# Frontend API Documentation

This document describes the API endpoints created specifically for the frontend dashboard to consume data from our Redis + MongoDB backend.

## Base URL
```
http://localhost:8000
```

## API Endpoints

### Demo State Management (Redis)

#### Get Current Demo State
```http
GET /api/demo/state
```

Returns the current demo state from Redis including balance, total bets, winnings, etc.

**Response:**
```json
{
  "balance": 470.00,
  "totalBetsPlaced": 3,
  "totalWinnings": -30,
  "totalWagered": 450,
  "activeSimulationId": "sim_123",
  "lastUpdated": "2025-01-30T15:00:00Z"
}
```

#### Get Recent Trade Logs (Redis)
```http
GET /api/demo/trade-logs?limit=50
```

Returns recent trade logs from Redis for real-time updates.

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 50)

**Response:**
```json
[
  {
    "timestamp": "2025-01-30T15:00:00Z",
    "action": "bet_placed",
    "amount": 100,
    "balanceAfter": 900,
    "description": "Bet placed on Player 201939 for points (flex)"
  }
]
```

#### Get Active Bets (Redis)
```http
GET /api/demo/active-bets
```

Returns currently active bets from Redis.

**Response:**
```json
[
  {
    "_id": "bet_123",
    "gameId": "game_1",
    "playerId": "201939",
    "stat": "points",
    "betType": "flex",
    "betAmount": "100",
    "threshold": "25.5",
    "status": "pending"
  }
]
```

#### Get Balance History (Redis)
```http
GET /api/demo/balance-history?limit=100
```

Returns recent balance history from Redis for charting.

**Query Parameters:**
- `limit` (optional): Number of history points to return (default: 100)

**Response:**
```json
[
  {
    "timestamp": 1738234800000,
    "balance": 1000
  },
  {
    "timestamp": 1738234860000,
    "balance": 900
  }
]
```

#### Get Active Simulation (Redis)
```http
GET /api/demo/active-simulation
```

Returns the currently active simulation from Redis.

**Response:**
```json
{
  "id": "sim_123",
  "contractLength": 5,
  "initialBalance": 1000,
  "parlayConfig": [...],
  "startedAt": "2025-01-30T14:00:00Z",
  "gamesPlayed": 2,
  "gamesWon": 1
}
```

### Historical Data (MongoDB)

#### Get Recent Trades (MongoDB)
```http
GET /api/trades/recent?limit=50
```

Returns recent trade logs from MongoDB for historical analysis.

**Query Parameters:**
- `limit` (optional): Number of trades to return (default: 50)

**Response:**
```json
[
  {
    "_id": "...",
    "timestamp": "2025-01-30T15:00:00Z",
    "actionType": "bet_placed",
    "gameId": "game_1",
    "betId": "bet_123",
    "simulationId": "sim_123",
    "details": {
      "description": "Bet placed on Player 201939 for points (flex)",
      "amount": 100,
      "balanceBefore": 1000,
      "balanceAfter": 900,
      "metadata": {...}
    }
  }
]
```

#### Get Simulation History
```http
GET /api/simulations/history?limit=20
```

Returns historical simulation data from MongoDB.

**Query Parameters:**
- `limit` (optional): Number of simulations to return (default: 20)

**Response:**
```json
[
  {
    "_id": "sim_123",
    "contractLength": 5,
    "initialBalance": 1000,
    "finalBalance": 1200,
    "totalReturnPct": 20.0,
    "gamesPlayed": 5,
    "gamesWon": 3,
    "winRate": 60.0,
    "status": "completed",
    "startedAt": "2025-01-30T14:00:00Z",
    "completedAt": "2025-01-30T16:00:00Z"
  }
]
```

#### Get Game Bets
```http
GET /api/bets/game/:gameId
```

Returns all bets for a specific game from MongoDB.

**Path Parameters:**
- `gameId`: The ID of the game

**Response:**
```json
[
  {
    "_id": "bet_123",
    "gameId": "game_1",
    "playerId": "201939",
    "stat": "points",
    "betType": "flex",
    "threshold": 25.5,
    "actual": 28,
    "hit": true,
    "betAmount": 100,
    "multiplier": 1.5,
    "potentialWinnings": 150,
    "actualWinnings": 150,
    "status": "won",
    "createdAt": "2025-01-30T14:00:00Z",
    "resolvedAt": "2025-01-30T16:00:00Z"
  }
]
```

#### Get Analytics
```http
GET /api/analytics
```

Returns aggregated analytics from MongoDB.

**Response:**
```json
{
  "totalBets": 150,
  "totalWinnings": 2500,
  "totalWagered": 2000,
  "wonBets": 90,
  "lostBets": 60,
  "winRate": 60.0,
  "averageReturn": 25.0
}
```

#### Get Balance History (MongoDB)
```http
GET /api/balance/history?startDate=2025-01-01&endDate=2025-01-31
```

Returns balance history from MongoDB for longer time periods.

**Query Parameters:**
- `startDate` (optional): Start date in ISO format (default: 30 days ago)
- `endDate` (optional): End date in ISO format (default: now)

**Response:**
```json
[
  {
    "_id": "...",
    "timestamp": "2025-01-30T15:00:00Z",
    "actionType": "balance_updated",
    "details": {
      "description": "Balance updated after bet resolution",
      "amount": 150,
      "balanceBefore": 900,
      "balanceAfter": 1050
    }
  }
]
```

#### Get Bet Holdings
```http
GET /api/bets/holdings?limit=50&status=pending
```

Returns recent bet holdings from MongoDB.

**Query Parameters:**
- `limit` (optional): Number of bets to return (default: 50)
- `status` (optional): Filter by status (pending, won, lost)

**Response:**
```json
[
  {
    "_id": "bet_123",
    "gameId": "game_1",
    "playerId": "201939",
    "stat": "points",
    "betType": "flex",
    "threshold": 25.5,
    "actual": 28,
    "hit": true,
    "betAmount": 100,
    "multiplier": 1.5,
    "potentialWinnings": 150,
    "actualWinnings": 150,
    "status": "won",
    "createdAt": "2025-01-30T14:00:00Z",
    "resolvedAt": "2025-01-30T16:00:00Z"
  }
]
```

### Demo Management

#### Initialize Demo State
```http
POST /api/demo/initialize
```

Initializes the demo state in Redis.

**Request Body:**
```json
{
  "initialBalance": 1000
}
```

**Response:**
```json
{
  "message": "Demo state initialized",
  "initialBalance": 1000
}
```

#### Clear Demo Data
```http
POST /api/demo/clear
```

Clears all demo data from Redis.

**Response:**
```json
{
  "message": "Demo data cleared"
}
```

## Data Flow

### Real-time Data (Redis)
- **Demo State**: Current balance, totals, active simulation
- **Trade Logs**: Recent activity for live updates
- **Active Bets**: Currently pending bets
- **Balance History**: Recent balance changes for charts

### Historical Data (MongoDB)
- **Trade Logs**: Complete historical trade activity
- **Simulations**: Past simulation results
- **Bets**: All bet records with outcomes
- **Analytics**: Aggregated statistics

## Frontend Integration

The frontend components are already updated to consume these APIs:

1. **PortfolioBalanceChart**: Uses `/api/demo/balance-history` for real-time data
2. **BetPortfolio**: Uses `/api/bets/holdings` for bet display
3. **Main Page**: Uses `/api/demo/state` for portfolio totals
4. **BetHoldingsChart**: Uses `/api/bets/holdings` for chart data

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (no data available)
- `500`: Internal Server Error

Error responses include a descriptive error message:
```json
{
  "error": "Demo state not initialized"
}
```

## Testing

Use the provided test script to verify all endpoints:
```bash
node test-api-endpoints.js
```

This will test all API endpoints and display the responses.
