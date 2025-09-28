import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, connectToDatabase, disconnectFromDatabase, checkDatabaseHealth } from './config';
import { BettingSimulator } from './services/BettingSimulator';
import { TradeLoggingService } from './services/TradeLoggingService';
import { redisService } from './services/RedisService';
import {
  PlayerResponse,
  TeamResponse,
  GameResponse,
  SimulationRequest,
  SimulationResponse,
  PlayerThresholdResponse,
  HealthCheckResponse,
  ApiResponse,
  SimulationRequestSchema,
  PlayerQuerySchema,
  GameQuerySchema,
  TimeState,
  TimeAdvanceRequest,
  TimeSetRequest,
  TradeLog,
  Simulation,
  Bet,
  Parlay
} from './types';
import { simulatedTimeService } from './services/SimulatedTimeService';
import { pythonAPIManager } from './services/PythonAPIManager';
import mongoose from 'mongoose';

// Initialize Express app
const app = express();

// Initialize BettingSimulator
const bettingSimulator = new BettingSimulator(1000.0);

// ================================
// Middleware
// ================================

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ================================
// Helper Functions
// ================================

const handleAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const convertPlayerToResponse = (player: any): PlayerResponse => ({
  id: player._id,
  fullName: player.fullName || 'Unknown',
  headshotUrl: player.headshotUrl,
  position: player.position,
  teamId: player.currentTeamId,
  active: player.active !== false
});

const convertTeamToResponse = (team: any): TeamResponse => ({
  id: team._id,
  name: team.name || 'Unknown',
  tricode: team.tricode || 'UNK',
  city: team.city || 'Unknown',
  logoUrl: team.logoUrl
});

const convertGameToResponse = (game: any): GameResponse => ({
  id: game._id,
  season: game.season || 'Unknown',
  seasonType: game.seasonType || 'Unknown',
  gameDateUTC: game.gameDateUTC.toISOString(),
  homeTeamId: game.homeTeamId,
  awayTeamId: game.awayTeamId,
  homeScore: game.homeScore || 0,
  awayScore: game.awayScore || 0,
  status: game.status,
  venue: game.venue || 'Unknown'
});

// ================================
// API Routes
// ================================

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    message: 'Welcome to NBA Betting Simulator API 🏀',
    data: {
      version: '1.0.0',
      endpoints: {
        players: '/players (filtered to 10 star players only)',
        teams: '/teams',
        games: '/games',
        simulate: '/simulate',
        player_thresholds: '/player/:playerId/thresholds',
        health: '/health',
        time_management: {
          get_time: '/time',
          set_time: '/time/set',
          advance_time: '/time/advance',
          reset_time: '/time/reset',
          time_filtered_games: '/games/time-filtered',
          future_games: '/games/future'
        },
        frontend_apis: {
          demo_state: '/api/demo/state',
          trade_logs: '/api/demo/trade-logs',
          active_bets: '/api/demo/active-bets',
          balance_history: '/api/demo/balance-history',
          active_simulation: '/api/demo/active-simulation',
          recent_trades: '/api/trades/recent',
          simulation_history: '/api/simulations/history',
          game_bets: '/api/bets/game/:gameId',
          analytics: '/api/analytics',
          bet_holdings: '/api/bets/holdings',
          initialize_demo: '/api/demo/initialize',
          clear_demo: '/api/demo/clear'

        },
        python_news_api: {
          status: '/api/python/status',
          start: '/api/python/start',
          stop: '/api/python/stop',
          test: '/api/python/test',
          base_url: 'http://localhost:5001',
          endpoints: {
            health: 'http://localhost:5001/health',
            headlines: 'http://localhost:5001/api/headlines',
            search_player: 'http://localhost:5001/api/search/player',
            search_nba_athletes: 'http://localhost:5001/api/search/nba-athletes',
            search_multiple_players: 'http://localhost:5001/api/search/multiple-players'
          }


        }
      }
    }
  };
  res.json(response);
});

// Health check endpoint
app.get('/health', handleAsync(async (req: Request, res: Response) => {
  try {
    const healthData = await checkDatabaseHealth();
    const response: HealthCheckResponse = {
      status: 'healthy',
      database: 'connected',
      data: healthData.data
    };
    res.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Service unavailable'
    });
  }
}));

// Debug endpoint to check actual players and seasons
app.get('/debug/players', async (req, res) => {
  try {
    // Get actual players from database
    const players = await mongoose.connection.db?.collection('players')
      .find({ active: true })
      .limit(100)
      .project({ _id: 1, fullName: 1 })
      .toArray();
    
    // Get sample stats to check seasons
    const stats = await mongoose.connection.db?.collection('playerGameStats')
      .find({})
      .limit(10)
      .project({ playerId: 1, season: 1, gameDateUTC: 1 })
      .toArray();
    
    // Get distinct seasons
    const seasons = await mongoose.connection.db?.collection('playerGameStats')
      .distinct('season');
    
    res.json({
      samplePlayers: players || [],
      sampleStats: stats || [],
      availableSeasons: seasons || [],
      totalPlayers: players?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Debug endpoint to test player loading
app.get('/debug/player-loading', async (req, res) => {
  try {
    const playerThresholds = bettingSimulator.getPlayerThresholds();
    const loadedPlayerIds = Object.keys(playerThresholds);
    
    // Get total active players count
    const totalActivePlayers = await mongoose.connection.db?.collection('players')
      .countDocuments({ active: true });
    
    // Test query for one player - get more games to find valid data
    const testQuery = await mongoose.connection.db?.collection('playerGameStats')
      .find({ 
        playerId: '201939', // Stephen Curry
        season: '2024-25',
        gameDateUTC: { 
          $gte: new Date('2024-10-01'),
          $lt: new Date()
        }
      })
      .sort({ gameDateUTC: -1 })
      .limit(20)
      .toArray();
    
    // Count valid games
    const validGames = (testQuery || []).filter(stat => 
      stat.points > 0 || stat.rebounds > 0 || stat.assists > 0
    );
    
    res.json({
      loadedPlayers: loadedPlayerIds.length,
      totalActivePlayers: totalActivePlayers || 0,
      coveragePercentage: totalActivePlayers ? ((loadedPlayerIds.length / totalActivePlayers) * 100).toFixed(1) : '0',
      playerThresholds: playerThresholds,
      testQuery: (testQuery || []).slice(0, 5), // Show first 5 for brevity
      testQueryCount: (testQuery || []).length,
      validGamesCount: validGames.length,
      validGames: validGames.slice(0, 3) // Show first 3 valid games
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get players endpoint - now uses loaded player data
app.get('/players', handleAsync(async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const queryValidation = PlayerQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: queryValidation.error.errors
      });
      return;
    }

    const { search, active_only, limit } = queryValidation.data;
    
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Define the 10 star players with betting data
    const STAR_PLAYER_IDS = [
      '1628983', // Shai Gilgeous-Alexander
      '1630169', // Tyrese Haliburton
      '203999', // Nikola Jokić
      '1628369', // Jayson Tatum
      '201939', // Stephen Curry
      '1628378', // Donovan Mitchell
      '2544', // LeBron James
      '1626164', // Devin Booker
      '203507', // Giannis Antetokounmpo
      '203954' // Joel Embiid
    ];
    
    // Build query for players collection - only include star players
    let query: any = { 
      _id: { $in: STAR_PLAYER_IDS } // Only the 10 star players
    };
    
    if (active_only) {
      query.active = true;
    }
    
    // Add search filter if provided (searches within the 10 star players only)
    // Matches search term at the beginning of first name OR last name
    if (search) {
      // Escape special regex characters
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match either at start of full name OR after a space (last name)
      query.fullName = { $regex: `(^${escapedSearch}|\\s${escapedSearch})`, $options: 'i' };
    }
    
    // Fetch players from database
    const players = await mongoose.connection.db.collection('players')
      .find(query, {
        projection: {
          _id: 1,
          fullName: 1,
          headshotUrl: 1,
          position: 1,
          currentTeamId: 1,
          active: 1
        }
      })
      .limit(limit)
      .toArray();

    const response: PlayerResponse[] = players.map(convertPlayerToResponse);
    res.json(response);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
}));

// Get teams endpoint
app.get('/teams', handleAsync(async (req: Request, res: Response) => {
  try {
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Fetch teams
    const teams = await mongoose.connection.db.collection('teams')
      .find({}, {
        projection: {
          _id: 1,
          name: 1,
          tricode: 1,
          city: 1,
          logoUrl: 1
        }
      })
      .toArray();

    const response: TeamResponse[] = teams.map(convertTeamToResponse);
    res.json(response);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}));

// Get specific team endpoint
app.get('/teams/:teamId', handleAsync(async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Fetch specific team
    const team = await mongoose.connection.db.collection('teams')
      .findOne({ _id: teamId as any }, {
        projection: {
          _id: 1,
          name: 1,
          tricode: 1,
          city: 1,
          logoUrl: 1
        }
      });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    const response: TeamResponse = convertTeamToResponse(team);
    res.json(response);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
}));

// Get games endpoint
app.get('/games', handleAsync(async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const queryValidation = GameQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: queryValidation.error.errors
      });
      return;
    }

    const { limit } = queryValidation.data;
    
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Fetch games
    const games = await mongoose.connection.db?.collection('games')
      .find({}, {
        projection: {
          _id: 1,
          season: 1,
          seasonType: 1,
          gameDateUTC: 1,
          homeTeamId: 1,
          awayTeamId: 1,
          homeScore: 1,
          awayScore: 1,
          status: 1,
          venue: 1
        }
      })
      .sort({ gameDateUTC: -1 })
      .limit(limit)
      .toArray();

    const response: GameResponse[] = games.map(convertGameToResponse);
    res.json(response);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
}));

// Get player thresholds endpoint
app.get('/player/:playerId/thresholds', handleAsync(async (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    
    // Ensure expected values are loaded
    if (!bettingSimulator.areThresholdsLoaded()) {
      console.log('Loading player expected values...');
      await bettingSimulator.loadStarPlayers();
    }
    
    // Get player info
    const playerInfo = await bettingSimulator.getPlayerInfo(playerId);
    
    if ('error' in playerInfo) {
      res.status(404).json({ error: `Player ${playerId} not found or no expected value data available` });
      return;
    }
    
    const response: PlayerThresholdResponse = {
      playerId,
      expected_values: playerInfo.expected_values,
      games_analyzed: playerInfo.games_analyzed
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching player thresholds:', error);
    res.status(500).json({ error: 'Failed to fetch player thresholds' });
  }
}));

// Simulation endpoint
app.post('/simulate', handleAsync(async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = SimulationRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors
      });
      return;
    }

    const request: SimulationRequest = validation.data;
    console.log(`Starting simulation: ${request.contract_length} games, ${request.parlays.length} parlay legs`);
    
    // Ensure expected values are loaded
    if (!bettingSimulator.areThresholdsLoaded()) {
      console.log('Loading player expected values...');
      await bettingSimulator.loadStarPlayers();
    }
    
    // Run simulation
    const result = await bettingSimulator.simulateContract(
      request.contract_length,
      request.parlays,
      request.betType
    );
    
    const response: SimulationResponse = result;
    console.log(`Simulation completed: ${response.total_return_pct.toFixed(1)}% return`);
    
    res.json(response);
  } catch (error) {
    console.error('Simulation failed:', error);
    res.status(500).json({ error: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
  }
}));

// Example simulation endpoint
app.get('/simulate/example', handleAsync(async (req: Request, res: Response) => {
  try {
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Get some sample players
    const samplePlayers = await mongoose.connection.db.collection('players')
      .find({}, { projection: { _id: 1 } })
      .limit(3)
      .toArray();
    
    if (samplePlayers.length < 2) {
      res.json({
        error: 'Not enough players in database for example',
        note: 'Please ensure the database has player data'
      });
      return;
    }
    
    const response = {
      example_request: {
        contract_length: 3,
        betType: 'flex',
        parlays: [
          { playerId: samplePlayers[0]._id, stat: 'points' },
          { playerId: samplePlayers[1]._id, stat: 'rebounds' }
        ]
      },
      description: 'POST this JSON to /simulate to run a sample simulation',
      available_stats: ['points', 'rebounds', 'assists'],
      bet_types: {
        flex: 'Partial payouts for partial hits (2/3 = 1.5x, 3/3 = 3x)',
        power: 'All-or-nothing with exponential payouts (2^legs)'
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error generating example:', error);
    res.json({
      example_request: {
        contract_length: 3,
        betType: 'flex',
        parlays: [
          { playerId: 'sample_player_id', stat: 'points' },
          { playerId: 'another_player_id', stat: 'rebounds' }
        ]
      },
      note: 'Replace player IDs with actual values from /players endpoint',
      bet_types: {
        flex: 'Partial payouts for partial hits (2/3 = 1.5x, 3/3 = 3x)',
        power: 'All-or-nothing with exponential payouts (2^legs)'
      }
    });
  }
}));

// ================================
// Time Management Endpoints
// ================================

// Get current time state
app.get('/time', handleAsync(async (req: Request, res: Response) => {
  try {
    const timeState = simulatedTimeService.getTimeState();
    const response: TimeState = {
      currentTime: timeState.currentTime.toISOString(),
      isSimulationMode: timeState.isSimulationMode
    };
    res.json(response);
  } catch (error) {
    console.error('Error getting time state:', error);
    res.status(500).json({ error: 'Failed to get time state' });
  }
}));

// Set simulated time
app.post('/time/set', handleAsync(async (req: Request, res: Response) => {
  try {
    const { time } = req.body as TimeSetRequest;
    
    if (!time) {
      res.status(400).json({ error: 'Time is required' });
      return;
    }
    
    const newTime = new Date(time);
    if (isNaN(newTime.getTime())) {
      res.status(400).json({ error: 'Invalid time format. Use ISO string format.' });
      return;
    }
    
    simulatedTimeService.setCurrentTime(newTime);
    
    const response: TimeState = {
      currentTime: simulatedTimeService.getFormattedTime(),
      isSimulationMode: simulatedTimeService.isInSimulationMode()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error setting time:', error);
    res.status(500).json({ error: 'Failed to set time' });
  }
}));

// Advance simulated time
app.post('/time/advance', handleAsync(async (req: Request, res: Response) => {
  try {
    const { duration, unit = 'milliseconds' } = req.body as TimeAdvanceRequest;
    
    if (!duration || duration <= 0) {
      res.status(400).json({ error: 'Duration must be a positive number' });
      return;
    }
    
    let durationMs = duration;
    
    // Convert to milliseconds based on unit
    switch (unit) {
      case 'seconds':
        durationMs = duration * 1000;
        break;
      case 'minutes':
        durationMs = duration * 60 * 1000;
        break;
      case 'hours':
        durationMs = duration * 60 * 60 * 1000;
        break;
      case 'days':
        durationMs = duration * 24 * 60 * 60 * 1000;
        break;
      case 'milliseconds':
      default:
        durationMs = duration;
        break;
    }
    
    simulatedTimeService.advanceTime(durationMs);
    
    const response: TimeState = {
      currentTime: simulatedTimeService.getFormattedTime(),
      isSimulationMode: simulatedTimeService.isInSimulationMode()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error advancing time:', error);
    res.status(500).json({ error: 'Failed to advance time' });
  }
}));

// Reset to real time
app.post('/time/reset', handleAsync(async (req: Request, res: Response) => {
  try {
    simulatedTimeService.resetToRealTime();
    
    const response: TimeState = {
      currentTime: simulatedTimeService.getFormattedTime(),
      isSimulationMode: simulatedTimeService.isInSimulationMode()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error resetting time:', error);
    res.status(500).json({ error: 'Failed to reset time' });
  }
}));

// Get games filtered by time
app.get('/games/time-filtered', handleAsync(async (req: Request, res: Response) => {
  try {
    const { pastGames, futureGames } = await bettingSimulator.getGamesByTime();
    
    const response = {
      currentTime: simulatedTimeService.getFormattedTime(),
      isSimulationMode: simulatedTimeService.isInSimulationMode(),
      pastGames: pastGames.map(convertGameToResponse),
      futureGames: futureGames.map(convertGameToResponse),
      counts: {
        pastGames: pastGames.length,
        futureGames: futureGames.length
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting time-filtered games:', error);
    res.status(500).json({ error: 'Failed to get time-filtered games' });
  }
}));

// Get future games (unknown to system)
app.get('/games/future', handleAsync(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const futureGames = await bettingSimulator.getFutureGames(limit);
    
    const response = {
      currentTime: simulatedTimeService.getFormattedTime(),
      isSimulationMode: simulatedTimeService.isInSimulationMode(),
      futureGames: futureGames.map(convertGameToResponse),
      count: futureGames.length
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting future games:', error);
    res.status(500).json({ error: 'Failed to get future games' });
  }
}));

// ================================
// Frontend API Endpoints
// ================================

// Get current demo state from Redis
app.get('/api/demo/state', handleAsync(async (req: Request, res: Response) => {
  try {
    await redisService.connect();
    const demoState = await redisService.getDemoState();
    
    if (!demoState) {
      res.status(404).json({ error: 'Demo state not initialized' });
      return;
    }
    
    res.json(demoState);
  } catch (error) {
    console.error('Error fetching demo state:', error);
    res.status(500).json({ error: 'Failed to fetch demo state' });
  }
}));

// Get recent trade logs from Redis
app.get('/api/demo/trade-logs', handleAsync(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    await redisService.connect();
    const tradeLogs = await redisService.getRecentTradeLogs(limit);
    
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching trade logs:', error);
    res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
}));

// Get active bets from Redis
app.get('/api/demo/active-bets', handleAsync(async (req: Request, res: Response) => {
  try {
    await redisService.connect();
    const activeBetIds = await redisService.getActiveBets();
    const activeBets = [];
    
    for (const betId of activeBetIds) {
      const betDetails = await redisService.getBetData(betId);
      if (betDetails) {
        activeBets.push({
          _id: betId,
          ...betDetails
        });
      }
    }
    
    res.json(activeBets);
  } catch (error) {
    console.error('Error fetching active bets:', error);
    res.status(500).json({ error: 'Failed to fetch active bets' });
  }
}));

// Get balance history from Redis
app.get('/api/demo/balance-history', handleAsync(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    await redisService.connect();
    const balanceHistory = await redisService.getBalanceHistory(limit);
    
    res.json(balanceHistory);
  } catch (error) {
    console.error('Error fetching balance history:', error);
    res.status(500).json({ error: 'Failed to fetch balance history' });
  }
}));

// Get active simulation from Redis
app.get('/api/demo/active-simulation', handleAsync(async (req: Request, res: Response) => {
  try {
    await redisService.connect();
    const activeSimulation = await redisService.getActiveSimulation();
    
    if (!activeSimulation) {
      res.status(404).json({ error: 'No active simulation' });
      return;
    }
    
    res.json(activeSimulation);
  } catch (error) {
    console.error('Error fetching active simulation:', error);
    res.status(500).json({ error: 'Failed to fetch active simulation' });
  }
}));

// Get recent trade logs from MongoDB
app.get('/api/trades/recent', handleAsync(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const tradeLogs = await TradeLoggingService.getRecentTradeLogs(limit);
    
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    res.status(500).json({ error: 'Failed to fetch recent trades' });
  }
}));

// Get simulation history from MongoDB
app.get('/api/simulations/history', handleAsync(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const simulations = await TradeLoggingService.getSimulationHistory(limit);
    
    res.json(simulations);
  } catch (error) {
    console.error('Error fetching simulation history:', error);
    res.status(500).json({ error: 'Failed to fetch simulation history' });
  }
}));

// Get bets for a specific game from MongoDB
app.get('/api/bets/game/:gameId', handleAsync(async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const bets = await TradeLoggingService.getGameBets(gameId);
    
    res.json(bets);
  } catch (error) {
    console.error('Error fetching game bets:', error);
    res.status(500).json({ error: 'Failed to fetch game bets' });
  }
}));

// Get analytics from MongoDB
app.get('/api/analytics', handleAsync(async (req: Request, res: Response) => {
  try {
    const analytics = await TradeLoggingService.getAnalytics();
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}));

// Get balance history from MongoDB (for longer periods)
app.get('/api/balance/history', handleAsync(async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    const balanceHistory = await TradeLoggingService.getBalanceHistory(startDate, endDate);
    
    res.json(balanceHistory);
  } catch (error) {
    console.error('Error fetching balance history:', error);
    res.status(500).json({ error: 'Failed to fetch balance history' });
  }
}));


// Get all bet holdings (recent bets from MongoDB) with player data

app.get('/api/bets/holdings', handleAsync(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string; // Optional filter by status
    

    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Build match stage for status filter
    const matchStage: any = {};
    if (status) {
      matchStage.status = status;
    }
    
    // Use MongoDB aggregation to join bet data with player data
    const pipeline = [
      // Match bets (with optional status filter)
      { $match: matchStage },
      
      // Sort by creation date (most recent first)
      { $sort: { createdAt: -1 } },
      
      // Limit results
      { $limit: limit },
      
      // Lookup player information
      {
        $lookup: {
          from: 'players',
          localField: 'playerId',
          foreignField: '_id',
          as: 'player'
        }
      },
      
      // Unwind player array (should be single player)
      { $unwind: { path: '$player', preserveNullAndEmptyArrays: true } },
      
      // Project final structure with player data
      {
        $project: {
          _id: 1,
          gameId: 1,
          playerId: 1,
          stat: 1,
          threshold: 1,
          actual: 1,
          hit: 1,
          betAmount: 1,
          multiplier: 1,
          potentialWinnings: 1,
          actualWinnings: 1,
          status: 1,
          createdAt: 1,
          resolvedAt: 1,
          parlayId: 1,
          simulationId: 1,
          __v: 1,
          // Player data
          playerName: '$player.fullName',
          playerHeadshot: '$player.headshotUrl',
          playerPosition: '$player.position',
          playerTeamId: '$player.currentTeamId'
        }
      }
    ];
    
    // Execute aggregation
    const enrichedBets = await mongoose.connection.db.collection('bets')
      .aggregate(pipeline)
      .toArray();
    
    res.json(enrichedBets);
    
  } catch (error) {
    console.error('Error fetching bet holdings:', error);
    res.status(500).json({ error: 'Failed to fetch bet holdings' });
  }
}));

// Initialize demo state (for testing)
app.post('/api/demo/initialize', handleAsync(async (req: Request, res: Response) => {
  try {
    const { initialBalance = 1000 } = req.body;
    await redisService.connect();
    await redisService.initializeDemoState(initialBalance);
    
    res.json({ message: 'Demo state initialized', initialBalance });
  } catch (error) {
    console.error('Error initializing demo state:', error);
    res.status(500).json({ error: 'Failed to initialize demo state' });
  }
}));

// Clear all demo data (for testing)
app.post('/api/demo/clear', handleAsync(async (req: Request, res: Response) => {
  try {
    await redisService.connect();
    await redisService.clearAllDemoData();
    
    res.json({ message: 'Demo data cleared' });
  } catch (error) {
    console.error('Error clearing demo data:', error);
    res.status(500).json({ error: 'Failed to clear demo data' });
  }
}));


// Clear all bet holdings from MongoDB (for testing)
app.post('/api/bets/clear', handleAsync(async (req: Request, res: Response) => {
  try {
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Get count before deletion
    const countBefore = await mongoose.connection.db.collection('bets').countDocuments();
    
    // Delete all bet holdings
    const deleteResult = await mongoose.connection.db.collection('bets').deleteMany({});
    
    res.json({ 
      message: 'Bet holdings cleared from MongoDB',
      deletedCount: deleteResult.deletedCount,
      countBefore: countBefore
    });
  } catch (error) {
    console.error('Error clearing bet holdings:', error);
    res.status(500).json({ error: 'Failed to clear bet holdings' });
  }
}));

// ================================
// Python API Management Endpoints
// ================================

// Get Python API status
app.get('/api/python/status', handleAsync(async (req: Request, res: Response) => {
  try {
    const status = await pythonAPIManager.getPythonAPIStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting Python API status:', error);
    res.status(500).json({ error: 'Failed to get Python API status' });
  }
}));

// Start Python API
app.post('/api/python/start', handleAsync(async (req: Request, res: Response) => {
  try {
    const success = await pythonAPIManager.startPythonAPI();
    if (success) {
      res.json({ message: 'Python API started successfully' });
    } else {
      res.status(500).json({ error: 'Failed to start Python API' });
    }
  } catch (error) {
    console.error('Error starting Python API:', error);
    res.status(500).json({ error: 'Failed to start Python API' });
  }
}));

// Stop Python API
app.post('/api/python/stop', handleAsync(async (req: Request, res: Response) => {
  try {
    pythonAPIManager.stopPythonAPI();
    res.json({ message: 'Python API stop requested' });
  } catch (error) {
    console.error('Error stopping Python API:', error);
    res.status(500).json({ error: 'Failed to stop Python API' });
  }
}));

// Test Python API
app.get('/api/python/test', handleAsync(async (req: Request, res: Response) => {
  try {
    const success = await pythonAPIManager.testPythonAPI();
    if (success) {
      res.json({ message: 'Python API test successful' });
    } else {
      res.status(500).json({ error: 'Python API test failed' });
    }
  } catch (error) {
    console.error('Error testing Python API:', error);
    res.status(500).json({ error: 'Failed to test Python API' });
  }
}));

// ================================
// Error Handling Middleware
// ================================
app.get("/playerGameStats", async (req, res) => {
  const { playerId } = req.query;
  if (!playerId) return res.status(400).json({ error: "playerId required" });

  const stats = await mongoose.connection.db?.collection('playerGameStats')
    .find({ playerId: playerId.toString() })
    .toArray();

  return res.json(stats);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// ================================
// Server Startup
// ================================

const startServer = async () => {
  try {
    console.log('🚀 Starting NBA Betting Simulator API...');
    
    // Connect to database
    await connectToDatabase();
    
    // Load all players with stats for comprehensive betting system
    console.log('🔄 Loading all players with stats...');
    await bettingSimulator.loadAllPlayers();
    console.log(`✅ Loaded ${Object.keys(bettingSimulator.getPlayerThresholds()).length} players with betting data`);
    
    // Start Python API server
    console.log('🐍 Starting Python News API server...');
    const pythonAPIStarted = await pythonAPIManager.startPythonAPI();
    if (pythonAPIStarted) {
      console.log('✅ Python News API started successfully');
    } else {
      console.log('⚠️  Python News API failed to start - continuing without it');
    }
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/`);
      console.log(`🐍 Python News API: http://localhost:5001/`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      
      // Stop Python API
      pythonAPIManager.stopPythonAPI();
      
      server.close(async () => {
        await disconnectFromDatabase();
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

export default app;