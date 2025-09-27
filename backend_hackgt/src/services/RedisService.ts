import { createClient, RedisClientType } from 'redis';

export interface DemoState {
  balance: number;
  totalBetsPlaced: number;
  totalWinnings: number;
  totalWagered: number;
  activeSimulationId?: string;
  lastUpdated: string;
}

export interface TradeLogEntry {
  timestamp: string;
  action: string;
  amount?: number;
  balanceAfter?: number;
  winnings?: number;
  description: string;
}

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('❌ Redis disconnected');
      this.isConnected = false;
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  // ================================
  // Demo State Management
  // ================================

  /**
   * Initialize demo state
   */
  async initializeDemoState(initialBalance: number = 1000): Promise<void> {
    const state: DemoState = {
      balance: initialBalance,
      totalBetsPlaced: 0,
      totalWinnings: 0,
      totalWagered: 0,
      lastUpdated: new Date().toISOString()
    };

    await this.client.hSet('demo:state', [
      'balance', state.balance.toString(),
      'totalBetsPlaced', state.totalBetsPlaced.toString(),
      'totalWinnings', state.totalWinnings.toString(),
      'totalWagered', state.totalWagered.toString(),
      'lastUpdated', state.lastUpdated
    ]);
  }

  /**
   * Get current demo state
   */
  async getDemoState(): Promise<DemoState | null> {
    try {
      const state = await this.client.hGetAll('demo:state');
      if (!state || Object.keys(state).length === 0) {
        return null;
      }

      return {
        balance: parseFloat(state.balance || '0'),
        totalBetsPlaced: parseInt(state.totalBetsPlaced || '0'),
        totalWinnings: parseFloat(state.totalWinnings || '0'),
        totalWagered: parseFloat(state.totalWagered || '0'),
        activeSimulationId: state.activeSimulationId,
        lastUpdated: state.lastUpdated || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting demo state:', error);
      return null;
    }
  }

  /**
   * Update demo state
   */
  async updateDemoState(updates: Partial<DemoState>): Promise<void> {
    const currentState = await this.getDemoState();
    if (!currentState) {
      throw new Error('Demo state not initialized');
    }

    const newState = {
      ...currentState,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    await this.client.hSet('demo:state', [
      'balance', newState.balance.toString(),
      'totalBetsPlaced', newState.totalBetsPlaced.toString(),
      'totalWinnings', newState.totalWinnings.toString(),
      'totalWagered', newState.totalWagered.toString(),
      'activeSimulationId', newState.activeSimulationId || '',
      'lastUpdated', newState.lastUpdated
    ]);
  }

  /**
   * Update balance
   */
  async updateBalance(newBalance: number): Promise<void> {
    await this.updateDemoState({ balance: newBalance });
  }

  /**
   * Increment balance
   */
  async incrementBalance(amount: number): Promise<number> {
    const currentState = await this.getDemoState();
    if (!currentState) {
      throw new Error('Demo state not initialized');
    }

    const newBalance = currentState.balance + amount;
    await this.updateBalance(newBalance);
    return newBalance;
  }

  // ================================
  // Trade Logs Management
  // ================================

  /**
   * Add trade log entry (recent activity)
   */
  async addTradeLog(entry: TradeLogEntry): Promise<void> {
    const logString = JSON.stringify(entry);
    
    // Add to recent logs (FIFO, max 100 entries)
    await this.client.lPush('demo:trade_logs', logString);
    await this.client.lTrim('demo:trade_logs', 0, 99); // Keep only last 100 entries
  }

  /**
   * Get recent trade logs
   */
  async getRecentTradeLogs(limit: number = 50): Promise<TradeLogEntry[]> {
    try {
      const logs = await this.client.lRange('demo:trade_logs', 0, limit - 1);
      return logs.map(log => JSON.parse(log));
    } catch (error) {
      console.error('Error getting trade logs:', error);
      return [];
    }
  }

  /**
   * Clear all trade logs
   */
  async clearTradeLogs(): Promise<void> {
    await this.client.del('demo:trade_logs');
  }

  // ================================
  // Active Bets Management
  // ================================

  /**
   * Add active bet
   */
  async addActiveBet(betId: string, betData: any): Promise<void> {
    await this.client.sAdd('demo:active_bets', betId);
    const hSetArray = [];
    for (const [key, value] of Object.entries(betData)) {
      hSetArray.push(key, String(value));
    }
    await this.client.hSet(`demo:bet:${betId}`, hSetArray);
  }

  /**
   * Remove active bet
   */
  async removeActiveBet(betId: string): Promise<void> {
    await this.client.sRem('demo:active_bets', betId);
    await this.client.del(`demo:bet:${betId}`);
  }

  /**
   * Get active bets
   */
  async getActiveBets(): Promise<string[]> {
    return await this.client.sMembers('demo:active_bets');
  }

  /**
   * Get bet data
   */
  async getBetData(betId: string): Promise<any> {
    return await this.client.hGetAll(`demo:bet:${betId}`);
  }

  // ================================
  // Balance History Management
  // ================================

  /**
   * Add balance history entry
   */
  async addBalanceHistory(balance: number, timestamp?: number): Promise<void> {
    const ts = timestamp || Date.now();
    await this.client.zAdd('demo:balance_history', {
      score: ts,
      value: balance.toString()
    });

    // Keep only last 1000 entries
    await this.client.zRemRangeByRank('demo:balance_history', 0, -1001);
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(limit: number = 100): Promise<Array<{ timestamp: number; balance: number }>> {
    try {
      const entries = await this.client.zRangeWithScores('demo:balance_history', -limit, -1);
      return entries.map(entry => ({
        timestamp: entry.score,
        balance: parseFloat(entry.value)
      }));
    } catch (error) {
      console.error('Error getting balance history:', error);
      return [];
    }
  }

  // ================================
  // Simulation Management
  // ================================

  /**
   * Set active simulation
   */
  async setActiveSimulation(simulationId: string, simulationData: any): Promise<void> {
    const simData = {
      id: simulationId,
      ...simulationData,
      startedAt: new Date().toISOString()
    };
    
    const hSetArray = [];
    for (const [key, value] of Object.entries(simData)) {
      hSetArray.push(key, String(value));
    }
    
    await this.client.hSet('demo:current_simulation', hSetArray);
    
    await this.updateDemoState({ activeSimulationId: simulationId });
  }

  /**
   * Get active simulation
   */
  async getActiveSimulation(): Promise<any> {
    return await this.client.hGetAll('demo:current_simulation');
  }

  /**
   * Clear active simulation
   */
  async clearActiveSimulation(): Promise<void> {
    await this.client.del('demo:current_simulation');
    await this.updateDemoState({ activeSimulationId: undefined });
  }

  // ================================
  // Utility Methods
  // ================================

  /**
   * Clear all demo data
   */
  async clearAllDemoData(): Promise<void> {
    const keys = await this.client.keys('demo:*');
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  /**
   * Get Redis info
   */
  async getRedisInfo(): Promise<any> {
    return await this.client.info();
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    return await this.client.ping();
  }
}

// Export singleton instance
export const redisService = new RedisService();
