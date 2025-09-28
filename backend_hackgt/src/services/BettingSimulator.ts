import mongoose, { Document } from 'mongoose';

import {
  Player,
  Team,
  Game,
  PlayerStats,
  Parlay,
  ParlayRequest,
  ContractResult,
  GameResult,
  ParlayOutcome,
  PlayerThresholds,
  StatType,
  BettingSimulatorInterface,
  GameSimulationData
} from '../types';
import { simulatedTimeService } from './SimulatedTimeService';
import { MultiplierCalculator } from '../utils/MultiplierCalculator';
import { TradeLoggingService } from './TradeLoggingService';
import { redisService, DemoState, TradeLogEntry } from './RedisService';

// Constants
const DEFAULT_INITIAL_BALANCE = 1000.0;
const BET_PERCENTAGE = 0.1; // 10% of balance per bet
const DEFAULT_MULTIPLIER = 1.5;
const PERFORMANCE_VARIANCE = 0.3; // 30% variance in performance simulation
const SKEW_PROBABILITY = 0.3; // 30% chance of performance boost
const SKEW_FACTOR = 0.2; // 20% boost when skew occurs
const MIN_VALID_GAMES = 3;

// Star players for demo (verified players with 24-25 data)
// These players have sufficient game data and are well-known for betting
const STAR_PLAYER_IDS = [
  '1628983', // Shai Gilgeous-Alexander - 103 games
  '1630169', // Tyrese Haliburton - 99 games
  '203999', // Nikola Jokić - 88 games
  '1628369', // Jayson Tatum - 84 games
  '201939', // Stephen Curry - 83 games
  '1628378', // Donovan Mitchell - 83 games
  '2544', // LeBron James - 78 games
  '1626164', // Devin Booker - 78 games
  '203507', // Giannis Antetokounmpo - 75 games
  '203954' // Joel Embiid - 19 games
];

// MongoDB Schemas
const PlayerSchema = new mongoose.Schema({
  _id: String,
  fullName: String,
  headshotUrl: String,
  position: String,
  currentTeamId: String,
  active: { type: Boolean, default: true }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  _id: String,
  name: String,
  tricode: String,
  city: String,
  logoUrl: String
}, { _id: false });

const GameSchema = new mongoose.Schema({
  _id: String,
  season: String,
  seasonType: String,
  gameDateUTC: Date,
  homeTeamId: String,
  awayTeamId: String,
  homeScore: { type: Number, default: 0 },
  awayScore: { type: Number, default: 0 },
  status: String,
  venue: String
}, { _id: false });

const PlayerGameStatsSchema = new mongoose.Schema({
  _id: String,
  gameId: String,
  playerId: String,
  teamId: String,
  opponentTeamId: String,
  gameDateUTC: Date,
  season: String,
  seasonType: String,
  points: Number,
  rebounds: Number,
  assists: Number
}, { _id: false });

// Models
const PlayerModel = mongoose.model<Player & Document>('Player', PlayerSchema);
const TeamModel = mongoose.model<Team & Document>('Team', TeamSchema);
const GameModel = mongoose.model<Game & Document>('Game', GameSchema);
const PlayerGameStatsModel = mongoose.model<PlayerStats & Document>('playerGameStats', PlayerGameStatsSchema, 'playerGameStats');

export class BettingSimulator implements BettingSimulatorInterface {
  public playerThresholds: PlayerThresholds = {};
  private initialBalance: number = DEFAULT_INITIAL_BALANCE;
  private currentSimulationId: string | null = null;

  constructor(initialBalance: number = DEFAULT_INITIAL_BALANCE) {
    this.initialBalance = initialBalance;
  }

  /**
   * Initialize Redis state
   */
  async initializeRedisState(): Promise<void> {
    await redisService.connect();
    await redisService.initializeDemoState(this.initialBalance);
  }


  /**
   * Load only star players for demo purposes (much faster startup)
   */
  async loadStarPlayers(): Promise<void> {
    try {
      console.log('🔄 Loading star players for demo...');
      console.log(`Loading ${STAR_PLAYER_IDS.length} star players...`);

      // Pull all star player stats in a single aggregation to avoid per-player queries
      const aggregatedStats = await PlayerGameStatsModel.aggregate<{ 
        _id: string;
        gamesAnalyzed: number;
        avgPoints: number;
        avgRebounds: number;
        avgAssists: number;
      }>([
        {
          $match: {
            season: '2024-25',
            playerId: { $in: STAR_PLAYER_IDS }
          }
        },
        {
          // Filter out placeholder games with no recorded stats
          $match: {
            $expr: {
              $gt: [
                { $add: ['$points', '$rebounds', '$assists'] },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: '$playerId',
            gamesAnalyzed: { $sum: 1 },
            avgPoints: { $avg: '$points' },
            avgRebounds: { $avg: '$rebounds' },
            avgAssists: { $avg: '$assists' }
          }
        },
        {
          $match: {
            gamesAnalyzed: { $gte: MIN_VALID_GAMES }
          }
        }
      ]);

      this.playerThresholds = aggregatedStats.reduce<PlayerThresholds>((acc, statLine) => {
        acc[statLine._id] = {
          points: Math.round(statLine.avgPoints * 10) / 10,
          rebounds: Math.round(statLine.avgRebounds * 10) / 10,
          assists: Math.round(statLine.avgAssists * 10) / 10
        };
        return acc;
      }, {});

      console.log(`✅ Loaded expected values for ${Object.keys(this.playerThresholds).length} star players`);
    } catch (error) {
      console.error('Error loading star players:', error);
      throw error;
    }
  }

  /**
   * Get player information including expected values (betting lines)
   */
  async getPlayerInfo(playerId: string): Promise<{
    expected_values: Record<string, number>;
    games_analyzed: number;
  } | { error: string }> {
    try {
      // Ensure star players are loaded
      await this.ensureStarPlayersLoaded();

      const playerExpectedValues = this.playerThresholds[playerId];
      if (!playerExpectedValues) {
        return { error: 'Player not found or insufficient data' };
      }

      // Count games analyzed for this player
      const gamesAnalyzed = await PlayerGameStatsModel.countDocuments({ playerId });

      return {
        expected_values: {
          points: playerExpectedValues.points,
          rebounds: playerExpectedValues.rebounds,
          assists: playerExpectedValues.assists
        },
        games_analyzed: gamesAnalyzed
      };
    } catch (error) {
      console.error(`Error getting player info for ${playerId}:`, error);
      return { error: 'Failed to get player information' };
    }
  }

  /**
   * Simulate a betting contract
   */
  async simulateContract(contractLength: number, parlays: ParlayRequest[]): Promise<ContractResult> {
    try {
      console.log(`Starting simulation: ${contractLength} games, ${parlays.length} parlay legs`);
      
      // Create simulation record
      this.currentSimulationId = this.generateId('sim');
      await TradeLoggingService.createSimulation(
        this.currentSimulationId,
        contractLength,
        this.initialBalance,
        parlays
      );

      // Set active simulation in Redis
      await redisService.setActiveSimulation(this.currentSimulationId, {
        contractLength,
        initialBalance: this.initialBalance,
        parlayConfig: parlays
      });

      // Log simulation start in Redis
      await redisService.addTradeLog({
        timestamp: new Date().toISOString(),
        action: 'simulation_started',
        amount: 0,
        balanceAfter: this.initialBalance,
        description: `Started simulation with ${contractLength} games`
      });
      
      // Ensure star players are loaded
      await this.ensureStarPlayersLoaded();

      // Get recent games for simulation
      const games = await this.getRecentGames(contractLength);
      if (games.length < contractLength) {
        throw new Error(`Not enough games available. Requested: ${contractLength}, Available: ${games.length}`);
      }

      let balance = this.initialBalance;
      const gameResults: GameResult[] = [];
      let gamesWon = 0;

      // Simulate each game
      for (let i = 0; i < contractLength; i++) {
        const game = games[i];
        const gameResult = await this.simulateGame(game, parlays, balance);
        
        balance = gameResult.balance_after;
        if (gameResult.parlay_hit) {
          gamesWon++;
        }
        
        gameResults.push(gameResult);
      }

      const totalReturnPct = ((balance - this.initialBalance) / this.initialBalance) * 100;
      const winRate = (gamesWon / contractLength) * 100;

      // Complete simulation record
      await TradeLoggingService.completeSimulation(
        this.currentSimulationId,
        balance,
        contractLength,
        gamesWon
      );

      // Update final state in Redis
      await redisService.updateDemoState({
        balance,
        totalBetsPlaced: contractLength,
        totalWinnings: balance - this.initialBalance,
        totalWagered: this.initialBalance * BET_PERCENTAGE * contractLength // Approximate
      });

      // Log simulation end in Redis
      await redisService.addTradeLog({
        timestamp: new Date().toISOString(),
        action: 'simulation_ended',
        amount: balance - this.initialBalance,
        balanceAfter: balance,
        description: `Completed simulation: ${gamesWon}/${contractLength} games won`
      });

      // Clear active simulation
      await redisService.clearActiveSimulation();
      this.currentSimulationId = null;

      return {
        contract_length: contractLength,
        parlay_size: parlays.length,
        initial_balance: this.initialBalance,
        final_balance: balance,
        total_return_pct: totalReturnPct,
        games_played: contractLength,
        games_won: gamesWon,
        win_rate: winRate,
        game_results: gameResults
      };
    } catch (error) {
      console.error('Simulation failed:', error);
      // Mark simulation as cancelled if it was started
      if (this.currentSimulationId) {
        await TradeLoggingService.logAction('simulation_ended', {
          description: 'Simulation cancelled due to error',
          amount: 0,
          balanceBefore: this.initialBalance,
          balanceAfter: this.initialBalance
        }, undefined, undefined, this.currentSimulationId);
        this.currentSimulationId = null;
      }
      throw error;
    }
  }

  /**
   * Get recent games for simulation
   * Only returns games that are "known" to the system (past games)
   */
  private async getRecentGames(limit: number): Promise<Game[]> {
    const allGames = await GameModel
      .find({ status: 'Final' })
      .sort({ gameDateUTC: -1 })
      .lean();

    // Filter games based on simulated time - only use past games for modeling
    const knownGames = simulatedTimeService.getKnownGames(allGames);
    
    return knownGames.slice(0, limit);
  }

  /**
   * Simulate a single game
   */
  private async simulateGame(game: Game, parlays: ParlayRequest[], balanceBefore: number): Promise<GameResult> {
    const outcomes: ParlayOutcome[] = [];
    let allHits = true;
    let flexHits = 0;
    let powerHits = 0;

    // Create parlay record if we have multiple bets
    let parlayId: string | undefined;
    if (parlays.length > 1) {
      parlayId = this.generateId('parlay', game._id);
      const betAmount = balanceBefore * BET_PERCENTAGE;
      await TradeLoggingService.createParlay(
        parlayId,
        game._id,
        [], // Will be populated with bet IDs
        betAmount,
        0, // Will be calculated
        this.currentSimulationId || undefined
      );
    }

    // Simulate each parlay leg (all bets are "over" bets)
    for (const parlay of parlays) {
      const expectedValue = this.playerThresholds[parlay.playerId]?.[parlay.stat as StatType];
      if (!expectedValue) {
        throw new Error(`No expected value data for player ${parlay.playerId} stat ${parlay.stat}`);
      }

      // Get actual performance (simulated for now - in real implementation, use actual game data)
      const actual = this.simulatePlayerPerformance(parlay.playerId, parlay.stat as StatType);
      const hit = actual > expectedValue; // "Over" bet: actual must exceed expected value

      // Create bet record
      const betId = this.generateId('bet', `${parlay.playerId}_${parlay.stat}`);
      const betAmount = balanceBefore * BET_PERCENTAGE;
      const multiplier = DEFAULT_MULTIPLIER;
      
      await TradeLoggingService.createBet(
        betId,
        game._id,
        parlay.playerId,
        parlay.stat as 'points' | 'rebounds' | 'assists',
        parlay.betType,
        expectedValue,
        betAmount,
        multiplier,
        this.currentSimulationId || undefined,
        parlayId
      );

      // Add to Redis active bets
      await redisService.addActiveBet(betId, {
        gameId: game._id,
        playerId: parlay.playerId,
        stat: parlay.stat,
        betType: parlay.betType,
        betAmount: betAmount.toString(),
        threshold: expectedValue.toString(),
        status: 'pending'
      });

      // Resolve bet
      const actualWinnings = hit ? betAmount * multiplier : 0;
      await TradeLoggingService.resolveBet(betId, actual, hit, actualWinnings);

      // Remove from active bets and log in Redis
      await redisService.removeActiveBet(betId);
      await redisService.addTradeLog({
        timestamp: new Date().toISOString(),
        action: 'bet_resolved',
        amount: betAmount,
        winnings: actualWinnings,
        balanceAfter: balanceBefore, // Will be updated after all bets
        description: `Bet ${hit ? 'won' : 'lost'}: ${actual} vs ${expectedValue}`
      });

      outcomes.push({
        playerId: parlay.playerId,
        stat: parlay.stat,
        threshold: expectedValue, // Keep threshold field for API compatibility
        actual,
        hit,
        betType: parlay.betType
      });

      if (hit) {
        if (parlay.betType === 'flex') {
          flexHits++;
        } else {
          powerHits++;
        }
      } else {
        allHits = false;
      }
    }

    // Calculate multiplier based on bet types
    const multiplierResult = MultiplierCalculator.calculateMultiplier(parlays, flexHits, powerHits, allHits);
    const multiplier = multiplierResult.multiplier;
    const betAmount = balanceBefore * BET_PERCENTAGE;
    const winnings = multiplier > 0 ? betAmount * multiplier : 0;
    const balanceAfter = balanceBefore - betAmount + winnings;

    // Update balance in Redis
    await redisService.updateBalance(balanceAfter);
    await redisService.addBalanceHistory(balanceAfter);

    // Log balance update
    await this.logTradeAction(
      'balance_updated',
      winnings - betAmount,
      balanceAfter,
      `Game ${game._id}: ${allHits ? 'Won' : 'Lost'} parlay`,
      game._id,
      this.currentSimulationId || undefined
    );

    return {
      game_id: game._id,
      date: game.gameDateUTC.toISOString(),
      parlay_size: parlays.length,
      outcomes,
      parlay_hit: allHits,
      multiplier,
      balance_before: balanceBefore,
      balance_after: balanceAfter
    };
  }


  /**
   * Simulate player performance for a given stat
   * Uses realistic variance around expected values with slight positive skew
   * to make "over" bets more interesting for demo purposes
   * 
   * @param playerId - The player ID to simulate performance for
   * @param stat - The stat type to simulate (points, rebounds, assists)
   * @returns Simulated performance value
   */
  private simulatePlayerPerformance(playerId: string, stat: StatType): number {
    const expectedValues = this.playerThresholds[playerId];
    if (!expectedValues) {
      return 0;
    }

    const expectedValue = expectedValues[stat];
    
    // Simulate performance with realistic variance around the expected value
    // Using a normal distribution approximation with some skew
    const basePerformance = expectedValue;
    const variance = expectedValue * PERFORMANCE_VARIANCE;
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    
    // Add slight positive skew to make "over" bets more interesting
    const skewFactor = Math.random() < SKEW_PROBABILITY ? SKEW_FACTOR : 0;
    
    return Math.max(0, Math.round(basePerformance + (variance * randomFactor) + (expectedValue * skewFactor)));
  }

  /**
   * Get all loaded player thresholds
   */
  getPlayerThresholds(): PlayerThresholds {
    return this.playerThresholds;
  }

  /**
   * Check if thresholds are loaded
   */
  areThresholdsLoaded(): boolean {
    return Object.keys(this.playerThresholds).length > 0;
  }

  /**
   * Get future games (unknown to the system)
   */
  async getFutureGames(limit: number = 20): Promise<Game[]> {
    const allGames = await GameModel
      .find({ status: { $in: ['Scheduled', 'In Progress'] } })
      .sort({ gameDateUTC: 1 })
      .lean();

    // Filter games based on simulated time - only return future games
    const futureGames = simulatedTimeService.getUnknownGames(allGames);
    
    return futureGames.slice(0, limit);
  }

  /**
   * Get games filtered by time (past vs future)
   */
  async getGamesByTime(): Promise<{ pastGames: Game[]; futureGames: Game[] }> {
    const allGames = await GameModel
      .find({})
      .sort({ gameDateUTC: -1 })
      .lean();

    return simulatedTimeService.filterGamesByTime(allGames);
  }

  // ================================
  // Helper Methods
  // ================================

  /**
   * Log trade action to both TradeLoggingService and Redis
   */
  private async logTradeAction(
    action: 'bet_placed' | 'bet_resolved' | 'simulation_started' | 'simulation_ended' | 'balance_updated',
    amount: number,
    balanceAfter: number,
    description: string,
    gameId?: string,
    simulationId?: string
  ): Promise<void> {
    // Log to TradeLoggingService
    await TradeLoggingService.logAction(action, {
      description,
      amount,
      balanceBefore: balanceAfter - amount,
      balanceAfter
    }, gameId, undefined, simulationId);

    // Log to Redis
    await redisService.addTradeLog({
      timestamp: new Date().toISOString(),
      action,
      amount,
      balanceAfter,
      description
    });
  }

  /**
   * Ensure star players are loaded
   */
  private async ensureStarPlayersLoaded(): Promise<void> {
    if (Object.keys(this.playerThresholds).length === 0) {
      console.log('⚠️ No player thresholds loaded. Loading star players...');
      await this.loadStarPlayers();
    }
  }

  /**
   * Create a unique ID with timestamp
   */
  private generateId(prefix: string, suffix?: string): string {
    return `${prefix}_${Date.now()}${suffix ? `_${suffix}` : ''}`;
  }

  // ================================
  // Trade Logging Methods
  // ================================

  /**
   * Get recent trade logs
   */
  async getRecentTradeLogs(limit: number = 50) {
    return await TradeLoggingService.getRecentTradeLogs(limit);
  }

  /**
   * Get simulation history
   */
  async getSimulationHistory(limit: number = 20) {
    return await TradeLoggingService.getSimulationHistory(limit);
  }

  /**
   * Get bet history for a specific game
   */
  async getGameBets(gameId: string) {
    return await TradeLoggingService.getGameBets(gameId);
  }

  /**
   * Get analytics data
   */
  async getAnalytics() {
    return await TradeLoggingService.getAnalytics();
  }

  /**
   * Get current simulation ID
   */
  getCurrentSimulationId(): string | null {
    return this.currentSimulationId;
  }

  // ================================
  // Redis Real-time Methods
  // ================================

  /**
   * Get current demo state from Redis
   */
  async getCurrentDemoState(): Promise<DemoState | null> {
    return await redisService.getDemoState();
  }

  /**
   * Get recent trade logs from Redis
   */
  async getRecentRedisLogs(limit: number = 50): Promise<TradeLogEntry[]> {
    return await redisService.getRecentTradeLogs(limit);
  }

  /**
   * Get active bets from Redis
   */
  async getActiveBets(): Promise<string[]> {
    return await redisService.getActiveBets();
  }

  /**
   * Get balance history from Redis
   */
  async getBalanceHistory(limit: number = 100): Promise<Array<{ timestamp: number; balance: number }>> {
    return await redisService.getBalanceHistory(limit);
  }

  /**
   * Get active simulation from Redis
   */
  async getActiveSimulation(): Promise<any> {
    return await redisService.getActiveSimulation();
  }

  /**
   * Clear all demo data from Redis
   */
  async clearRedisData(): Promise<void> {
    await redisService.clearAllDemoData();
  }

  /**
   * Get Redis connection status
   */
  isRedisConnected(): boolean {
    return redisService.isRedisConnected();
  }
}
