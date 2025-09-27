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
const PlayerGameStatsModel = mongoose.model<PlayerStats & Document>('PlayerGameStats', PlayerGameStatsSchema);

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
      console.log('🔄 Loading player thresholds...');
      
      // Get all active players
      const players = await PlayerModel.find({ active: true }).select('_id');
      const playerIds = players.map(p => p._id);
      
      console.log(`Found ${playerIds.length} active players`);
      
      // Calculate thresholds for each player
      for (const playerId of playerIds) {
        const thresholds = await this.calculatePlayerThresholds(playerId);
        if (thresholds) {
          this.playerThresholds[playerId] = thresholds;
        }
      }
      
      console.log(`✅ Loaded thresholds for ${Object.keys(this.playerThresholds).length} players`);
    } catch (error) {
      console.error('Error loading player thresholds:', error);
      throw error;
    }
  }

  /**
   * Calculate betting thresholds for a specific player
   */
  private async calculatePlayerThresholds(playerId: string): Promise<{ points: number; rebounds: number; assists: number } | null> {
    try {
      // Get recent player stats (last 20 games)
      const recentStats = await PlayerGameStatsModel
        .find({ playerId })
        .sort({ gameDateUTC: -1 })
        .limit(20);

      if (recentStats.length < 5) {
        return null; // Not enough data
      }

      // Calculate 75th percentile for each stat
      const points = recentStats.map(s => s.points).sort((a, b) => a - b);
      const rebounds = recentStats.map(s => s.rebounds).sort((a, b) => a - b);
      const assists = recentStats.map(s => s.assists).sort((a, b) => a - b);

      const getPercentile = (arr: number[], percentile: number): number => {
        const index = Math.ceil((percentile / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
      };

      return {
        points: getPercentile(points, 75),
        rebounds: getPercentile(rebounds, 75),
        assists: getPercentile(assists, 75)
      };
    } catch (error) {
      console.error(`Error calculating thresholds for player ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Get player information including thresholds
   */
  async getPlayerInfo(playerId: string): Promise<{
    thresholds: Record<string, number>;
    games_analyzed: number;
  } | { error: string }> {
    try {
      // Ensure thresholds are loaded
      if (Object.keys(this.playerThresholds).length === 0) {
        await this.loadAllThresholds();
      }

      const playerThresholds = this.playerThresholds[playerId];
      if (!playerThresholds) {
        return { error: 'Player not found or insufficient data' };
      }

      // Count games analyzed for this player
      const gamesAnalyzed = await PlayerGameStatsModel.countDocuments({ playerId });

      return {
        thresholds: {
          points: playerThresholds.points,
          rebounds: playerThresholds.rebounds,
          assists: playerThresholds.assists
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

    // Simulate each parlay leg
    for (const parlay of parlays) {
      const threshold = this.playerThresholds[parlay.playerId]?.[parlay.stat as StatType];
      if (!threshold) {
        throw new Error(`No threshold data for player ${parlay.playerId} stat ${parlay.stat}`);
      }

      // Get actual performance (simulated for now - in real implementation, use actual game data)
      const actual = this.simulatePlayerPerformance(parlay.playerId, parlay.stat as StatType);
      const hit = actual >= threshold;

      outcomes.push({
        playerId: parlay.playerId,
        stat: parlay.stat,
        threshold,
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
    const thresholds = this.playerThresholds[playerId];
    if (!thresholds) {
      return 0;
    }

    const threshold = thresholds[stat];
    
    // Simulate performance with some randomness around the threshold
    const basePerformance = threshold * 0.8; // Start below threshold
    const variance = threshold * 0.4; // Add variance
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    
    return Math.max(0, Math.round(basePerformance + (variance * randomFactor)));
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
