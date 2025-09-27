import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration interface
export interface Config {
  mongoUri: string;
  dbName: string;
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  redisUrl: string;
}

// Get configuration from environment variables
export const config: Config = {
  mongoUri: process.env.MONGO_URI || (() => {
    throw new Error('MONGO_URI environment variable is required');
  })(),
  dbName: process.env.DB_NAME || 'nba',
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
};

// MongoDB connection
export const connectToDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri, {
      dbName: config.dbName,
    });
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Health check for database
export const checkDatabaseHealth = async (): Promise<{ status: string; data: { players: number; games: number; playerGameStats: number; teams: number } }> => {
  try {
    // Test connection
    if (!mongoose.connection.db) {
      throw new Error('Database not connected');
    }
    
    await mongoose.connection.db.admin().ping();
    
    // Get collection counts
    const playersCount = await mongoose.connection.db.collection('players').countDocuments();
    const gamesCount = await mongoose.connection.db.collection('games').countDocuments();
    const playerGameStatsCount = await mongoose.connection.db.collection('playerGameStats').countDocuments();
    const teamsCount = await mongoose.connection.db.collection('teams').countDocuments();
    
    return {
      status: 'healthy',
      data: {
        players: playersCount,
        games: gamesCount,
        playerGameStats: playerGameStatsCount,
        teams: teamsCount
      }
    };
  } catch (error) {
    console.error('Health check failed:', error);
    throw new Error('Database health check failed');
  }
};
