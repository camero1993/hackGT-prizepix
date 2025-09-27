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
}

export interface SimulationRequest {
  contract_length: number;
  parlays: Parlay[];
}

// ================================
// Zod Schemas for Validation
// ================================

export const ParlaySchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  stat: z.enum(['points', 'rebounds', 'assists'], {
    errorMap: () => ({ message: 'Stat must be one of: points, rebounds, assists' })
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
