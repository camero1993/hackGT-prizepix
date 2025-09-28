// Utility functions for creating parlays with 5-game averages
import { Parlay, Bet, ParlayRequest, SimulationRequest } from '../../backend_hackgt/src/types';

// Interface for player with 5-game averages
export interface PlayerWithAverage {
  id: string;
  fullName: string;
  position: string;
  fiveGameAverages: {
    points: number;
    rebounds: number;
    assists: number;
  };
}

// Interface for bet entry from UI
export interface BetEntry {
  id: string;
  playerId: string;
  player: PlayerWithAverage | null;
  stat: 'points' | 'rebounds' | 'assists';
  overUnder: 'over' | 'under';
  betAmount: number;
  threshold: number; // 5-game average
}

// Create a bet with 5-game average as threshold
export const createBetWithFiveGameAverage = (
  player: PlayerWithAverage,
  stat: 'points' | 'rebounds' | 'assists',
  overUnder: 'over' | 'under',
  betAmount: number,
  gameId: string,
  simulationId?: string
): Bet => {
  const threshold = player.fiveGameAverages[stat];
  
  return {
    _id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameId: gameId,
    playerId: player.id,
    stat: stat,
    threshold: threshold, // 5-game average as threshold
    overUnder: overUnder, // User's over/under choice
    betAmount: betAmount,
    multiplier: 1.0, // Could be calculated based on over/under and stat
    potentialWinnings: betAmount * 1.0,
    status: 'pending',
    createdAt: new Date(),
    simulationId: simulationId
  };
};

// Create a parlay from multiple bet entries
export const createParlayFromBetEntries = (
  betEntries: BetEntry[],
  gameId: string,
  betType: 'flex' | 'power' = 'flex',
  simulationId?: string
): Parlay => {
  // Filter out invalid entries
  const validEntries = betEntries.filter(entry => 
    entry.player && entry.betAmount > 0
  );
  
  if (validEntries.length === 0) {
    throw new Error('No valid bet entries provided');
  }
  
  // Create individual bets
  const bets: Bet[] = validEntries.map(entry => {
    if (!entry.player) {
      throw new Error('Player is required for bet entry');
    }
    
    return createBetWithFiveGameAverage(
      entry.player,
      entry.stat,
      entry.overUnder,
      entry.betAmount,
      gameId,
      simulationId
    );
  });
  
  const betIds = bets.map(bet => bet._id);
  const totalBetAmount = bets.reduce((sum, bet) => sum + bet.betAmount, 0);
  
  // Calculate multiplier based on number of bets and bet type
  const baseMultiplier = betType === 'power' ? 2.0 : 1.5;
  const multiplier = baseMultiplier * Math.pow(1.2, bets.length - 1); // Exponential increase
  
  return {
    _id: `parlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameId: gameId,
    betIds: betIds,
    betType: betType,
    totalBetAmount: totalBetAmount,
    multiplier: multiplier,
    potentialWinnings: totalBetAmount * multiplier,
    status: 'pending',
    createdAt: new Date(),
    simulationId: simulationId
  };
};

// Calculate 5-game average for a player and stat
export const calculateFiveGameAverage = async (
  playerId: string, 
  stat: 'points' | 'rebounds' | 'assists'
): Promise<number> => {
  try {
    const res = await fetch(`http://localhost:8000/playerGameStats?playerId=${playerId}`);
    const data = await res.json();
    
    const lastFiveGames = data
      .filter((g: any) => g.gameDateUTC)
      .sort((a: any, b: any) => new Date(b.gameDateUTC).getTime() - new Date(a.gameDateUTC).getTime())
      .slice(0, 5);
    
    const total = lastFiveGames.reduce((sum: number, game: any) => {
      return sum + game[stat];
    }, 0);
    
    return lastFiveGames.length > 0 ? total / lastFiveGames.length : 0;
  } catch (error) {
    console.error('Error calculating 5-game average:', error);
    return 0;
  }
};

// Calculate 5-game averages for all stats for a player
export const calculateAllFiveGameAverages = async (
  playerId: string
): Promise<{ points: number; rebounds: number; assists: number }> => {
  try {
    const res = await fetch(`http://localhost:8000/playerGameStats?playerId=${playerId}`);
    const data = await res.json();
    
    const lastFiveGames = data
      .filter((g: any) => g.gameDateUTC)
      .sort((a: any, b: any) => new Date(b.gameDateUTC).getTime() - new Date(a.gameDateUTC).getTime())
      .slice(0, 5);
    
    if (lastFiveGames.length === 0) {
      return { points: 0, rebounds: 0, assists: 0 };
    }
    
    const totals = lastFiveGames.reduce((sum: any, game: any) => {
      return {
        points: sum.points + game.points,
        rebounds: sum.rebounds + game.rebounds,
        assists: sum.assists + game.assists
      };
    }, { points: 0, rebounds: 0, assists: 0 });
    
    return {
      points: totals.points / lastFiveGames.length,
      rebounds: totals.rebounds / lastFiveGames.length,
      assists: totals.assists / lastFiveGames.length
    };
  } catch (error) {
    console.error('Error calculating 5-game averages:', error);
    return { points: 0, rebounds: 0, assists: 0 };
  }
};

// Validate bet entry
export const validateBetEntry = (entry: BetEntry): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!entry.playerId) {
    errors.push('Player ID is required');
  }
  
  if (!entry.player) {
    errors.push('Player information is required');
  }
  
  if (!['points', 'rebounds', 'assists'].includes(entry.stat)) {
    errors.push('Stat must be one of: points, rebounds, assists');
  }
  
  if (!['over', 'under'].includes(entry.overUnder)) {
    errors.push('Over/Under must be either "over" or "under"');
  }
  
  if (entry.betAmount <= 0) {
    errors.push('Bet amount must be greater than 0');
  }
  
  if (entry.threshold < 0) {
    errors.push('Threshold must be non-negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate parlay
export const validateParlay = (parlay: Parlay): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!parlay._id || typeof parlay._id !== 'string') {
    errors.push('_id must be a non-empty string');
  }
  
  if (!parlay.gameId || typeof parlay.gameId !== 'string') {
    errors.push('gameId must be a non-empty string');
  }
  
  if (!Array.isArray(parlay.betIds) || parlay.betIds.length === 0) {
    errors.push('betIds must be a non-empty array');
  }
  
  if (!['flex', 'power'].includes(parlay.betType)) {
    errors.push('betType must be either "flex" or "power"');
  }
  
  if (typeof parlay.totalBetAmount !== 'number' || parlay.totalBetAmount <= 0) {
    errors.push('totalBetAmount must be a positive number');
  }
  
  if (typeof parlay.multiplier !== 'number' || parlay.multiplier <= 0) {
    errors.push('multiplier must be a positive number');
  }
  
  if (typeof parlay.potentialWinnings !== 'number' || parlay.potentialWinnings <= 0) {
    errors.push('potentialWinnings must be a positive number');
  }
  
  if (!['pending', 'won', 'lost'].includes(parlay.status)) {
    errors.push('status must be one of: pending, won, lost');
  }
  
  if (!(parlay.createdAt instanceof Date)) {
    errors.push('createdAt must be a Date object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Create simulation request from bet entries
export const createSimulationRequest = (
  betEntries: BetEntry[],
  contractLength: number,
  betType: 'flex' | 'power'
): SimulationRequest => {
  const validEntries = betEntries.filter(entry => 
    entry.player && entry.betAmount > 0
  );
  
  const parlays: ParlayRequest[] = validEntries.map(entry => ({
    playerId: entry.playerId,
    stat: entry.stat
  }));
  
  return {
    contract_length: contractLength,
    betType: betType,
    parlays: parlays
  };
};
