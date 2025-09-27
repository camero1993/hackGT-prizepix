import mongoose, { Document } from 'mongoose';
import {
  Player,
  Team,
  Game,
  PlayerStats,
  Parlay,
  ContractResult,
  GameResult,
  ParlayOutcome,
  PlayerThresholds,
  StatType,
  BettingSimulatorInterface,
  GameSimulationData
} from '../types';

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
const PlayerGameStatsModel = mongoose.model<PlayerStats & Document>('playerGameStats', PlayerGameStatsSchema);

export class BettingSimulator implements BettingSimulatorInterface {
  private playerThresholds: PlayerThresholds = {};
  private initialBalance: number = 1000.0;

  constructor(initialBalance: number = 1000.0) {
    this.initialBalance = initialBalance;
  }

  /**
   * Load all player thresholds based on recent performance
   */
  async loadAllThresholds(): Promise<void> {
    try {
      console.log('🔄 Loading player expected values (betting lines)...');
      
      // Get all active players
      const players = await PlayerModel.find({ active: true }).select('_id');
      const playerIds = players.map(p => p._id);
      
      console.log(`Found ${playerIds.length} active players`);
      
      // Calculate expected values for each player
      for (const playerId of playerIds) {
        const expectedValues = await this.calculatePlayerExpectedValues(playerId);
        if (expectedValues) {
          this.playerThresholds[playerId] = expectedValues;
        }
      }
      
      console.log(`✅ Loaded expected values for ${Object.keys(this.playerThresholds).length} players`);
    } catch (error) {
      console.error('Error loading player thresholds:', error);
      throw error;
    }
  }

  /**
   * Calculate expected values (betting lines) for a specific player
   */
  private async calculatePlayerExpectedValues(playerId: string): Promise<{ points: number; rebounds: number; assists: number } | null> {
    try {
      // Get recent player stats (last 20 games)
      const recentStats = await PlayerGameStatsModel
        .find({ playerId })
        .sort({ gameDateUTC: -1 })
        .limit(20);

      if (recentStats.length < 5) {
        return null; // Not enough data
      }

      // Calculate expected value (mean) for each stat
      const points = recentStats.map(s => s.points);
      const rebounds = recentStats.map(s => s.rebounds);
      const assists = recentStats.map(s => s.assists);

      const calculateMean = (arr: number[]): number => {
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
      };

      return {
        points: Math.round(calculateMean(points) * 10) / 10, // Round to 1 decimal
        rebounds: Math.round(calculateMean(rebounds) * 10) / 10,
        assists: Math.round(calculateMean(assists) * 10) / 10
      };
    } catch (error) {
      console.error(`Error calculating expected values for player ${playerId}:`, error);
      return null;
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
      // Ensure expected values are loaded
      if (Object.keys(this.playerThresholds).length === 0) {
        await this.loadAllThresholds();
      }

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
  async simulateContract(contractLength: number, parlays: Parlay[]): Promise<ContractResult> {
    try {
      console.log(`Starting simulation: ${contractLength} games, ${parlays.length} parlay legs`);
      
      // Ensure thresholds are loaded
      if (Object.keys(this.playerThresholds).length === 0) {
        await this.loadAllThresholds();
      }

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
      throw error;
    }
  }

  /**
   * Get recent games for simulation
   */
  private async getRecentGames(limit: number): Promise<Game[]> {
    return await GameModel
      .find({ status: 'Final' })
      .sort({ gameDateUTC: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Simulate a single game
   */
  private async simulateGame(game: Game, parlays: Parlay[], balanceBefore: number): Promise<GameResult> {
    const outcomes: ParlayOutcome[] = [];
    let allHits = true;

    // Simulate each parlay leg (all bets are "over" bets)
    for (const parlay of parlays) {
      const expectedValue = this.playerThresholds[parlay.playerId]?.[parlay.stat as StatType];
      if (!expectedValue) {
        throw new Error(`No expected value data for player ${parlay.playerId} stat ${parlay.stat}`);
      }

      // Get actual performance (simulated for now - in real implementation, use actual game data)
      const actual = this.simulatePlayerPerformance(parlay.playerId, parlay.stat as StatType);
      const hit = actual > expectedValue; // "Over" bet: actual must exceed expected value

      outcomes.push({
        playerId: parlay.playerId,
        stat: parlay.stat,
        threshold: expectedValue, // Keep threshold field for API compatibility
        actual,
        hit
      });

      if (!hit) {
        allHits = false;
      }
    }

    // Calculate multiplier and balance
    const multiplier = allHits ? Math.pow(2, parlays.length) : 0;
    const betAmount = balanceBefore * 0.1; // Bet 10% of balance
    const winnings = allHits ? betAmount * multiplier : 0;
    const balanceAfter = balanceBefore - betAmount + winnings;

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
   * In a real implementation, this would use actual game data
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
    const variance = expectedValue * 0.3; // 30% variance
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    
    // Add slight positive skew to make "over" bets more interesting
    const skewFactor = Math.random() < 0.3 ? 0.2 : 0; // 30% chance of slight boost
    
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
}
