import fs from 'fs';
import path from 'path';

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

export interface BetData {
  betId: string;
  gameId: string;
  playerId: string;
  stat: string;
  threshold: number;
  overUnder: string;
  betType: string;
  betAmount: number;
  multiplier: number;
  potentialWinnings: number;
  actual?: number;
  hit?: boolean;
  actualWinnings?: number;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  parlayId?: string;
  contractId?: string;
  legPosition?: number;
}

export interface ParlayData {
  parlayId: string;
  gameId: string;
  betIds: string[];
  betType: string;
  totalBetAmount: number;
  multiplier: number;
  potentialWinnings: number;
  actualWinnings?: number;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  contractId?: string;
  riskLevel?: string;
  legs?: any[];
}

export interface ContractData {
  contractId: string;
  userId?: string;
  contractLength: number;
  riskLevel?: string;
  parlayConfig: string;
  totalWagered: number;
  totalWinnings: number;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  status: string;
  createdAt: string;
  completedAt?: string;
  exitedAt?: string;
  exitReason?: string;
  remainingGames: number;
  exitValue?: number;
  maxLoss?: number;
  profitTarget?: number;
  parlayIds: string[];
}

export interface JsonStorageData {
  demoState: DemoState;
  activeBets: string[];
  activeParlays: string[];
  activeContracts: string[];
  bets: Record<string, BetData>;
  parlays: Record<string, ParlayData>;
  contracts: Record<string, ContractData>;
  tradeLogs: TradeLogEntry[];
  balanceHistory: Array<{ timestamp: number; balance: number }>;
  activeSimulation?: any;
  indexes: {
    betsByGame: Record<string, string[]>;
    betsByPlayer: Record<string, string[]>;
    betsByParlay: Record<string, string[]>;
    betsByContract: Record<string, string[]>;
    parlaysByGame: Record<string, string[]>;
    parlaysByContract: Record<string, string[]>;
    contractsByUser: Record<string, string[]>;
  };
}

export class JsonStorageService {
  private dataFilePath: string;
  private data: JsonStorageData;

  constructor() {
    this.dataFilePath = path.join(process.cwd(), 'data', 'betting-data.json');
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dataFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadData(): JsonStorageData {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const fileContent = fs.readFileSync(this.dataFilePath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading JSON data:', error);
    }

    // Return default data structure
    return {
      demoState: {
        balance: 1000,
        totalBetsPlaced: 0,
        totalWinnings: 0,
        totalWagered: 0,
        lastUpdated: new Date().toISOString()
      },
      activeBets: [],
      activeParlays: [],
      activeContracts: [],
      bets: {},
      parlays: {},
      contracts: {},
      tradeLogs: [],
      balanceHistory: [],
      indexes: {
        betsByGame: {},
        betsByPlayer: {},
        betsByParlay: {},
        betsByContract: {},
        parlaysByGame: {},
        parlaysByContract: {},
        contractsByUser: {}
      }
    };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving JSON data:', error);
    }
  }

  // ================================
  // Demo State Management
  // ================================

  async initializeDemoState(initialBalance: number = 1000): Promise<void> {
    this.data.demoState = {
      balance: initialBalance,
      totalBetsPlaced: 0,
      totalWinnings: 0,
      totalWagered: 0,
      lastUpdated: new Date().toISOString()
    };
    this.saveData();
  }

  async getDemoState(): Promise<DemoState | null> {
    return this.data.demoState;
  }

  async updateDemoState(updates: Partial<DemoState>): Promise<void> {
    this.data.demoState = {
      ...this.data.demoState,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    this.saveData();
  }

  async updateBalance(newBalance: number): Promise<void> {
    await this.updateDemoState({ balance: newBalance });
  }

  async incrementBalance(amount: number): Promise<number> {
    const newBalance = this.data.demoState.balance + amount;
    await this.updateBalance(newBalance);
    return newBalance;
  }

  // ================================
  // Trade Logs Management
  // ================================

  async addTradeLog(entry: TradeLogEntry): Promise<void> {
    this.data.tradeLogs.unshift(entry);
    // Keep only last 100 entries
    if (this.data.tradeLogs.length > 100) {
      this.data.tradeLogs = this.data.tradeLogs.slice(0, 100);
    }
    this.saveData();
  }

  async getRecentTradeLogs(limit: number = 50): Promise<TradeLogEntry[]> {
    return this.data.tradeLogs.slice(0, limit);
  }

  async clearTradeLogs(): Promise<void> {
    this.data.tradeLogs = [];
    this.saveData();
  }

  // ================================
  // Bet Management
  // ================================

  async addActiveBet(betId: string, betData: any): Promise<void> {
    this.data.activeBets.push(betId);
    this.data.bets[betId] = betData as BetData;

    // Add to indexes
    if (betData.gameId) {
      this.addToIndex('betsByGame', betData.gameId, betId);
    }
    if (betData.playerId) {
      this.addToIndex('betsByPlayer', betData.playerId, betId);
    }
    if (betData.parlayId) {
      this.addToIndex('betsByParlay', betData.parlayId, betId);
    }
    if (betData.contractId) {
      this.addToIndex('betsByContract', betData.contractId, betId);
    }

    this.saveData();
  }

  async removeActiveBet(betId: string): Promise<void> {
    this.data.activeBets = this.data.activeBets.filter(id => id !== betId);
    const betData = this.data.bets[betId];
    if (betData) {
      // Remove from indexes
      if (betData.gameId) {
        this.removeFromIndex('betsByGame', betData.gameId, betId);
      }
      if (betData.playerId) {
        this.removeFromIndex('betsByPlayer', betData.playerId, betId);
      }
      if (betData.parlayId) {
        this.removeFromIndex('betsByParlay', betData.parlayId, betId);
      }
      if (betData.contractId) {
        this.removeFromIndex('betsByContract', betData.contractId, betId);
      }
      delete this.data.bets[betId];
    }
    this.saveData();
  }

  async getActiveBets(): Promise<string[]> {
    return this.data.activeBets;
  }

  async getBetData(betId: string): Promise<any> {
    return this.data.bets[betId] || {};
  }

  async updateBetData(betId: string, updates: any): Promise<void> {
    if (this.data.bets[betId]) {
      this.data.bets[betId] = { ...this.data.bets[betId], ...updates };
      this.saveData();
    }
  }

  // ================================
  // Parlay Management
  // ================================

  async addActiveParlay(parlayId: string, parlayData: any): Promise<void> {
    this.data.activeParlays.push(parlayId);
    this.data.parlays[parlayId] = parlayData as ParlayData;

    // Add to indexes
    if (parlayData.gameId) {
      this.addToIndex('parlaysByGame', parlayData.gameId, parlayId);
    }
    if (parlayData.contractId) {
      this.addToIndex('parlaysByContract', parlayData.contractId, parlayId);
    }

    this.saveData();
  }

  async removeActiveParlay(parlayId: string): Promise<void> {
    this.data.activeParlays = this.data.activeParlays.filter(id => id !== parlayId);
    const parlayData = this.data.parlays[parlayId];
    if (parlayData) {
      // Remove from indexes
      if (parlayData.gameId) {
        this.removeFromIndex('parlaysByGame', parlayData.gameId, parlayId);
      }
      if (parlayData.contractId) {
        this.removeFromIndex('parlaysByContract', parlayData.contractId, parlayId);
      }
      delete this.data.parlays[parlayId];
    }
    this.saveData();
  }

  async getActiveParlays(): Promise<string[]> {
    return this.data.activeParlays;
  }

  async getParlayData(parlayId: string): Promise<any> {
    return this.data.parlays[parlayId] || {};
  }

  async updateParlayData(parlayId: string, updates: any): Promise<void> {
    if (this.data.parlays[parlayId]) {
      this.data.parlays[parlayId] = { ...this.data.parlays[parlayId], ...updates };
      this.saveData();
    }
  }

  // ================================
  // Contract Management
  // ================================

  async addActiveContract(contractId: string, contractData: any): Promise<void> {
    this.data.activeContracts.push(contractId);
    this.data.contracts[contractId] = contractData as ContractData;

    // Add to indexes
    if (contractData.userId) {
      this.addToIndex('contractsByUser', contractData.userId, contractId);
    }

    this.saveData();
  }

  async removeActiveContract(contractId: string): Promise<void> {
    this.data.activeContracts = this.data.activeContracts.filter(id => id !== contractId);
    const contractData = this.data.contracts[contractId];
    if (contractData) {
      // Remove from indexes
      if (contractData.userId) {
        this.removeFromIndex('contractsByUser', contractData.userId, contractId);
      }
      delete this.data.contracts[contractId];
    }
    this.saveData();
  }

  async getActiveContracts(): Promise<string[]> {
    return this.data.activeContracts;
  }

  async getContractData(contractId: string): Promise<any> {
    return this.data.contracts[contractId] || {};
  }

  async updateContractData(contractId: string, updates: any): Promise<void> {
    if (this.data.contracts[contractId]) {
      this.data.contracts[contractId] = { ...this.data.contracts[contractId], ...updates };
      this.saveData();
    }
  }

  // ================================
  // Contract-Parlay Relationships
  // ================================

  async addParlayToContract(contractId: string, parlayId: string): Promise<void> {
    if (!this.data.contracts[contractId]) {
      this.data.contracts[contractId] = {
        contractId,
        contractLength: 3,
        parlayConfig: '{}',
        totalWagered: 0,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 3,
        parlayIds: []
      } as ContractData;
    }
    // Coerce legacy/stringified values to array
    const existing = this.data.contracts[contractId].parlayIds as unknown as any;
    if (!Array.isArray(existing)) {
      this.data.contracts[contractId].parlayIds = [];
    }
    if (!this.data.contracts[contractId].parlayIds.includes(parlayId)) {
      this.data.contracts[contractId].parlayIds.push(parlayId);
    }
    this.saveData();
  }

  async getContractParlays(contractId: string): Promise<string[]> {
    return this.data.contracts[contractId]?.parlayIds || [];
  }

  // ================================
  // Index Management
  // ================================

  private addToIndex(indexName: keyof JsonStorageData['indexes'], key: string, value: string): void {
    if (!this.data.indexes[indexName][key]) {
      this.data.indexes[indexName][key] = [];
    }
    if (!this.data.indexes[indexName][key].includes(value)) {
      this.data.indexes[indexName][key].push(value);
    }
  }

  private removeFromIndex(indexName: keyof JsonStorageData['indexes'], key: string, value: string): void {
    if (this.data.indexes[indexName][key]) {
      this.data.indexes[indexName][key] = this.data.indexes[indexName][key].filter(v => v !== value);
    }
  }

  // ================================
  // Query Methods
  // ================================

  async getBetsByGame(gameId: string): Promise<string[]> {
    return this.data.indexes.betsByGame[gameId] || [];
  }

  async getBetsByPlayer(playerId: string): Promise<string[]> {
    return this.data.indexes.betsByPlayer[playerId] || [];
  }

  async getBetsByParlay(parlayId: string): Promise<string[]> {
    return this.data.indexes.betsByParlay[parlayId] || [];
  }

  async getBetsByContract(contractId: string): Promise<string[]> {
    return this.data.indexes.betsByContract[contractId] || [];
  }

  // ================================
  // Balance History
  // ================================

  async addBalanceHistory(balance: number, timestamp?: number): Promise<void> {
    const ts = timestamp || Date.now();
    this.data.balanceHistory.push({ timestamp: ts, balance });
    
    // Keep only last 1000 entries
    if (this.data.balanceHistory.length > 1000) {
      this.data.balanceHistory = this.data.balanceHistory.slice(-1000);
    }
    this.saveData();
  }

  async getBalanceHistory(limit: number = 100): Promise<Array<{ timestamp: number; balance: number }>> {
    return this.data.balanceHistory.slice(-limit);
  }

  // ================================
  // Simulation Management
  // ================================

  async setActiveSimulation(simulationId: string, simulationData: any): Promise<void> {
    this.data.activeSimulation = {
      id: simulationId,
      ...simulationData,
      startedAt: new Date().toISOString()
    };
    await this.updateDemoState({ activeSimulationId: simulationId });
    this.saveData();
  }

  async getActiveSimulation(): Promise<any> {
    return this.data.activeSimulation || {};
  }

  async clearActiveSimulation(): Promise<void> {
    this.data.activeSimulation = undefined;
    await this.updateDemoState({ activeSimulationId: undefined });
    this.saveData();
  }

  // ================================
  // Utility Methods
  // ================================

  async clearAllDemoData(): Promise<void> {
    this.data = {
      demoState: {
        balance: 1000,
        totalBetsPlaced: 0,
        totalWinnings: 0,
        totalWagered: 0,
        lastUpdated: new Date().toISOString()
      },
      activeBets: [],
      activeParlays: [],
      activeContracts: [],
      bets: {},
      parlays: {},
      contracts: {},
      tradeLogs: [],
      balanceHistory: [],
      indexes: {
        betsByGame: {},
        betsByPlayer: {},
        betsByParlay: {},
        betsByContract: {},
        parlaysByGame: {},
        parlaysByContract: {},
        contractsByUser: {}
      }
    };
    this.saveData();
  }

  isConnected(): boolean {
    return true; // JSON storage is always "connected"
  }

  // ================================
  // Legacy Methods for Compatibility
  // ================================

  async connect(): Promise<void> {
    // No-op for JSON storage
  }

  async disconnect(): Promise<void> {
    // No-op for JSON storage
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  isRedisConnected(): boolean {
    return true;
  }
}

// Export singleton instance
export const jsonStorageService = new JsonStorageService();
