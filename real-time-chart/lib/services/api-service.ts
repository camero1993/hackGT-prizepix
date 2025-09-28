/**
 * Main API service class
 * Implements all endpoints from FRONTEND_API_DOCUMENTATION.md
 */

import { BaseApiService } from './base-api-service'
import {
  DemoState,
  TradeLogEntry,
  ActiveBet,
  BalanceHistoryEntry,
  ActiveSimulation,
  MongoTradeLog,
  Simulation,
  BetHolding,
  Analytics,
  MongoBalanceHistory,
  InitializeDemoResponse,
  ClearDemoResponse,
  HealthCheckResponse,
  QueryParams,
  Player
} from '../types'

export class ApiService extends BaseApiService {
  // ========================================
  // DEMO STATE MANAGEMENT (Redis) - Real-time Data
  // ========================================

  /**
   * Get Current Demo State
   * GET /api/demo/state
   * 
   * Returns the current demo state from Redis including balance, total bets, winnings, etc.
   * 
   * Response format:
   * {
   *   "balance": 470.00,
   *   "totalBetsPlaced": 3,
   *   "totalWinnings": -30,
   *   "totalWagered": 450,
   *   "activeSimulationId": "sim_123",
   *   "lastUpdated": "2025-01-30T15:00:00Z"
   * }
   */
  async getDemoState(): Promise<DemoState> {
    return this.request<DemoState>('/api/demo/state')
  }

  /**
   * Get Recent Trade Logs (Redis)
   * GET /api/demo/trade-logs?limit=50
   * 
   * Returns recent trade logs from Redis for real-time updates.
   * 
   * Query Parameters:
   * - limit (optional): Number of logs to return (default: 50)
   * 
   * Response format:
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
  async getTradeLogs(limit?: number): Promise<TradeLogEntry[]> {
    const params = limit ? `?limit=${limit}` : ''
    return this.request<TradeLogEntry[]>(`/api/demo/trade-logs${params}`)
  }

  /**
   * Get Active Bets (Redis)
   * GET /api/demo/active-bets
   * 
   * Returns currently active bets from Redis.
   * 
   * Response format:
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
  async getActiveBets(): Promise<ActiveBet[]> {
    return this.request<ActiveBet[]>('/api/demo/active-bets')
  }

  /**
   * Get Balance History (Redis)
   * GET /api/demo/balance-history?limit=100
   * 
   * Returns recent balance history from Redis for charting.
   * 
   * Query Parameters:
   * - limit (optional): Number of history points to return (default: 100)
   * 
   * Response format:
   * [
   *   {
   *     "timestamp": 1738234800000,
   *     "balance": 1000
   *   }
   * ]
   */
  async getBalanceHistory(limit?: number): Promise<BalanceHistoryEntry[]> {
    const params = limit ? `?limit=${limit}` : ''
    return this.request<BalanceHistoryEntry[]>(`/api/demo/balance-history${params}`)
  }

  /**
   * Get Active Simulation (Redis)
   * GET /api/demo/active-simulation
   * 
   * Returns the currently active simulation from Redis.
   * 
   * Response format:
   * {
   *   "id": "sim_123",
   *   "contractLength": 5,
   *   "initialBalance": 1000,
   *   "parlayConfig": [...],
   *   "startedAt": "2025-01-30T14:00:00Z",
   *   "gamesPlayed": 2,
   *   "gamesWon": 1
   * }
   */
  async getActiveSimulation(): Promise<ActiveSimulation | null> {
    return this.request<ActiveSimulation | null>('/api/demo/active-simulation')
  }

  // ========================================
  // HISTORICAL DATA (MongoDB) - Persistent Data
  // ========================================

  /**
   * Get Recent Trades (MongoDB)
   * GET /api/trades/recent?limit=50
   * 
   * Returns recent trade logs from MongoDB for historical analysis.
   * 
   * Query Parameters:
   * - limit (optional): Number of trades to return (default: 50)
   * 
   * Response format:
   * [
   *   {
   *     "_id": "...",
   *     "timestamp": "2025-01-30T15:00:00Z",
   *     "actionType": "bet_placed",
   *     "gameId": "game_1",
   *     "betId": "bet_123",
   *     "simulationId": "sim_123",
   *     "details": {
   *       "description": "Bet placed on Player 201939 for points (flex)",
   *       "amount": 100,
   *       "balanceBefore": 1000,
   *       "balanceAfter": 900,
   *       "metadata": {...}
   *     }
   *   }
   * ]
   */
  async getRecentTrades(limit?: number): Promise<MongoTradeLog[]> {
    const params = limit ? `?limit=${limit}` : ''
    return this.request<MongoTradeLog[]>(`/api/trades/recent${params}`)
  }

  /**
   * Get Simulation History
   * GET /api/simulations/history?limit=20
   * 
   * Returns historical simulation data from MongoDB.
   * 
   * Query Parameters:
   * - limit (optional): Number of simulations to return (default: 20)
   * 
   * Response format:
   * [
   *   {
   *     "_id": "sim_123",
   *     "contractLength": 5,
   *     "initialBalance": 1000,
   *     "finalBalance": 1200,
   *     "totalReturnPct": 20.0,
   *     "gamesPlayed": 5,
   *     "gamesWon": 3,
   *     "winRate": 60.0,
   *     "status": "completed",
   *     "startedAt": "2025-01-30T14:00:00Z",
   *     "completedAt": "2025-01-30T16:00:00Z"
   *   }
   * ]
   */
  async getSimulationHistory(limit?: number): Promise<Simulation[]> {
    const params = limit ? `?limit=${limit}` : ''
    return this.request<Simulation[]>(`/api/simulations/history${params}`)
  }

  /**
   * Get Game Bets
   * GET /api/bets/game/:gameId
   * 
   * Returns all bets for a specific game from MongoDB.
   * 
   * Path Parameters:
   * - gameId: The ID of the game
   * 
   * Response format:
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
  async getGameBets(gameId: string): Promise<BetHolding[]> {
    return this.request<BetHolding[]>(`/api/bets/game/${gameId}`)
  }

  /**
   * Get Analytics
   * GET /api/analytics
   * 
   * Returns aggregated analytics from MongoDB.
   * 
   * Response format:
   * {
   *   "totalBets": 150,
   *   "totalWinnings": 2500,
   *   "totalWagered": 2000,
   *   "wonBets": 90,
   *   "lostBets": 60,
   *   "winRate": 60.0,
   *   "averageReturn": 25.0
   * }
   */
  async getAnalytics(): Promise<Analytics> {
    return this.request<Analytics>('/api/analytics')
  }

  /**
   * Get Balance History (MongoDB)
   * GET /api/balance/history?startDate=2025-01-01&endDate=2025-01-31
   * 
   * Returns balance history from MongoDB for longer time periods.
   * 
   * Query Parameters:
   * - startDate (optional): Start date in ISO format (default: 30 days ago)
   * - endDate (optional): End date in ISO format (default: now)
   * 
   * Response format:
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
  async getBalanceHistoryMongo(params?: { startDate?: string; endDate?: string }): Promise<MongoBalanceHistory[]> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    
    const queryString = queryParams.toString()
    const endpoint = `/api/balance/history${queryString ? `?${queryString}` : ''}`
    return this.request<MongoBalanceHistory[]>(endpoint)
  }

  /**
   * Get Bet Holdings
   * GET /api/bets/holdings?limit=50&status=pending
   * 
   * Returns recent bet holdings from MongoDB.
   * 
   * Query Parameters:
   * - limit (optional): Number of bets to return (default: 50)
   * - status (optional): Filter by status (pending, won, lost)
   * 
   * Response format:
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
  async getBetHoldings(params?: { limit?: number; status?: string }): Promise<BetHolding[]> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    
    const queryString = queryParams.toString()
    const endpoint = `/api/bets/holdings${queryString ? `?${queryString}` : ''}`
    return this.request<BetHolding[]>(endpoint)
  }

  // ========================================
  // MANAGEMENT APIs
  // ========================================

  /**
   * Initialize Demo State
   * POST /api/demo/initialize
   * 
   * Initializes the demo state in Redis.
   * 
   * Request Body:
   * {
   *   "initialBalance": 1000
   * }
   * 
   * Response format:
   * {
   *   "message": "Demo state initialized",
   *   "initialBalance": 1000
   * }
   */
  async initializeDemo(initialBalance: number): Promise<InitializeDemoResponse> {
    return this.request<InitializeDemoResponse>('/api/demo/initialize', {
      method: 'POST',
      body: { initialBalance }
    })
  }

  /**
   * Clear Demo Data
   * POST /api/demo/clear
   * 
   * Clears all demo data from Redis.
   * 
   * Response format:
   * {
   *   "message": "Demo data cleared"
   * }
   */
  async clearDemoData(): Promise<ClearDemoResponse> {
    return this.request<ClearDemoResponse>('/api/demo/clear', {
      method: 'POST'
    })
  }

  // ========================================
  // PLAYER DATA
  // ========================================

  /**
   * Get Players
   * GET /players
   * 
   * Returns a list of NBA players with their information.
   * 
   * Query Parameters:
   * - limit (optional): Number of players to return (default: 50)
   * - active_only (optional): Filter for active players only (default: false)
   * 
   * Response format:
   * [
   *   {
   *     "id": "201939",
   *     "fullName": "Stephen Curry",
   *     "headshotUrl": "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png",
   *     "position": "PG",
   *     "teamId": "1610612744",
   *     "active": true
   *   }
   * ]
   */
  async getPlayers(params?: { limit?: number; active_only?: boolean }): Promise<Player[]> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.active_only) queryParams.append('active_only', params.active_only.toString())
    
    const queryString = queryParams.toString()
    const endpoint = `/players${queryString ? `?${queryString}` : ''}`
    return this.request<Player[]>(endpoint)
  }

  /**
   * Get Player by ID
   * GET /player/:playerId
   * 
   * Returns a specific player's information.
   * 
   * Path Parameters:
   * - playerId: The ID of the player
   * 
   * Response format:
   * {
   *   "id": "201939",
   *   "fullName": "Stephen Curry",
   *   "headshotUrl": "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png",
   *   "position": "PG",
   *   "teamId": "1610612744",
   *   "active": true
   * }
   */
  async getPlayerById(playerId: string): Promise<Player> {
    return this.request<Player>(`/player/${playerId}`)
  }

  /**
   * Check API Health
   * GET /health
   * 
   * Returns the health status of the API and database.
   * 
   * Response format:
   * {
   *   "status": "healthy",
   *   "database": "connected"
   * }
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health')
  }
}
