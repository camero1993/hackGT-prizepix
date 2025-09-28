import mongoose, { Document } from 'mongoose';
import { TradeLog, Simulation, Bet, Parlay, ParlayRequest, Contract, StructuredParlayRequest, RedisParlayState, RedisContractState, RedisBetState } from '../types';

// MongoDB Schemas (re-exported from BettingSimulator for organization)
const TradeLogSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, index: true },
  actionType: { 
    type: String, 
    required: true, 
    enum: ['bet_placed', 'bet_resolved', 'simulation_started', 'simulation_ended', 'balance_updated', 'parlay_created', 'contract_created', 'contract_updated', 'contract_cancelled'],
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
  betIds: { 
    type: [String], 
    required: true, 
    validate: {
      validator: function(v: string[]) {
        return v.length === 3;
      },
      message: 'Parlay must contain exactly 3 bets'
    }
  },
  betType: { 
    type: String, 
    required: true, 
    enum: ['flex', 'power'] 
  },
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
  contractId: { type: String, index: true },
  simulationId: { type: String, index: true }
}, { _id: false });

const ContractSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  contractLength: { 
    type: Number, 
    required: true, 
    enum: [3, 5] 
  },
  parlayConfig: {
    legs: [{
      playerId: { type: String, required: true },
      stat: { type: String, required: true, enum: ['points', 'rebounds', 'assists'] },
      overUnder: { type: String, required: true, enum: ['over', 'under'] }
    }],
    betType: { type: String, required: true, enum: ['flex', 'power'] },
    betAmount: { type: Number, required: true }
  },
  totalWagered: { type: Number, required: true },
  totalWinnings: { type: Number, required: true },
  gamesPlayed: { type: Number, required: true },
  gamesWon: { type: Number, required: true },
  winRate: { type: Number, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'completed', 'cancelled', 'exited'],
    index: true 
  },
  createdAt: { type: Date, required: true, index: true },
  completedAt: Date,
  exitedAt: Date,
  exitReason: String,
  simulationId: { type: String, index: true },
  parlayIds: [{ type: String }],
  remainingGames: { type: Number, required: true }
}, { _id: false });

// Models
const TradeLogModel = mongoose.model<TradeLog & Document>('TradeLog', TradeLogSchema);
const SimulationModel = mongoose.model<Simulation & Document>('Simulation', SimulationSchema);
const BetModel = mongoose.model<Bet & Document>('Bet', BetSchema);
const ParlayModel = mongoose.model<Parlay & Document>('Parlay', ParlaySchema);
const ContractModel = mongoose.model<Contract & Document>('Contract', ContractSchema);

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
    threshold: number,
    overUnder: 'over' | 'under',
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
      threshold,
      overUnder,
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
      description: `Placed bet on ${stat} for player ${playerId}`,
      amount: betAmount,
      balanceBefore: 0, // Will be updated by caller
      balanceAfter: 0   // Will be updated by caller
    }, gameId, betId, simulationId);

    return bet;
  }

  /**
   * Create a parlay record
   */
  static async createParlay(
    parlayId: string,
    gameId: string,
    betIds: string[],
    betType: 'flex' | 'power',
    totalBetAmount: number,
    multiplier: number,
    simulationId?: string
  ): Promise<Parlay> {
    const parlay = await ParlayModel.create({
      _id: parlayId,
      gameId,
      betIds,
      betType,
      totalBetAmount,
      multiplier,
      potentialWinnings: totalBetAmount * multiplier,
      status: 'pending',
      createdAt: new Date(),
      simulationId
    });

    // Log parlay creation
    await this.logAction('parlay_created', {
      description: `Created ${betType} parlay with ${betIds.length} bets`,
      amount: totalBetAmount,
      balanceBefore: 0, // Will be updated by caller
      balanceAfter: 0   // Will be updated by caller
    }, gameId, parlayId, simulationId);

    return parlay;
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
   * Update a parlay
   */
  static async updateParlay(
    parlayId: string,
    updates: Partial<Parlay>
  ): Promise<void> {
    await ParlayModel.updateOne(
      { _id: parlayId },
      { $set: updates }
    );
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
  static async getGameBets(gameId: string): Promise<(Bet & { betType?: 'flex' | 'power' })[]> {
    const bets = await BetModel
      .find({ gameId })
      .sort({ createdAt: -1 })
      .lean();

    // For each bet, if it has a parlayId, get the parlay's betType
    const betsWithBetType = await Promise.all(
      bets.map(async (bet) => {
        if (bet.parlayId) {
          const parlay = await ParlayModel.findById(bet.parlayId).lean();
          return { ...bet, betType: parlay?.betType };
        }
        return bet;
      })
    );

    return betsWithBetType;
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

  /**
   * Create a new contract
   */
  static async createContract(
    contractId: string,
    contractLength: 3 | 5,
    parlayConfig: StructuredParlayRequest,
    simulationId?: string
  ): Promise<Contract> {
    const contract = await ContractModel.create({
      _id: contractId,
      contractLength,
      parlayConfig,
      totalWagered: 0,
      totalWinnings: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      status: 'active',
      createdAt: new Date(),
      parlayIds: [],
      remainingGames: contractLength,
      simulationId
    });

    // Log contract creation
    await this.logAction('contract_created', {
      description: `Created ${contractLength}-game contract with ${parlayConfig.legs.length} parlay legs`,
      amount: parlayConfig.betAmount,
      balanceBefore: 0,
      balanceAfter: 0,
      metadata: { contractId, contractLength, parlayCount: parlayConfig.legs.length }
    });

    return contract;
  }

  /**
   * Update contract with game results
   */
  static async updateContract(
    contractId: string,
    updates: Partial<Contract>
  ): Promise<Contract | null> {
    await ContractModel.updateOne(
      { _id: contractId },
      { $set: updates }
    );
    
    const updatedContract = await ContractModel.findById(contractId);

    // Log contract update
    if (updatedContract) {
      await this.logAction('contract_updated', {
        description: `Contract ${contractId} updated: ${updatedContract.gamesWon}/${updatedContract.gamesPlayed} games won`,
        amount: updatedContract.totalWinnings,
        balanceBefore: 0,
        balanceAfter: 0,
        metadata: { 
          contractId, 
          gamesWon: updatedContract.gamesWon, 
          gamesPlayed: updatedContract.gamesPlayed,
          winRate: updatedContract.winRate 
        }
      });
    }

    return updatedContract;
  }

  /**
   * Get contract by ID
   */
  static async getContract(contractId: string): Promise<Contract | null> {
    return ContractModel.findById(contractId).lean();
  }

  /**
   * Get all active contracts
   */
  static async getActiveContracts(): Promise<Contract[]> {
    return ContractModel.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Cancel a contract
   */
  static async cancelContract(contractId: string): Promise<Contract | null> {
    const contract = await ContractModel.findById(contractId);
    if (!contract) return null;

    contract.status = 'cancelled';
    contract.completedAt = new Date();
    await contract.save();

    // Log contract cancellation
    await this.logAction('contract_cancelled', {
      description: `Contract ${contractId} cancelled after ${contract.gamesPlayed}/${contract.contractLength} games`,
      amount: 0,
      balanceBefore: 0,
      balanceAfter: 0,
      metadata: { contractId, gamesPlayed: contract.gamesPlayed }
    });

    return contract;
  }

  /**
   * Cash out from a contract (early exit with current winnings/losses)
   */
  static async cashOutContract(
    contractId: string, 
    exitReason?: string
  ): Promise<Contract | null> {
    const contract = await ContractModel.findById(contractId);
    if (!contract || contract.status !== 'active') {
      return null;
    }

    // Update contract status to exited
    contract.status = 'exited';
    contract.exitedAt = new Date();
    contract.exitReason = exitReason || 'User requested cash out';
    contract.remainingGames = 0; // No more games to play

    // Calculate final win rate based on games played
    const finalWinRate = contract.gamesPlayed > 0 
      ? (contract.gamesWon / contract.gamesPlayed) * 100 
      : 0;
    contract.winRate = finalWinRate;

    await contract.save();

    // Log contract cash out
    await this.logAction('contract_updated', {
      description: `Cashed out from contract ${contractId}. Final: ${contract.gamesWon}/${contract.gamesPlayed} games won (${finalWinRate.toFixed(1)}% win rate). Total winnings: $${contract.totalWinnings.toFixed(2)}`,
      amount: contract.totalWinnings,
      winnings: contract.totalWinnings - contract.totalWagered,
      metadata: { 
        contractId, 
        gamesPlayed: contract.gamesPlayed,
        gamesWon: contract.gamesWon,
        winRate: finalWinRate,
        totalWagered: contract.totalWagered,
        totalWinnings: contract.totalWinnings,
        exitReason: exitReason || 'User requested cash out'
      }
    });

    return contract;
  }

  /**
   * Get contract cash out summary (what user would get if they cash out now)
   */
  static async getContractCashOutSummary(contractId: string): Promise<{
    contractId: string;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalWagered: number;
    totalWinnings: number;
    netProfit: number;
    remainingGames: number;
    potentialAdditionalWinnings: number;
  } | null> {
    const contract = await ContractModel.findById(contractId).lean();
    
    if (!contract || contract.status !== 'active') {
      return null;
    }

    const netProfit = contract.totalWinnings - contract.totalWagered;
    const winRate = contract.gamesPlayed > 0 
      ? (contract.gamesWon / contract.gamesPlayed) * 100 
      : 0;

    // Calculate potential additional winnings if contract continues
    const potentialAdditionalWinnings = contract.remainingGames * contract.parlayConfig.betAmount * 1.0; // Assuming 1.0 multiplier

    return {
      contractId: contract._id,
      gamesPlayed: contract.gamesPlayed,
      gamesWon: contract.gamesWon,
      winRate,
      totalWagered: contract.totalWagered,
      totalWinnings: contract.totalWinnings,
      netProfit,
      remainingGames: contract.remainingGames,
      potentialAdditionalWinnings
    };
  }
}
