import { z } from 'zod';

// ================================
// Database Models
// ================================

export interface Player {
  _id: string;
  fullName: string;
  headshotUrl?: string;
  position?: string;
  currentTeamId?: string;
  active?: boolean;
}

export interface Team {
  _id: string;
  name: string;
  tricode: string;
  city: string;
  logoUrl: string;
}

export interface Game {
  _id: string;
  season: string;
  seasonType: string;
  gameDateUTC: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue: string;
}

export interface PlayerStats {
  _id: string;
  gameId: string;
  playerId: string;
  teamId: string;
  opponentTeamId: string;
  gameDateUTC: Date;
  season: string;
  seasonType: string;
  points: number;
  rebounds: number;
  assists: number;
}

// ================================
// Trade Logging System Models
// ================================

export interface TradeLog {
  _id?: string;                    // Auto-generated ObjectId
  timestamp: Date;                 // When action occurred
  actionType: 'bet_placed' | 'bet_resolved' | 'simulation_started' | 'simulation_ended' | 'balance_updated';
  gameId?: string;                 // Related game
  betId?: string;                  // Related bet
  simulationId?: string;           // Related simulation
  details: {
    description: string;           // Human-readable description
    amount?: number;               // Amount involved
    balanceBefore?: number;        // Balance before action
    balanceAfter?: number;         // Balance after action
    winnings?: number;             // Winnings (for bet_resolved)
    metadata?: Record<string, any>; // Additional context
  };
}

export interface Simulation {
  _id: string;                     // Unique simulation ID
  contractLength: number;          // Number of games in contract
  initialBalance: number;          // Starting balance
  finalBalance: number;            // Ending balance
  totalReturnPct: number;          // Return percentage
  gamesPlayed: number;             // Games actually played
  gamesWon: number;                // Games won
  winRate: number;                 // Win rate percentage
  status: 'running' | 'completed' | 'cancelled';
  startedAt: Date;                 // When simulation started
  completedAt?: Date;              // When simulation ended
  parlayConfig: Parlay[];          // Parlay configuration used
}

export interface Bet {
  _id: string;                     // Unique bet ID
  gameId: string;                  // Reference to games collection
  playerId: string;                // Reference to players collection
  stat: 'points' | 'rebounds' | 'assists';
  betType: 'flex' | 'power';
  threshold: number;               // Expected value/line
  actual?: number;                 // Actual performance (filled after game)
  hit?: boolean;                   // Whether bet won (filled after game)
  betAmount: number;               // Amount wagered
  multiplier: number;              // Multiplier applied
  potentialWinnings: number;       // betAmount * multiplier
  actualWinnings?: number;         // Actual winnings (filled after game)
  status: 'pending' | 'won' | 'lost';
  createdAt: Date;                 // When bet was placed
  resolvedAt?: Date;               // When bet was resolved
  parlayId?: string;               // Reference to parlay if part of one
  simulationId?: string;           // Reference to simulation
}

// Database model for parlays
export interface Parlay {
  _id: string;                     // Unique parlay ID
  gameId: string;                  // Game this parlay is for
  betIds: string[];                // Array of bet IDs in this parlay
  totalBetAmount: number;          // Total amount wagered
  multiplier: number;              // Final multiplier
  potentialWinnings: number;       // Total potential winnings
  actualWinnings?: number;         // Actual winnings
  status: 'pending' | 'won' | 'lost';
  createdAt: Date;
  resolvedAt?: Date;
  simulationId?: string;           // Reference to simulation
}

// API request model for parlays (simplified)
export interface ParlayRequest {
  playerId: string;
  stat: string;
  betType: 'flex' | 'power';
}

// ================================
// API Response Models
// ================================

export interface PlayerResponse {
  id: string;
  fullName: string;
  headshotUrl?: string;
  position?: string;
  teamId?: string;
  active?: boolean;
}

export interface TeamResponse {
  id: string;
  name: string;
  tricode: string;
  city: string;
  logoUrl: string;
}

export interface GameResponse {
  id: string;
  season: string;
  seasonType: string;
  gameDateUTC: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue: string;
}

export interface ParlayOutcome {
  playerId: string;
  stat: string;
  threshold: number;
  actual: number;
  hit: boolean;
  betType: 'flex' | 'power';
}

export interface GameResult {
  game_id: string;
  date: string;
  parlay_size: number;
  outcomes: ParlayOutcome[];
  parlay_hit: boolean;
  multiplier: number;
  balance_before: number;
  balance_after: number;
}

export interface ContractResult {
  contract_length: number;
  parlay_size: number;
  initial_balance: number;
  final_balance: number;
  total_return_pct: number;
  games_played: number;
  games_won: number;
  win_rate: number;
  game_results: GameResult[];
}

export interface SimulationResponse {
  contract_length: number;
  parlay_size: number;
  initial_balance: number;
  final_balance: number;
  total_return_pct: number;
  games_played: number;
  games_won: number;
  win_rate: number;
  game_results: GameResult[];
}

export interface PlayerThresholdResponse {
  playerId: string;
  expected_values: Record<string, number>;
  games_analyzed: number;
}

export interface HealthCheckResponse {
  status: string;
  database: string;
  data: {
    players: number;
    games: number;
  };
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

// ================================
// Request Models
// ================================

export interface Parlay {
  playerId: string;
  stat: string;
  betType: 'flex' | 'power';
}

export interface SimulationRequest {
  contract_length: number;
  parlays: ParlayRequest[];
}

// ================================
// Zod Schemas for Validation
// ================================

export const ParlaySchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  stat: z.enum(['points', 'rebounds', 'assists'], {
    errorMap: () => ({ message: 'Stat must be one of: points, rebounds, assists' })
  }),
  betType: z.enum(['flex', 'power'], {
    errorMap: () => ({ message: 'Bet type must be either flex or power' })
  })
});

export const SimulationRequestSchema = z.object({
  contract_length: z.number()
    .int('Contract length must be an integer')
    .min(1, 'Contract length must be at least 1')
    .max(10, 'Contract length cannot exceed 10'),
  parlays: z.array(ParlaySchema)
    .min(1, 'At least one parlay is required')
    .max(10, 'Maximum 10 parlays allowed')
});

export const PlayerQuerySchema = z.object({
  active_only: z.string().optional().transform(val => val === 'true'),
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '100', 10);
    return Math.min(Math.max(num, 1), 500);
  })
});

export const GameQuerySchema = z.object({
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '20', 10);
    return Math.min(Math.max(num, 1), 100);
  })
});

// ================================
// Service Interfaces
// ================================

export interface BettingSimulatorInterface {
  loadAllThresholds(): Promise<void>;
  getPlayerInfo(playerId: string): Promise<{
    expected_values: Record<string, number>;
    games_analyzed: number;
  } | { error: string }>;
  simulateContract(contractLength: number, parlays: Parlay[]): Promise<ContractResult>;
}

// ================================
// Utility Types
// ================================

export type StatType = 'points' | 'rebounds' | 'assists';
export type BetType = 'flex' | 'power';

export interface PlayerThresholds {
  [playerId: string]: {
    points: number;
    rebounds: number;
    assists: number;
  };
}

export interface GameSimulationData {
  gameId: string;
  date: string;
  playerStats: PlayerStats[];
}

// ================================
// Time Management Types
// ================================

export interface TimeState {
  currentTime: string; // ISO string
  isSimulationMode: boolean;
}

export interface TimeAdvanceRequest {
  duration: number; // milliseconds
  unit?: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days';
}

export interface TimeSetRequest {
  time: string; // ISO string
}

export interface GameTimeFilter {
  pastGames: Game[];
  futureGames: Game[];
}
