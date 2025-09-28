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
  GameSimulationData,
  Contract,
  StructuredParlayRequest
} from '../types';
import { simulatedTimeService } from './SimulatedTimeService';
import { MultiplierCalculator } from '../utils/MultiplierCalculator';
import { TradeLoggingService } from './TradeLoggingService';
import { jsonStorageService, DemoState, TradeLogEntry } from './JsonStorageService';

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
    await jsonStorageService.connect();
    await jsonStorageService.initializeDemoState(this.initialBalance);
  }


  /**
   * Load all players with stats for comprehensive betting system
   */
  async loadAllPlayers(): Promise<void> {
    try {
      console.log('🔄 Loading all players with stats...');

      // First, get all active players from the players collection
      const allPlayers = await mongoose.connection.db?.collection('players')
        .find({ active: true }, { projection: { _id: 1, fullName: 1 } })
        .toArray();

      if (!allPlayers) {
        throw new Error('Failed to fetch players from database');
      }

      console.log(`Found ${allPlayers.length} active players in database`);

      // Get all player IDs
      const allPlayerIds = allPlayers.map(p => p._id);

      // Pull all player stats in a single aggregation
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
            playerId: { $in: allPlayerIds }
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

      console.log(`✅ Loaded expected values for ${Object.keys(this.playerThresholds).length} players with sufficient game data`);
      console.log(`📊 Players with stats: ${Object.keys(this.playerThresholds).length}/${allPlayers.length} (${((Object.keys(this.playerThresholds).length / allPlayers.length) * 100).toFixed(1)}%)`);
    } catch (error) {
      console.error('Error loading all players:', error);
      throw error;
    }
  }

  /**
   * Load only star players for demo purposes (much faster startup)
   * @deprecated Use loadAllPlayers() for full functionality
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
      // Ensure players are loaded
      await this.ensurePlayersLoaded();

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
   * Simulate a complete contract with 3-leg parlay
   */
  async simulateContract(contractLength: 3 | 5, parlayConfig: StructuredParlayRequest): Promise<ContractResult> {
    try {
      console.log(`🎯 Starting Contract Simulation: ${contractLength} games, 3-leg parlay`);
      console.log(`📊 Parlay Config:`, {
        betType: parlayConfig.betType,
        betAmount: parlayConfig.betAmount,
        legs: parlayConfig.legs.map(leg => `${leg.playerId} ${leg.stat} ${leg.overUnder}`)
      });
      
      // Create contract record
      const contractId = this.generateId('contract');
      const contract = await TradeLoggingService.createContract(
        contractId,
        contractLength,
        parlayConfig
      );

      console.log(`✅ Contract created: ${contractId}`);

      // Add contract to Redis state
      await jsonStorageService.addActiveContract(contractId, {
        contractId: contractId,
        contractLength: contractLength,
        parlayConfig: JSON.stringify(parlayConfig),
        totalWagered: 0,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        remainingGames: contractLength,
        parlayIds: [],
        createdAt: new Date().toISOString()
      });

      // Set active simulation in Redis
      this.currentSimulationId = contractId;
      await jsonStorageService.setActiveSimulation(contractId, {
        contractLength,
        initialBalance: this.initialBalance,
        parlayConfig: parlayConfig.legs
      });

      // Log contract start in Redis
      await jsonStorageService.addTradeLog({
        timestamp: new Date().toISOString(),
        action: 'simulation_started',
        amount: 0,
        balanceAfter: this.initialBalance,
        description: `Started ${contractLength}-game contract with 3-leg parlay`
      });
      
      // Ensure players are loaded
      await this.ensurePlayersLoaded();

      // Get recent games for simulation
      const games = await this.getRecentGames(contractLength);
      if (games.length < contractLength) {
        throw new Error(`Not enough games available. Requested: ${contractLength}, Available: ${games.length}`);
      }

      let balance = this.initialBalance;
      const gameResults: GameResult[] = [];
      let gamesWon = 0;
      const parlayIds: string[] = [];

      console.log(`🎮 Simulating ${contractLength} games...`);

      // Simulate each game in the contract
      for (let i = 0; i < contractLength; i++) {
        const game = games[i];
        console.log(`\n🎯 Game ${i + 1}/${contractLength}: ${game._id}`);
        
        const gameResult = await this.simulateContractGame(
          game, 
          parlayConfig, 
          balance, 
          contractId
        );
        
        balance = gameResult.balance_after;
        if (gameResult.parlay_hit) {
          gamesWon++;
          console.log(`✅ Game ${i + 1} WON! Balance: $${balance.toFixed(2)}`);
        } else {
          console.log(`❌ Game ${i + 1} LOST. Balance: $${balance.toFixed(2)}`);
        }
        
        gameResults.push(gameResult);
        if (gameResult.parlayId) {
          parlayIds.push(gameResult.parlayId);
        }

        // Update contract progress in MongoDB
        await TradeLoggingService.updateContract(contractId, {
          gamesPlayed: i + 1,
          gamesWon: gamesWon,
          totalWagered: parlayConfig.betAmount * (i + 1),
          totalWinnings: balance - this.initialBalance,
          winRate: (gamesWon / (i + 1)) * 100,
          remainingGames: contractLength - (i + 1),
          parlayIds: parlayIds
        });

        // Update contract progress in Redis
        await jsonStorageService.updateContractData(contractId, {
          gamesPlayed: i + 1,
          gamesWon: gamesWon,
          totalWagered: parlayConfig.betAmount * (i + 1),
          totalWinnings: balance - this.initialBalance,
          winRate: (gamesWon / (i + 1)) * 100,
          remainingGames: contractLength - (i + 1),
          parlayIds: JSON.stringify(parlayIds)
        });
      }

      const totalReturnPct = ((balance - this.initialBalance) / this.initialBalance) * 100;
      const winRate = (gamesWon / contractLength) * 100;

      // Complete contract in MongoDB
      await TradeLoggingService.updateContract(contractId, {
        status: 'completed',
        completedAt: new Date(),
        remainingGames: 0
      });

      // Complete contract in Redis
      await jsonStorageService.updateContractData(contractId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        remainingGames: 0
      });

      // Update final state in Redis
      await jsonStorageService.updateDemoState({
        balance,
        totalBetsPlaced: contractLength,
        totalWinnings: balance - this.initialBalance,
        totalWagered: parlayConfig.betAmount * contractLength
      });

      // Log contract completion in Redis
      await jsonStorageService.addTradeLog({
        timestamp: new Date().toISOString(),
        action: 'simulation_ended',
        amount: balance - this.initialBalance,
        balanceAfter: balance,
        description: `Completed contract: ${gamesWon}/${contractLength} games won (${winRate.toFixed(1)}% win rate)`
      });

      // Clear active simulation
      await jsonStorageService.clearActiveSimulation();
      this.currentSimulationId = null;

      console.log(`\n🎉 Contract completed!`);
      console.log(`📊 Final Results: ${gamesWon}/${contractLength} games won (${winRate.toFixed(1)}% win rate)`);
      console.log(`💰 Balance: $${this.initialBalance.toFixed(2)} → $${balance.toFixed(2)} (${totalReturnPct.toFixed(1)}% return)`);

      return {
        contract_length: contractLength,
        parlay_size: 3, // Always 3 legs
        initial_balance: this.initialBalance,
        final_balance: balance,
        total_return_pct: totalReturnPct,
        games_played: contractLength,
        games_won: gamesWon,
        win_rate: winRate,
        game_results: gameResults
      };
    } catch (error) {
      console.error('❌ Contract simulation failed:', error);
      // Mark contract as cancelled if it was started
      if (this.currentSimulationId) {
        await TradeLoggingService.cancelContract(this.currentSimulationId);
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
   * Simulate a single game within a contract (3-leg parlay)
   */
  private async simulateContractGame(
    game: Game, 
    parlayConfig: StructuredParlayRequest, 
    balanceBefore: number,
    contractId: string
  ): Promise<GameResult & { parlayId: string }> {
    const outcomes: ParlayOutcome[] = [];
    let allHits = true;
    let flexHits = 0;
    let powerHits = 0;

    // Create parlay record (always 3 legs)
    const parlayId = this.generateId('parlay', game._id);
    const betAmount = parlayConfig.betAmount;
    
    // Create parlay with empty betIds initially
    await TradeLoggingService.createParlay(
      parlayId,
      game._id,
      ['', '', ''], // Will be populated with actual bet IDs
      parlayConfig.betType,
      betAmount,
      0, // Will be calculated
      contractId
    );

    // Add parlay to Redis state
    await jsonStorageService.addActiveParlay(parlayId, {
      parlayId: parlayId,
      gameId: game._id,
      betIds: JSON.stringify(['', '', '']),
      betType: parlayConfig.betType,
      totalBetAmount: betAmount,
      multiplier: 0,
      potentialWinnings: 0,
      status: 'pending',
      contractId: contractId,
      createdAt: new Date().toISOString()
    });

    // Add parlay to contract
    await jsonStorageService.addParlayToContract(contractId, parlayId);

    const betIds: [string, string, string] = ['', '', ''];

    // Simulate each parlay leg (exactly 3 legs)
    for (let i = 0; i < parlayConfig.legs.length; i++) {
      const leg = parlayConfig.legs[i];
      const expectedValue = this.playerThresholds[leg.playerId]?.[leg.stat as StatType];
      if (!expectedValue) {
        throw new Error(`No expected value data for player ${leg.playerId} stat ${leg.stat}`);
      }

      // Get actual performance (simulated for now - in real implementation, use actual game data)
      const actual = this.simulatePlayerPerformance(leg.playerId, leg.stat as StatType);
      
      // Determine if bet hit based on over/under choice
      const hit = leg.overUnder === 'over' 
        ? actual > expectedValue 
        : actual < expectedValue;

      // Create bet record
      const betId = this.generateId('bet', `${leg.playerId}_${leg.stat}`);
      betIds[i] = betId;
      const multiplier = DEFAULT_MULTIPLIER;
      
      await TradeLoggingService.createBet(
        betId,
        game._id,
        leg.playerId,
        leg.stat as 'points' | 'rebounds' | 'assists',
        expectedValue,
        leg.overUnder, // Use user's over/under choice
        betAmount / 3, // Split bet amount across 3 legs
        multiplier,
        contractId,
        parlayId
      );

      // Add to Redis active bets with contract and parlay references
      await jsonStorageService.addActiveBet(betId, {
        gameId: game._id,
        playerId: leg.playerId,
        stat: leg.stat,
        overUnder: leg.overUnder,
        betType: parlayConfig.betType,
        betAmount: (betAmount / 3).toString(),
        threshold: expectedValue.toString(),
        status: 'pending',
        contractId: contractId,
        parlayId: parlayId
      });

      // Resolve bet
      const actualWinnings = hit ? (betAmount / 3) * multiplier : 0;
      await TradeLoggingService.resolveBet(betId, actual, hit, actualWinnings);

      // Remove from active bets and log in Redis
      await jsonStorageService.removeActiveBet(betId);
      await jsonStorageService.addTradeLog({
        timestamp: new Date().toISOString(),
        action: 'bet_resolved',
        amount: betAmount / 3,
        winnings: actualWinnings,
        balanceAfter: balanceBefore, // Will be updated after all bets
        description: `Bet ${hit ? 'won' : 'lost'}: ${actual} vs ${expectedValue} (${leg.overUnder})`
      });

      outcomes.push({
        playerId: leg.playerId,
        stat: leg.stat,
        threshold: expectedValue,
        actual,
        hit
      });

      if (hit) {
        if (parlayConfig.betType === 'flex') {
          flexHits++;
        } else {
          powerHits++;
        }
      } else {
        allHits = false;
      }
    }

    // Update parlay with actual bet IDs in MongoDB
    await TradeLoggingService.updateParlay(parlayId, {
      betIds: betIds
    });

    // Update parlay with actual bet IDs in Redis
    await jsonStorageService.updateParlayData(parlayId, {
      betIds: JSON.stringify(betIds)
    });

    // Calculate multiplier based on parlay type
    const multiplierResult = MultiplierCalculator.calculateMultiplier(
      parlayConfig.betType,  // 'flex' or 'power'
      3,                     // Always 3 bets in our parlays
      flexHits + powerHits,  // Total hits (since all bets are same type)
      allHits                // Whether all bets won
    );
    const multiplier = multiplierResult.multiplier;
    const winnings = multiplier > 0 ? betAmount * multiplier : 0;
    const balanceAfter = balanceBefore - betAmount + winnings;

    // Update parlay with final results in Redis
    await jsonStorageService.updateParlayData(parlayId, {
      multiplier: multiplier,
      potentialWinnings: winnings,
      status: allHits ? 'won' : 'lost',
      resolvedAt: new Date().toISOString()
    });

    // Update balance in Redis
    await jsonStorageService.updateBalance(balanceAfter);
    await jsonStorageService.addBalanceHistory(balanceAfter);

    // Log balance update
    await this.logTradeAction(
      'balance_updated',
      winnings - betAmount,
      balanceAfter,
      `Game ${game._id}: ${allHits ? 'Won' : 'Lost'} 3-leg parlay`,
      game._id,
      contractId
    );

    return {
      game_id: game._id,
      date: game.gameDateUTC.toISOString(),
      parlay_size: 3, // Always 3 legs
      outcomes,
      parlay_hit: allHits,
      multiplier,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      parlayId: parlayId
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
    await jsonStorageService.addTradeLog({
      timestamp: new Date().toISOString(),
      action,
      amount,
      balanceAfter,
      description
    });
  }

  /**
   * Ensure players are loaded
   */
  private async ensurePlayersLoaded(): Promise<void> {
    if (Object.keys(this.playerThresholds).length === 0) {
      console.log('⚠️ No player thresholds loaded. Loading all players...');
      await this.loadAllPlayers();
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
    return await jsonStorageService.getDemoState();
  }

  /**
   * Get recent trade logs from Redis
   */
  async getRecentRedisLogs(limit: number = 50): Promise<TradeLogEntry[]> {
    return await jsonStorageService.getRecentTradeLogs(limit);
  }

  /**
   * Get active bets from Redis
   */
  async getActiveBets(): Promise<string[]> {
    return await jsonStorageService.getActiveBets();
  }

  /**
   * Get balance history from Redis
   */
  async getBalanceHistory(limit: number = 100): Promise<Array<{ timestamp: number; balance: number }>> {
    return await jsonStorageService.getBalanceHistory(limit);
  }

  /**
   * Get active simulation from Redis
   */
  async getActiveSimulation(): Promise<any> {
    return await jsonStorageService.getActiveSimulation();
  }

  /**
   * Clear all demo data from Redis
   */
  async clearRedisData(): Promise<void> {
    await jsonStorageService.clearAllDemoData();
  }

  /**
   * Get Redis connection status
   */
  isRedisConnected(): boolean {
    return jsonStorageService.isRedisConnected();
  }

  // ================================
  // Demo Contract Simulation
  // ================================

  /**
   * Run a complete contract simulation demo
   */
  async runContractDemo(): Promise<ContractResult> {
    console.log('🚀 Starting Contract Simulation Demo\n');

    // Initialize Redis
    await this.initializeRedisState();

    // Load players
    await this.loadAllPlayers();

    // Create a demo 3-leg parlay configuration
    const parlayConfig: StructuredParlayRequest = {
      legs: [
        { playerId: '201939', stat: 'points', overUnder: 'over' },      // Stephen Curry points over
        { playerId: '2544', stat: 'rebounds', overUnder: 'under' },     // LeBron James rebounds under
        { playerId: '203076', stat: 'assists', overUnder: 'over' }      // Joel Embiid assists over
      ],
      betType: 'flex',
      betAmount: 100
    };

    // Run 5-game contract simulation
    const result = await this.simulateContract(5, parlayConfig);

    console.log('\n🎉 Demo completed successfully!');
    return result;
  }

  /**
   * Run a quick 3-game contract simulation demo
   */
  async runQuickContractDemo(): Promise<ContractResult> {
    console.log('⚡ Starting Quick Contract Simulation Demo\n');

    // Initialize Redis
    await this.initializeRedisState();

    // Load players
    await this.loadAllPlayers();

    // Create a demo 3-leg parlay configuration
    const parlayConfig: StructuredParlayRequest = {
      legs: [
        { playerId: '201939', stat: 'points', overUnder: 'over' },      // Stephen Curry points over
        { playerId: '2544', stat: 'rebounds', overUnder: 'under' },     // LeBron James rebounds under
        { playerId: '203076', stat: 'assists', overUnder: 'over' }      // Joel Embiid assists over
      ],
      betType: 'power',
      betAmount: 50
    };

    // Run 3-game contract simulation
    const result = await this.simulateContract(3, parlayConfig);

    console.log('\n🎉 Quick demo completed successfully!');
    return result;
  }
}
