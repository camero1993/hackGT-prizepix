import mongoose, { Document } from 'mongoose';
import { TradeLog, Simulation, Bet, Parlay, ParlayRequest } from '../types';

// MongoDB Schemas (re-exported from BettingSimulator for organization)
const TradeLogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, index: true },
  actionType: { 
    type: String, 
    required: true, 
    enum: ['bet_placed', 'bet_resolved', 'simulation_started', 'simulation_ended', 'balance_updated'],
    index: true 
  },
  gameId: { type: String, index: true },
  betId: { type: String, index: true },
  simulationId: { type: String, index: true },
  details: {
    description: { type: String, required: true },
    amount: Number,
    balanceBefore: Number,
    balanceAfter: Number,
    winnings: Number,
    metadata: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

const SimulationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  contractLength: { type: Number, required: true },
  initialBalance: { type: Number, required: true },
  finalBalance: { type: Number, required: true },
  totalReturnPct: { type: Number, required: true },
  gamesPlayed: { type: Number, required: true },
  gamesWon: { type: Number, required: true },
  winRate: { type: Number, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['running', 'completed', 'cancelled'],
    index: true 
  },
  startedAt: { type: Date, required: true, index: true },
  completedAt: Date,
  parlayConfig: [mongoose.Schema.Types.Mixed]
}, { _id: false });

const BetSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  gameId: { type: String, required: true, index: true },
  playerId: { type: String, required: true, index: true },
  stat: { 
    type: String, 
    required: true, 
    enum: ['points', 'rebounds', 'assists'] 
  },
  betType: { 
    type: String, 
    required: true, 
    enum: ['flex', 'power'] 
  },
  threshold: { type: Number, required: true },
  actual: Number,
  hit: Boolean,
  betAmount: { type: Number, required: true },
  multiplier: { type: Number, required: true },
  potentialWinnings: { type: Number, required: true },
  actualWinnings: Number,
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'won', 'lost'],
    index: true 
  },
  createdAt: { type: Date, required: true, index: true },
  resolvedAt: Date,
  parlayId: { type: String, index: true },
  simulationId: { type: String, index: true }
}, { _id: false });

const ParlaySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  gameId: { type: String, required: true, index: true },
  betIds: [{ type: String, required: true }],
  totalBetAmount: { type: Number, required: true },
  multiplier: { type: Number, required: true },
  potentialWinnings: { type: Number, required: true },
  actualWinnings: Number,
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'won', 'lost'],
    index: true 
  },
  createdAt: { type: Date, required: true, index: true },
  resolvedAt: Date,
  simulationId: { type: String, index: true }
}, { _id: false });

// Models
const TradeLogModel = mongoose.model<TradeLog & Document>('TradeLog', TradeLogSchema);
const SimulationModel = mongoose.model<Simulation & Document>('Simulation', SimulationSchema);
const BetModel = mongoose.model<Bet & Document>('Bet', BetSchema);
const ParlayModel = mongoose.model<Parlay & Document>('Parlay', ParlaySchema);

export class TradeLoggingService {
  /**
   * Log a trade action to MongoDB
   */
  static async logAction(
    actionType: TradeLog['actionType'],
    details: TradeLog['details'],
    gameId?: string,
    betId?: string,
    simulationId?: string
  ): Promise<void> {
    try {
      await TradeLogModel.create({
        timestamp: new Date(),
        actionType,
        gameId,
        betId,
        simulationId,
        details
      });
    } catch (error) {
      console.error('Error logging trade action:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Create a new simulation record
   */
  static async createSimulation(
    simulationId: string,
    contractLength: number,
    initialBalance: number,
    parlayConfig: ParlayRequest[]
  ): Promise<Simulation> {
    const simulation = await SimulationModel.create({
      _id: simulationId,
      contractLength,
      initialBalance,
      finalBalance: initialBalance, // Will be updated when simulation ends
      totalReturnPct: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      status: 'running',
      startedAt: new Date(),
      parlayConfig
    });

    // Log simulation start
    await this.logAction('simulation_started', {
      description: `Started simulation with ${contractLength} games`,
      amount: 0,
      balanceBefore: initialBalance,
      balanceAfter: initialBalance
    }, undefined, undefined, simulationId);

    return simulation;
  }

  /**
   * Update simulation when it completes
   */
  static async completeSimulation(
    simulationId: string,
    finalBalance: number,
    gamesPlayed: number,
    gamesWon: number
  ): Promise<void> {
    const totalReturnPct = ((finalBalance - 1000) / 1000) * 100; // Assuming 1000 as initial balance
    const winRate = (gamesWon / gamesPlayed) * 100;

    await SimulationModel.updateOne(
      { _id: simulationId },
      {
        finalBalance,
        totalReturnPct,
        gamesPlayed,
        gamesWon,
        winRate,
        status: 'completed',
        completedAt: new Date()
      }
    );

    // Log simulation end
    await this.logAction('simulation_ended', {
      description: `Completed simulation: ${gamesWon}/${gamesPlayed} games won`,
      amount: finalBalance - 1000,
      balanceBefore: 1000,
      balanceAfter: finalBalance
    }, undefined, undefined, simulationId);
  }

  /**
   * Create a bet record
   */
  static async createBet(
    betId: string,
    gameId: string,
    playerId: string,
    stat: 'points' | 'rebounds' | 'assists',
    betType: 'flex' | 'power',
    threshold: number,
    betAmount: number,
    multiplier: number,
    simulationId?: string,
    parlayId?: string
  ): Promise<Bet> {
    const bet = await BetModel.create({
      _id: betId,
      gameId,
      playerId,
      stat,
      betType,
      threshold,
      betAmount,
      multiplier,
      potentialWinnings: betAmount * multiplier,
      status: 'pending',
      createdAt: new Date(),
      simulationId,
      parlayId
    });

    // Log bet placement
    await this.logAction('bet_placed', {
      description: `Placed ${betType} bet on ${stat} for player ${playerId}`,
      amount: betAmount,
      balanceBefore: 0, // Will be updated by caller
      balanceAfter: 0   // Will be updated by caller
    }, gameId, betId, simulationId);

    return bet;
  }

  /**
   * Resolve a bet (update with actual results)
   */
  static async resolveBet(
    betId: string,
    actual: number,
    hit: boolean,
    actualWinnings: number
  ): Promise<void> {
    await BetModel.updateOne(
      { _id: betId },
      {
        actual,
        hit,
        actualWinnings,
        status: hit ? 'won' : 'lost',
        resolvedAt: new Date()
      }
    );

    // Log bet resolution
    await this.logAction('bet_resolved', {
      description: `Bet ${hit ? 'won' : 'lost'}: ${actual} vs threshold`,
      amount: actualWinnings,
      winnings: actualWinnings,
      balanceBefore: 0, // Will be updated by caller
      balanceAfter: 0   // Will be updated by caller
    }, undefined, betId);
  }

  /**
   * Create a parlay record
   */
  static async createParlay(
    parlayId: string,
    gameId: string,
    betIds: string[],
    totalBetAmount: number,
    multiplier: number,
    simulationId?: string
  ): Promise<Parlay> {
    const parlay = await ParlayModel.create({
      _id: parlayId,
      gameId,
      betIds,
      totalBetAmount,
      multiplier,
      potentialWinnings: totalBetAmount * multiplier,
      status: 'pending',
      createdAt: new Date(),
      simulationId
    });

    return parlay;
  }

  /**
   * Resolve a parlay
   */
  static async resolveParlay(
    parlayId: string,
    actualWinnings: number,
    hit: boolean
  ): Promise<void> {
    await ParlayModel.updateOne(
      { _id: parlayId },
      {
        actualWinnings,
        status: hit ? 'won' : 'lost',
        resolvedAt: new Date()
      }
    );
  }

  /**
   * Get recent trade logs
   */
  static async getRecentTradeLogs(limit: number = 50): Promise<TradeLog[]> {
    return await TradeLogModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get simulation history
   */
  static async getSimulationHistory(limit: number = 20): Promise<Simulation[]> {
    return await SimulationModel
      .find()
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get bet history for a specific game
   */
  static async getGameBets(gameId: string): Promise<Bet[]> {
    return await BetModel
      .find({ gameId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get analytics data
   */
  static async getAnalytics(): Promise<{
    totalBets: number;
    totalWinnings: number;
    winRate: number;
    averageReturn: number;
  }> {
    const stats = await BetModel.aggregate([
      { $match: { status: { $in: ['won', 'lost'] } } },
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          totalWinnings: { $sum: '$actualWinnings' },
          wonBets: { $sum: { $cond: ['$hit', 1, 0] } },
          totalWagered: { $sum: '$betAmount' }
        }
      }
    ]);

    if (stats.length === 0) {
      return { totalBets: 0, totalWinnings: 0, winRate: 0, averageReturn: 0 };
    }

    const { totalBets, totalWinnings, wonBets, totalWagered } = stats[0];
    const winRate = (wonBets / totalBets) * 100;
    const averageReturn = totalWagered > 0 ? ((totalWinnings - totalWagered) / totalWagered) * 100 : 0;

    return {
      totalBets,
      totalWinnings,
      winRate,
      averageReturn
    };
  }

  static async getBetsByIds(betIds: string[]): Promise<Bet[]> {
    return BetModel.find({ _id: { $in: betIds } }).lean();
  }

  static async getBalanceHistory(startDate: Date, endDate: Date): Promise<TradeLog[]> {
    return TradeLogModel.find({
      actionType: 'balance_updated',
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 }).lean();
  }
}
