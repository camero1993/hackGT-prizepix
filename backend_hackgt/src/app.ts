import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, connectToDatabase, disconnectFromDatabase, checkDatabaseHealth } from './config';
import { BettingSimulator } from './services/BettingSimulator';
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
  TimeSetRequest
} from './types';
import { simulatedTimeService } from './services/SimulatedTimeService';
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
        players: '/players',
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

// Get players endpoint
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

    const { active_only, limit } = queryValidation.data;
    
    // Build query
    const query = active_only ? { active: true } : {};
    
    // Check database connection
    if (!mongoose.connection.db) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }
    
    // Fetch players
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
    const games = await mongoose.connection.db.collection('games')
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
      await bettingSimulator.loadAllThresholds();
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
      await bettingSimulator.loadAllThresholds();
    }
    
    // Run simulation
    const result = await bettingSimulator.simulateContract(
      request.contract_length,
      request.parlays
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
        parlays: [
          { playerId: samplePlayers[0]._id, stat: 'points', betType: 'flex' },
          { playerId: samplePlayers[1]._id, stat: 'rebounds', betType: 'power' }
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
        parlays: [
          { playerId: 'sample_player_id', stat: 'points', betType: 'flex' },
          { playerId: 'another_player_id', stat: 'rebounds', betType: 'power' }
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
// Error Handling Middleware
// ================================

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
    
    // Load player expected values in background
    console.log('🔄 Loading player expected values...');
    await bettingSimulator.loadAllThresholds();
    console.log(`✅ Loaded ${Object.keys(bettingSimulator.getPlayerThresholds()).length} player expected values`);
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
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
