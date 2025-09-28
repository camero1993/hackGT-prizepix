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
  venue?: string;
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
  actionType: 'bet_placed' | 'bet_resolved' | 'parlay_created' | 'simulation_started' | 'simulation_ended' | 'balance_updated' | 'contract_created' | 'contract_updated' | 'contract_cancelled';
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

export interface Contract {
  _id: string;                     // Unique contract ID
  contractLength: 3 | 5;           // Number of games in contract (3 or 5)
  parlayConfig: StructuredParlayRequest; // Structured parlay configuration to repeat
  totalWagered: number;            // Total amount wagered across all games
  totalWinnings: number;           // Total winnings across all games
  gamesPlayed: number;             // Games actually played
  gamesWon: number;                // Games won
  winRate: number;                 // Win rate percentage
  status: 'active' | 'completed' | 'cancelled' | 'exited';
  createdAt: Date;                 // When contract was created
  completedAt?: Date;              // When contract was completed
  exitedAt?: Date;                 // When contract was exited early
  exitReason?: string;             // Reason for early exit
  simulationId?: string;           // Reference to simulation if applicable
  parlayIds: string[];             // Array of parlay IDs created for each game
  remainingGames: number;          // Games remaining in contract
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
  threshold: number;               // Expected value/line
  overUnder: 'over' | 'under';     // Whether user bet over or under the threshold
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

// Database model for parlays - MUST contain exactly 3 bets
export interface Parlay {
  _id: string;                     // Unique parlay ID
  gameId: string;                  // Game this parlay is for
  betIds: [string, string, string]; // Exactly 3 bet IDs (enforced by TypeScript)
  betType: 'flex' | 'power';       // Type of bet for this parlay
  totalBetAmount: number;          // Total amount wagered
  multiplier: number;              // Final multiplier
  potentialWinnings: number;       // Total potential winnings
  actualWinnings?: number;         // Actual winnings
  status: 'pending' | 'won' | 'lost';
  createdAt: Date;
  resolvedAt?: Date;
  contractId?: string;             // Reference to contract (if part of one)
  simulationId?: string;           // Reference to simulation
}

// API request model for parlays - MUST contain exactly 3 legs
export interface ParlayRequest {
  playerId: string;
  stat: 'points' | 'rebounds' | 'assists';
  overUnder: 'over' | 'under';
}

// Structured parlay request with exactly 3 legs
export interface StructuredParlayRequest {
  legs: [ParlayRequest, ParlayRequest, ParlayRequest]; // Exactly 3 legs
  betType: 'flex' | 'power';
  betAmount: number;
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
  venue?: string;
}

export interface ParlayOutcome {
  playerId: string;
  stat: string;
  threshold: number;
  actual: number;
  hit: boolean;
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

// Enhanced response interfaces
export interface PlayerWithTeamResponse extends PlayerResponse {
  teamName?: string;
  teamTricode?: string;
  teamCity?: string;
}

export interface PlayerStatsResponse {
  _id: string;
  gameId: string;
  playerId: string;
  teamId: string;
  opponentTeamId: string;
  gameDateUTC: string;
  season: string;
  seasonType: string;
  points: number;
  rebounds: number;
  assists: number;
}

export interface EnrichedPlayerStatsResponse extends PlayerStatsResponse {
  playerName: string;
  playerPosition?: string;
  teamName: string;
  teamTricode: string;
  opponentTeamName: string;
  opponentTricode: string;
  gameStatus: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
}

export interface TeamGameResponse extends GameResponse {
  isHomeGame: boolean;
}

export interface EnrichedTeamGameResponse extends TeamGameResponse {
  homeTeamName: string;
  homeTricode: string;
  awayTeamName: string;
  awayTricode: string;
}

// ================================
// Request Models
// ================================


export interface SimulationRequest {
  contract_length: number;
  betType: 'flex' | 'power';
  parlays: ParlayRequest[];
  // Optional bet amount per parlay leg group; backend defaults to 100 if absent
  betAmount?: number;
}

// ================================
// Zod Schemas for Validation
// ================================

export const ParlaySchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  stat: z.enum(['points', 'rebounds', 'assists'], {
    errorMap: () => ({ message: 'Stat must be one of: points, rebounds, assists' })
  }),
  overUnder: z.enum(['over', 'under'], {
    errorMap: () => ({ message: 'overUnder must be either over or under' })
  })
});

export const SimulationRequestSchema = z.object({
  contract_length: z.number()
    .int('Contract length must be an integer')
    .min(1, 'Contract length must be at least 1')
    .max(10, 'Contract length cannot exceed 10'),
  betType: z.enum(['flex', 'power'], {
    errorMap: () => ({ message: 'Bet type must be either flex or power' })
  }),
  parlays: z.array(ParlaySchema)
    .min(1, 'At least one parlay is required')
    .max(10, 'Maximum 10 parlays allowed'),
  betAmount: z.number().optional().refine((v) => v === undefined || v > 0, {
    message: 'betAmount must be a positive number'
  })
});

export const PlayerQuerySchema = z.object({
  active_only: z.string().optional().transform(val => val === 'true'),
  search: z.string().optional(),
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

// New query schemas for enhanced endpoints
export const TeamPlayersQuerySchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '50', 10);
    return Math.min(Math.max(num, 1), 100);
  })
});

export const PlayerStatsQuerySchema = z.object({
  season: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '50', 10);
    return Math.min(Math.max(num, 1), 100);
  }),
  enriched: z.string().optional().transform(val => val === 'true')
});

export const TeamGamesQuerySchema = z.object({
  season: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.string().optional().transform(val => {
    const num = parseInt(val || '50', 10);
    return Math.min(Math.max(num, 1), 100);
  }),
  enriched: z.string().optional().transform(val => val === 'true')
});

// ================================
// Service Interfaces
// ================================

export interface BettingSimulatorInterface {
  loadStarPlayers(): Promise<void>;
  loadAllPlayers(): Promise<void>;
  getPlayerInfo(playerId: string): Promise<{
    expected_values: Record<string, number>;
    games_analyzed: number;
  } | { error: string }>;
  simulateContract(contractLength: 3 | 5, parlayConfig: StructuredParlayRequest): Promise<ContractResult>;
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

// ================================
// Redis State Management Interfaces
// ================================

export interface RedisParlayState {
  parlayId: string;
  gameId: string;
  betIds: [string, string, string];
  betType: 'flex' | 'power';
  totalBetAmount: number;
  multiplier: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost';
  contractId?: string;
  createdAt: string;
}

export interface RedisContractState {
  contractId: string;
  contractLength: 3 | 5;
  parlayConfig: StructuredParlayRequest;
  totalWagered: number;
  totalWinnings: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  status: 'active' | 'completed' | 'cancelled' | 'exited';
  remainingGames: number;
  parlayIds: string[];
  createdAt: string;
  completedAt?: string;
  exitedAt?: string;
  exitReason?: string;
}

export interface RedisBetState {
  betId: string;
  gameId: string;
  playerId: string;
  stat: 'points' | 'rebounds' | 'assists';
  threshold: number;
  overUnder: 'over' | 'under';
  betAmount: number;
  multiplier: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost';
  parlayId?: string;
  contractId?: string;
  createdAt: string;
}
