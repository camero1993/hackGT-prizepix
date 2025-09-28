import { RedisService } from '../RedisService';

describe('RedisService - Contract Management', () => {
  let redisService: RedisService;

  beforeAll(async () => {
    redisService = new RedisService();
    await redisService.connect();
    // Clear all demo data before starting tests
    await redisService.clearAllDemoData();
  });

  afterAll(async () => {
    // Clear all demo data after tests
    await redisService.clearAllDemoData();
    await redisService.disconnect();
  });

  beforeEach(async () => {
    // Clear all demo data before each test
    await redisService.clearAllDemoData();
  });

  describe('Contract Creation and Management', () => {
    it('should create a contract with proper risk level', async () => {
      const contractId = 'test_contract_1';
      const userId = 'user_123';
      
      const contractData = {
        contractId,
        userId,
        contractLength: 5,
        riskLevel: 'high',
        parlayConfig: JSON.stringify({
          legs: [
            { playerId: '201939', stat: 'points', overUnder: 'over' },
            { playerId: '2544', stat: 'rebounds', overUnder: 'under' },
            { playerId: '201939', stat: 'assists', overUnder: 'over' }
          ],
          betType: 'power',
          betAmount: 100
        }),
        totalWagered: 0,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 5,
        maxLoss: 500,
        profitTarget: 1000
      };

      await redisService.addActiveContract(contractId, contractData);

      const retrievedContract = await redisService.getContractData(contractId);
      expect(retrievedContract.contractId).toBe(contractId);
      expect(retrievedContract.riskLevel).toBe('high');
      expect(retrievedContract.contractLength).toBe('5');
      expect(retrievedContract.maxLoss).toBe('500');
      expect(retrievedContract.profitTarget).toBe('1000');
    });

    it('should track contract in active contracts set', async () => {
      const contractId = 'test_contract_active_1';
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 3,
        riskLevel: 'medium',
        parlayConfig: '{}',
        totalWagered: 0,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 3
      };

      await redisService.addActiveContract(contractId, contractData);

      const activeContracts = await redisService.getActiveContracts();
      expect(activeContracts).toContain(contractId);
    });

    it('should remove contract from active contracts when completed', async () => {
      const contractId = 'test_contract_remove_1';
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 3,
        riskLevel: 'low',
        parlayConfig: '{}',
        totalWagered: 0,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 3
      };

      await redisService.addActiveContract(contractId, contractData);
      expect(await redisService.getActiveContracts()).toContain(contractId);

      await redisService.removeActiveContract(contractId);
      expect(await redisService.getActiveContracts()).not.toContain(contractId);
    });
  });

  describe('Contract Exit Functionality', () => {
    it('should allow early exit from contract', async () => {
      const contractId = 'test_contract_exit_1';
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 5,
        riskLevel: 'high',
        parlayConfig: '{}',
        totalWagered: 200,
        totalWinnings: 150,
        gamesPlayed: 2,
        gamesWon: 1,
        winRate: 50,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 3,
        maxLoss: 500,
        profitTarget: 1000
      };

      await redisService.addActiveContract(contractId, contractData);

      // Exit the contract
      const exitData = {
        status: 'exited',
        exitedAt: new Date().toISOString(),
        exitReason: 'User decided to take profit',
        exitValue: 150,
        remainingGames: 0
      };

      await redisService.updateContractData(contractId, exitData);

      const updatedContract = await redisService.getContractData(contractId);
      expect(updatedContract.status).toBe('exited');
      expect(updatedContract.exitReason).toBe('User decided to take profit');
      expect(updatedContract.exitValue).toBe('150');
    });

    it('should track exit value and reason', async () => {
      const contractId = 'test_contract_exit_value_1';
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 3,
        riskLevel: 'medium',
        parlayConfig: '{}',
        totalWagered: 300,
        totalWinnings: 200,
        gamesPlayed: 1,
        gamesWon: 1,
        winRate: 100,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 2
      };

      await redisService.addActiveContract(contractId, contractData);

      const exitData = {
        status: 'exited',
        exitedAt: new Date().toISOString(),
        exitReason: 'Risk management - cutting losses',
        exitValue: -100,
        remainingGames: 0
      };

      await redisService.updateContractData(contractId, exitData);

      const updatedContract = await redisService.getContractData(contractId);
      expect(updatedContract.exitValue).toBe('-100');
      expect(updatedContract.exitReason).toBe('Risk management - cutting losses');
    });
  });

  describe('Contract-Parlay Relationship', () => {
    it('should add parlays to contract', async () => {
      const contractId = 'test_contract_parlays_1';
      const parlay1Id = 'parlay_1';
      const parlay2Id = 'parlay_2';

      await redisService.addParlayToContract(contractId, parlay1Id);
      await redisService.addParlayToContract(contractId, parlay2Id);

      const contractParlays = await redisService.getContractParlays(contractId);
      expect(contractParlays).toContain(parlay1Id);
      expect(contractParlays).toContain(parlay2Id);
    });

    it('should get all parlays for a contract', async () => {
      const contractId = 'test_contract_parlays_2';
      const parlay1Id = 'parlay_1';
      const parlay2Id = 'parlay_2';
      const parlay3Id = 'parlay_3';

      await redisService.addParlayToContract(contractId, parlay1Id);
      await redisService.addParlayToContract(contractId, parlay2Id);
      await redisService.addParlayToContract(contractId, parlay3Id);

      const contractParlays = await redisService.getContractParlays(contractId);
      expect(contractParlays).toHaveLength(3);
      expect(contractParlays).toContain(parlay1Id);
      expect(contractParlays).toContain(parlay2Id);
      expect(contractParlays).toContain(parlay3Id);
    });
  });

  describe('Contract-Bet Relationship', () => {
    it('should track bets in a contract', async () => {
      const contractId = 'test_contract_bets_1';
      const parlayId = 'parlay_1';
      const bet1Id = 'bet_1';
      const bet2Id = 'bet_2';
      const bet3Id = 'bet_3';

      // Create contract
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 3,
        riskLevel: 'medium',
        parlayConfig: '{}',
        totalWagered: 0,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 3
      };

      await redisService.addActiveContract(contractId, contractData);

      // Create parlay in contract
      await redisService.addParlayToContract(contractId, parlayId);

      // Create bets that belong to this contract
      const bet1Data = {
        betId: bet1Id,
        gameId: 'test_game_1',
        playerId: '201939',
        stat: 'points',
        threshold: 25.5,
        overUnder: 'over',
        betType: 'power',
        betAmount: 100,
        multiplier: 2.0,
        potentialWinnings: 200,
        status: 'pending',
        createdAt: new Date().toISOString(),
        contractId,
        parlayId
      };

      const bet2Data = {
        betId: bet2Id,
        gameId: 'test_game_1',
        playerId: '2544',
        stat: 'rebounds',
        threshold: 8.5,
        overUnder: 'under',
        betType: 'power',
        betAmount: 100,
        multiplier: 2.0,
        potentialWinnings: 200,
        status: 'pending',
        createdAt: new Date().toISOString(),
        contractId,
        parlayId
      };

      const bet3Data = {
        betId: bet3Id,
        gameId: 'test_game_1',
        playerId: '201939',
        stat: 'assists',
        threshold: 6.5,
        overUnder: 'over',
        betType: 'power',
        betAmount: 100,
        multiplier: 2.0,
        potentialWinnings: 200,
        status: 'pending',
        createdAt: new Date().toISOString(),
        contractId,
        parlayId
      };

      await redisService.addActiveBet(bet1Id, bet1Data);
      await redisService.addActiveBet(bet2Id, bet2Data);
      await redisService.addActiveBet(bet3Id, bet3Data);

      // Get bets for this contract
      const contractBets = await redisService.getBetsByContract(contractId);
      expect(contractBets).toContain(bet1Id);
      expect(contractBets).toContain(bet2Id);
      expect(contractBets).toContain(bet3Id);
      expect(contractBets).toHaveLength(3);
    });
  });

  describe('Contract Status Management', () => {
    it('should update contract status to completed', async () => {
      const contractId = 'test_contract_complete_1';
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 3,
        riskLevel: 'low',
        parlayConfig: '{}',
        totalWagered: 300,
        totalWinnings: 450,
        gamesPlayed: 3,
        gamesWon: 2,
        winRate: 66.67,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 0
      };

      await redisService.addActiveContract(contractId, contractData);

      const completionData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        remainingGames: 0
      };

      await redisService.updateContractData(contractId, completionData);

      const updatedContract = await redisService.getContractData(contractId);
      expect(updatedContract.status).toBe('completed');
      expect(updatedContract.remainingGames).toBe('0');
    });

    it('should update contract status to cancelled', async () => {
      const contractId = 'test_contract_cancel_1';
      const contractData = {
        contractId,
        userId: 'user_123',
        contractLength: 5,
        riskLevel: 'high',
        parlayConfig: '{}',
        totalWagered: 100,
        totalWinnings: 0,
        gamesPlayed: 1,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        remainingGames: 4
      };

      await redisService.addActiveContract(contractId, contractData);

      const cancellationData = {
        status: 'cancelled',
        exitReason: 'User cancelled contract',
        remainingGames: 0
      };

      await redisService.updateContractData(contractId, cancellationData);

      const updatedContract = await redisService.getContractData(contractId);
      expect(updatedContract.status).toBe('cancelled');
      expect(updatedContract.exitReason).toBe('User cancelled contract');
    });
  });
});
