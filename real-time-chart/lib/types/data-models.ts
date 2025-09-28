/**
 * Data models based on FRONTEND_API_DOCUMENTATION.md
 * These types match the exact response formats from the backend APIs
 */

// ========================================
// PLAYER DATA
// ========================================

/**
 * Player Information
 * GET /players and GET /player/:playerId
 * 
 * Response format from API:
 * {
 *   "id": "201939",
 *   "fullName": "Stephen Curry",
 *   "headshotUrl": "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png",
 *   "position": "PG",
 *   "teamId": "1610612744",
 *   "active": true
 * }
 */
export interface Player {
  id: string
  fullName: string
  headshotUrl: string
  position: string
  teamId: string
  active: boolean
}

// ========================================
// DEMO STATE MANAGEMENT (Redis) - Real-time Data
// ========================================

/**
 * Demo State Response
 * GET /api/demo/state
 * 
 * Response format from API docs:
 * {
 *   "balance": 470.00,
 *   "totalBetsPlaced": 3,
 *   "totalWinnings": -30,
 *   "totalWagered": 450,
 *   "activeSimulationId": "sim_123",
 *   "lastUpdated": "2025-01-30T15:00:00Z"
 * }
 */
export interface DemoState {
  balance: number
  totalBetsPlaced: number
  totalWinnings: number
  totalWagered: number
  activeSimulationId?: string
  lastUpdated: string
}

/**
 * Trade Log Entry (Redis)
 * GET /api/demo/trade-logs
 * 
 * Response format from API docs:
 * [
 *   {
 *     "timestamp": "2025-01-30T15:00:00Z",
 *     "action": "bet_placed",
 *     "amount": 100,
 *     "balanceAfter": 900,
 *     "description": "Bet placed on Player 201939 for points (flex)"
 *   }
 * ]
 */
export interface TradeLogEntry {
  timestamp: string
  action: string
  amount: number
  balanceAfter: number
  description: string
  winnings?: number
}

/**
 * Active Bet (Redis)
 * GET /api/demo/active-bets
 * 
 * Response format from API docs:
 * [
 *   {
 *     "_id": "bet_123",
 *     "gameId": "game_1",
 *     "playerId": "201939",
 *     "stat": "points",
 *     "betType": "flex",
 *     "betAmount": "100",
 *     "threshold": "25.5",
 *     "status": "pending"
 *   }
 * ]
 */
export interface ActiveBet {
  _id: string
  gameId: string
  playerId: string
  stat: 'points' | 'rebounds' | 'assists'
  betType: 'flex' | 'power'
  betAmount: string
  threshold: string
  status: 'pending'
}

/**
 * Balance History Entry (Redis)
 * GET /api/demo/balance-history
 * 
 * Response format from API docs:
 * [
 *   {
 *     "timestamp": 1738234800000,
 *     "balance": 1000
 *   }
 * ]
 */
export interface BalanceHistoryEntry {
  timestamp: number
  balance: number
}

/**
 * Active Simulation (Redis)
 * GET /api/demo/active-simulation
 * 
 * Actual response format (based on test results):
 * {
 *   "id": "sim_1759012726863",
 *   "contractLength": "1",
 *   "initialBalance": "1000",
 *   "parlayConfig": "[object Object]",
 *   "startedAt": "2025-09-27T22:38:47.243Z"
 * }
 */
export interface ActiveSimulation {
  id: string
  contractLength: string
  initialBalance: string
  parlayConfig: string
  startedAt: string
  gamesPlayed?: number
  gamesWon?: number
}

// ========================================
// HISTORICAL DATA (MongoDB) - Persistent Data
// ========================================

/**
 * MongoDB Trade Log
 * GET /api/trades/recent
 * 
 * Actual response format (based on test results):
 * [
 *   {
 *     "_id": "68d86f5d0c9de78cf25a50a9",
 *     "timestamp": "2025-09-27T23:12:29.338Z",
 *     "actionType": "simulation_ended",
 *     "simulationId": "sim_1759014748975",
 *     "details": {
 *       "description": "Simulation cancelled due to error",
 *       "amount": 0,
 *       "balanceBefore": 1000,
 *       "balanceAfter": 1000
 *     },
 *     "createdAt": "2025-09-27T23:12:29.339Z",
 *     "updatedAt": "2025-09-27T23:12:29.339Z",
 *     "__v": 0
 *   }
 * ]
 */
export interface MongoTradeLog {
  _id: string
  timestamp: string
  actionType: 'bet_placed' | 'bet_resolved' | 'simulation_started' | 'simulation_ended' | 'balance_updated'
  gameId?: string
  betId?: string
  simulationId?: string
  details: {
    description: string
    amount: number
    balanceBefore: number
    balanceAfter: number
    metadata?: any
  }
  createdAt: string
  updatedAt: string
  __v: number
}

/**
 * Simulation History
 * GET /api/simulations/history
 * 
 * Actual response format (based on test results):
 * [
 *   {
 *     "_id": "sim_1759014748975",
 *     "contractLength": 1,
 *     "initialBalance": 1000,
 *     "finalBalance": 1000,
 *     "totalReturnPct": 0,
 *     "gamesPlayed": 0,
 *     "gamesWon": 0,
 *     "winRate": 0,
 *     "status": "running",
 *     "startedAt": "2025-09-27T23:12:28.975Z",
 *     "parlayConfig": [...],
 *     "__v": 0
 *   }
 * ]
 */
export interface Simulation {
  _id: string
  contractLength: number
  initialBalance: number
  finalBalance: number
  totalReturnPct: number
  gamesPlayed: number
  gamesWon: number
  winRate: number
  status: 'completed' | 'running' | 'cancelled'
  startedAt: string
  completedAt?: string
  parlayConfig?: any[]
  __v: number
}

/**
 * Bet Holding (MongoDB)
 * GET /api/bets/game/:gameId and GET /api/bets/holdings
 * 
 * Response format from API docs:
 * [
 *   {
 *     "_id": "bet_123",
 *     "gameId": "game_1",
 *     "playerId": "201939",
 *     "stat": "points",
 *     "betType": "flex",
 *     "threshold": 25.5,
 *     "actual": 28,
 *     "hit": true,
 *     "betAmount": 100,
 *     "multiplier": 1.5,
 *     "potentialWinnings": 150,
 *     "actualWinnings": 150,
 *     "status": "won",
 *     "createdAt": "2025-01-30T14:00:00Z",
 *     "resolvedAt": "2025-01-30T16:00:00Z"
 *   }
 * ]
 */
export interface BetHolding {
  _id: string
  gameId: string
  playerId: string
  stat: 'points' | 'rebounds' | 'assists'
  betType: 'flex' | 'power'
  threshold: number
  actual?: number
  hit?: boolean
  betAmount: number
  multiplier: number
  potentialWinnings: number
  actualWinnings?: number
  status: 'pending' | 'won' | 'lost'
  createdAt: string
  resolvedAt?: string
  parlayId?: string
  simulationId?: string
  // Enriched player data (added by enhanced backend endpoint)
  playerName?: string
  playerHeadshot?: string
  playerPosition?: string
  playerTeamId?: string
}

/**
 * Analytics
 * GET /api/analytics
 * 
 * Actual response format (based on test results):
 * {
 *   "totalBets": 10,
 *   "totalWinnings": 1005,
 *   "winRate": 70,
 *   "averageReturn": 9.002169197396963
 * }
 */
export interface Analytics {
  totalBets: number
  totalWinnings: number
  winRate: number
  averageReturn: number
  totalWagered?: number
  wonBets?: number
  lostBets?: number
}

/**
 * MongoDB Balance History
 * GET /api/balance/history
 * 
 * Response format from API docs:
 * [
 *   {
 *     "_id": "...",
 *     "timestamp": "2025-01-30T15:00:00Z",
 *     "actionType": "balance_updated",
 *     "details": {
 *       "description": "Balance updated after bet resolution",
 *       "amount": 150,
 *       "balanceBefore": 900,
 *       "balanceAfter": 1050
 *     }
 *   }
 * ]
 */
export interface MongoBalanceHistory {
  _id: string
  timestamp: string
  actionType: 'balance_updated'
  details: {
    description: string
    amount: number
    balanceBefore: number
    balanceAfter: number
  }
}

// ========================================
// MANAGEMENT API RESPONSES
// ========================================

/**
 * Initialize Demo Response
 * POST /api/demo/initialize
 * 
 * Response format from API docs:
 * {
 *   "message": "Demo state initialized",
 *   "initialBalance": 1000
 * }
 */
export interface InitializeDemoResponse {
  message: string
  initialBalance: number
}

/**
 * Clear Demo Response
 * POST /api/demo/clear
 * 
 * Response format from API docs:
 * {
 *   "message": "Demo data cleared"
 * }
 */
export interface ClearDemoResponse {
  message: string
}

/**
 * Health Check Response
 * GET /health
 * 
 * Response format from API docs:
 * {
 *   "status": "healthy",
 *   "database": "connected"
 * }
 */
export interface HealthCheckResponse {
  status: string
  database: string
}
