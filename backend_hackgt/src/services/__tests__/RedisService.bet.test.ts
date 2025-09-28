import { RedisService } from '../RedisService';

describe('RedisService - Bet Management', () => {
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

  describe('Bet Creation and Management', () => {
    it('should create a bet with power bet type', async () => {
      const betId = 'test_bet_power_1';
      const betData = {
        betId,
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
        contractId: 'test_contract_1',
        parlayId: 'test_parlay_1',
        legPosition: 1
      };

      await redisService.addActiveBet(betId, betData);

      const retrievedBet = await redisService.getBetData(betId);
      expect(retrievedBet).toEqual({
        betId: betData.betId,
        gameId: betData.gameId,
        playerId: betData.playerId,
        stat: betData.stat,
        threshold: betData.threshold.toString(),
        overUnder: betData.overUnder,
        betType: betData.betType,
        betAmount: betData.betAmount.toString(),
        multiplier: betData.multiplier.toString(),
        potentialWinnings: betData.potentialWinnings.toString(),
        status: betData.status,
        createdAt: betData.createdAt,
        contractId: betData.contractId,
        parlayId: betData.parlayId,
        legPosition: betData.legPosition.toString()
      });
    });

    it('should create a bet with flex bet type', async () => {
      const betId = 'test_bet_flex_1';
      const betData = {
        betId,
        gameId: 'test_game_1',
        playerId: '2544',
        stat: 'rebounds',
        threshold: 8.5,
        overUnder: 'under',
        betType: 'flex',
        betAmount: 50,
        multiplier: 1.5,
        potentialWinnings: 75,
        status: 'pending',
        createdAt: new Date().toISOString(),
        contractId: 'test_contract_1',
        parlayId: 'test_parlay_1',
        legPosition: 2
      };

      await redisService.addActiveBet(betId, betData);

      const retrievedBet = await redisService.getBetData(betId);
      expect(retrievedBet.betType).toBe('flex');
      expect(retrievedBet.legPosition).toBe('2');
    });

    it('should track bet in active bets set', async () => {
      const betId = 'test_bet_active_1';
      const betData = {
        betId,
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
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveBet(betId, betData);

      const activeBets = await redisService.getActiveBets();
      expect(activeBets).toContain(betId);
    });

    it('should remove bet from active bets when resolved', async () => {
      const betId = 'test_bet_remove_1';
      const betData = {
        betId,
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
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveBet(betId, betData);
      expect(await redisService.getActiveBets()).toContain(betId);

      await redisService.removeActiveBet(betId);
      expect(await redisService.getActiveBets()).not.toContain(betId);
    });
  });

  describe('Bet Resolution', () => {
    it('should update bet data when resolved', async () => {
      const betId = 'test_bet_resolve_1';
      const betData = {
        betId,
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
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveBet(betId, betData);

      // Update bet with resolution data
      const resolutionData = {
        actual: 28.5,
        hit: true,
        actualWinnings: 200,
        status: 'won',
        resolvedAt: new Date().toISOString()
      };

      await redisService.updateBetData(betId, resolutionData);

      const updatedBet = await redisService.getBetData(betId);
      expect(updatedBet.actual).toBe('28.5');
      expect(updatedBet.hit).toBe('true');
      expect(updatedBet.actualWinnings).toBe('200');
      expect(updatedBet.status).toBe('won');
      expect(updatedBet.resolvedAt).toBe(resolutionData.resolvedAt);
    });
  });

  describe('Bet Indexing', () => {
    it('should be able to query bets by game', async () => {
      const gameId = 'test_game_1';
      const bet1Id = 'test_bet_game_1';
      const bet2Id = 'test_bet_game_2';
      
      const bet1Data = {
        betId: bet1Id,
        gameId,
        playerId: '201939',
        stat: 'points',
        threshold: 25.5,
        overUnder: 'over',
        betType: 'power',
        betAmount: 100,
        multiplier: 2.0,
        potentialWinnings: 200,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const bet2Data = {
        betId: bet2Id,
        gameId,
        playerId: '2544',
        stat: 'rebounds',
        threshold: 8.5,
        overUnder: 'under',
        betType: 'flex',
        betAmount: 50,
        multiplier: 1.5,
        potentialWinnings: 75,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await redisService.addActiveBet(bet1Id, bet1Data);
      await redisService.addActiveBet(bet2Id, bet2Data);

      expect(await redisService.getBetsByGame(gameId)).toContain(bet1Id);
      expect(await redisService.getBetsByGame(gameId)).toContain(bet2Id);
    });
  });
});
