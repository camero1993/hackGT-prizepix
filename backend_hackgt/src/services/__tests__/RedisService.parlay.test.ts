import { RedisService } from '../RedisService';

describe('RedisService - Parlay Management', () => {
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

  describe('Parlay Creation and Management', () => {
    it('should create a parlay with 3 bets', async () => {
      const parlayId = 'test_parlay_1';
      const gameId = 'test_game_1';
      const contractId = 'test_contract_1';
      
      const parlayData = {
        parlayId,
        gameId,
        betIds: ['bet_1', 'bet_2', 'bet_3'],
        betType: 'power',
        totalBetAmount: 300,
        multiplier: 6.0,
        potentialWinnings: 1800,
        status: 'pending',
        createdAt: new Date().toISOString(),
        contractId,
        riskLevel: 'high'
      };

      await redisService.addActiveParlay(parlayId, parlayData);

      const retrievedParlay = await redisService.getParlayData(parlayId);
      expect(retrievedParlay.parlayId).toBe(parlayId);
      expect(retrievedParlay.betType).toBe('power');
      expect(retrievedParlay.riskLevel).toBe('high');
    });

    it('should create a flex parlay', async () => {
      const parlayId = 'test_parlay_flex_1';
      const parlayData = {
        parlayId,
        gameId: 'test_game_1',
        betIds: ['bet_1', 'bet_2', 'bet_3'],
        betType: 'flex',
        totalBetAmount: 150,
        multiplier: 3.0,
        potentialWinnings: 450,
        status: 'pending',
        createdAt: new Date().toISOString(),
        riskLevel: 'medium'
      };

      await redisService.addActiveParlay(parlayId, parlayData);

      const retrievedParlay = await redisService.getParlayData(parlayId);
      expect(retrievedParlay.betType).toBe('flex');
      expect(retrievedParlay.riskLevel).toBe('medium');
    });

    it('should track parlay in active parlays set', async () => {
      const parlayId = 'test_parlay_active_1';
      const parlayData = {
        parlayId,
        gameId: 'test_game_1',
        betIds: ['bet_1', 'bet_2', 'bet_3'],
        betType: 'power',
        totalBetAmount: 300,
        multiplier: 6.0,
        potentialWinnings: 1800,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveParlay(parlayId, parlayData);

      const activeParlays = await redisService.getActiveParlays();
      expect(activeParlays).toContain(parlayId);
    });

    it('should remove parlay from active parlays when resolved', async () => {
      const parlayId = 'test_parlay_remove_1';
      const parlayData = {
        parlayId,
        gameId: 'test_game_1',
        betIds: ['bet_1', 'bet_2', 'bet_3'],
        betType: 'power',
        totalBetAmount: 300,
        multiplier: 6.0,
        potentialWinnings: 1800,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveParlay(parlayId, parlayData);
      expect(await redisService.getActiveParlays()).toContain(parlayId);

      await redisService.removeActiveParlay(parlayId);
      expect(await redisService.getActiveParlays()).not.toContain(parlayId);
    });
  });

  describe('Parlay Resolution', () => {
    it('should update parlay data when resolved', async () => {
      const parlayId = 'test_parlay_resolve_1';
      const parlayData = {
        parlayId,
        gameId: 'test_game_1',
        betIds: ['bet_1', 'bet_2', 'bet_3'],
        betType: 'power',
        totalBetAmount: 300,
        multiplier: 6.0,
        potentialWinnings: 1800,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveParlay(parlayId, parlayData);

      // Update parlay with resolution data
      const resolutionData = {
        actualWinnings: 1800,
        status: 'won',
        resolvedAt: new Date().toISOString()
      };

      await redisService.updateParlayData(parlayId, resolutionData);

      const updatedParlay = await redisService.getParlayData(parlayId);
      expect(updatedParlay.actualWinnings).toBe('1800');
      expect(updatedParlay.status).toBe('won');
      expect(updatedParlay.resolvedAt).toBe(resolutionData.resolvedAt);
    });
  });

  describe('Parlay-Contract Relationship', () => {
    it('should add parlay to contract', async () => {
      const contractId = 'test_contract_1';
      const parlayId = 'test_parlay_contract_1';

      await redisService.addParlayToContract(contractId, parlayId);

      const contractParlays = await redisService.getContractParlays(contractId);
      expect(contractParlays).toContain(parlayId);
    });

    it('should get all parlays for a contract', async () => {
      const contractId = 'test_contract_1';
      const parlay1Id = 'test_parlay_contract_1';
      const parlay2Id = 'test_parlay_contract_2';

      await redisService.addParlayToContract(contractId, parlay1Id);
      await redisService.addParlayToContract(contractId, parlay2Id);

      const contractParlays = await redisService.getContractParlays(contractId);
      expect(contractParlays).toContain(parlay1Id);
      expect(contractParlays).toContain(parlay2Id);
      expect(contractParlays).toHaveLength(2);
    });
  });

  describe('Parlay-Bet Relationship', () => {
    it('should track bets in a parlay', async () => {
      const parlayId = 'test_parlay_bets_1';
      const bet1Id = 'bet_1';
      const bet2Id = 'bet_2';
      const bet3Id = 'bet_3';

      // Create parlay
      const parlayData = {
        parlayId,
        gameId: 'test_game_1',
        betIds: [bet1Id, bet2Id, bet3Id],
        betType: 'power',
        totalBetAmount: 300,
        multiplier: 6.0,
        potentialWinnings: 1800,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveParlay(parlayId, parlayData);

      // Create bets that belong to this parlay
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
        parlayId
      };

      await redisService.addActiveBet(bet1Id, bet1Data);
      await redisService.addActiveBet(bet2Id, bet2Data);
      await redisService.addActiveBet(bet3Id, bet3Data);

      // Get bets for this parlay
      const parlayBets = await redisService.getBetsByParlay(parlayId);
      expect(parlayBets).toContain(bet1Id);
      expect(parlayBets).toContain(bet2Id);
      expect(parlayBets).toContain(bet3Id);
      expect(parlayBets).toHaveLength(3);
    });
  });
});
