import mongoose from 'mongoose';
import { Player, Team, Game, PlayerStats } from '../types';

export interface PlayerGameStatsEnriched {
  _id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  playerPosition?: string;
  teamId: string;
  teamName: string;
  teamTricode: string;
  opponentTeamId: string;
  opponentTeamName: string;
  opponentTricode: string;
  gameDateUTC: Date;
  season: string;
  seasonType: string;
  points: number;
  rebounds: number;
  assists: number;
  gameStatus: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
}

export interface TeamGameEnriched {
  _id: string;
  season: string;
  seasonType: string;
  gameDateUTC: Date;
  homeTeamId: string;
  homeTeamName: string;
  homeTricode: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTricode: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue?: string;
  isHomeGame: boolean;
}

export class DatabaseService {
  private getDb() {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }
    return db;
  }

  /**
   * Get players by team ID
   */
  async getPlayersByTeam(teamId: string, limit: number = 50): Promise<Player[]> {
    const db = this.getDb();

    const players = await db.collection('players')
      .find(
        { currentTeamId: teamId, active: true },
        {
          projection: {
            _id: 1,
            fullName: 1,
            headshotUrl: 1,
            position: 1,
            currentTeamId: 1,
            active: 1
          }
        }
      )
      .limit(limit)
      .toArray();

    return players as unknown as Player[];
  }

  /**
   * Get player game stats with optional filters
   */
  async getPlayerStats(
    playerId: string,
    options: {
      season?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<PlayerStats[]> {
    const db = this.getDb();

    const { season, startDate, endDate, limit = 50 } = options;
    
    // Build query
    const query: any = { playerId };
    
    if (season) {
      query.season = season;
    }
    
    if (startDate || endDate) {
      query.gameDateUTC = {};
      if (startDate) query.gameDateUTC.$gte = startDate;
      if (endDate) query.gameDateUTC.$lte = endDate;
    }

    const stats = await db.collection('playerGameStats')
      .find(query, {
        projection: {
          _id: 1,
          gameId: 1,
          playerId: 1,
          teamId: 1,
          opponentTeamId: 1,
          gameDateUTC: 1,
          season: 1,
          seasonType: 1,
          points: 1,
          rebounds: 1,
          assists: 1
        }
      })
      .sort({ gameDateUTC: -1 })
      .limit(limit)
      .toArray();

    return stats as unknown as PlayerStats[];
  }

  /**
   * Get enriched player stats with player, team, and game information
   */
  async getEnrichedPlayerStats(
    playerId: string,
    options: {
      season?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<PlayerGameStatsEnriched[]> {
    const db = this.getDb();

    const { season, startDate, endDate, limit = 50 } = options;
    
    // Build match stage
    const matchStage: any = { playerId };
    
    if (season) {
      matchStage.season = season;
    }
    
    if (startDate || endDate) {
      matchStage.gameDateUTC = {};
      if (startDate) matchStage.gameDateUTC.$gte = startDate;
      if (endDate) matchStage.gameDateUTC.$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      
      // Lookup player information
      {
        $lookup: {
          from: 'players',
          localField: 'playerId',
          foreignField: '_id',
          as: 'player'
        }
      },
      
      // Lookup team information
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      
      // Lookup opponent team information
      {
        $lookup: {
          from: 'teams',
          localField: 'opponentTeamId',
          foreignField: '_id',
          as: 'opponentTeam'
        }
      },
      
      // Lookup game information
      {
        $lookup: {
          from: 'games',
          localField: 'gameId',
          foreignField: '_id',
          as: 'game'
        }
      },
      
      // Unwind arrays and project final structure
      {
        $project: {
          _id: 1,
          gameId: 1,
          playerId: 1,
          playerName: { $arrayElemAt: ['$player.fullName', 0] },
          playerPosition: { $arrayElemAt: ['$player.position', 0] },
          teamId: 1,
          teamName: { $arrayElemAt: ['$team.name', 0] },
          teamTricode: { $arrayElemAt: ['$team.tricode', 0] },
          opponentTeamId: 1,
          opponentTeamName: { $arrayElemAt: ['$opponentTeam.name', 0] },
          opponentTricode: { $arrayElemAt: ['$opponentTeam.tricode', 0] },
          gameDateUTC: 1,
          season: 1,
          seasonType: 1,
          points: 1,
          rebounds: 1,
          assists: 1,
          gameStatus: { $arrayElemAt: ['$game.status', 0] },
          homeScore: { $arrayElemAt: ['$game.homeScore', 0] },
          awayScore: { $arrayElemAt: ['$game.awayScore', 0] },
          venue: { $arrayElemAt: ['$game.venue', 0] }
        }
      },
      
      { $sort: { gameDateUTC: -1 } },
      { $limit: limit }
    ];

    const results = await db.collection('playerGameStats')
      .aggregate(pipeline)
      .toArray();

    return results as PlayerGameStatsEnriched[];
  }

  /**
   * Get games for a team in a given season
   */
  async getTeamGames(
    teamId: string,
    options: {
      season?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<Game[]> {
    const db = this.getDb();

    const { season, startDate, endDate, limit = 50 } = options;
    
    // Build query - team can be home or away
    const query: any = {
      $or: [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ]
    };
    
    if (season) {
      query.season = season;
    }
    
    if (startDate || endDate) {
      query.gameDateUTC = {};
      if (startDate) query.gameDateUTC.$gte = startDate;
      if (endDate) query.gameDateUTC.$lte = endDate;
    }

    const games = await db.collection('games')
      .find(query, {
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

    return games as unknown as Game[];
  }

  /**
   * Get enriched team games with team names and additional info
   */
  async getEnrichedTeamGames(
    teamId: string,
    options: {
      season?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<TeamGameEnriched[]> {
    const db = this.getDb();

    const { season, startDate, endDate, limit = 50 } = options;
    
    // Build match stage
    const matchStage: any = {
      $or: [
        { homeTeamId: teamId },
        { awayTeamId: teamId }
      ]
    };
    
    if (season) {
      matchStage.season = season;
    }
    
    if (startDate || endDate) {
      matchStage.gameDateUTC = {};
      if (startDate) matchStage.gameDateUTC.$gte = startDate;
      if (endDate) matchStage.gameDateUTC.$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      
      // Lookup home team information
      {
        $lookup: {
          from: 'teams',
          localField: 'homeTeamId',
          foreignField: '_id',
          as: 'homeTeam'
        }
      },
      
      // Lookup away team information
      {
        $lookup: {
          from: 'teams',
          localField: 'awayTeamId',
          foreignField: '_id',
          as: 'awayTeam'
        }
      },
      
      // Project final structure
      {
        $project: {
          _id: 1,
          season: 1,
          seasonType: 1,
          gameDateUTC: 1,
          homeTeamId: 1,
          homeTeamName: { $arrayElemAt: ['$homeTeam.name', 0] },
          homeTricode: { $arrayElemAt: ['$homeTeam.tricode', 0] },
          awayTeamId: 1,
          awayTeamName: { $arrayElemAt: ['$awayTeam.name', 0] },
          awayTricode: { $arrayElemAt: ['$awayTeam.tricode', 0] },
          homeScore: 1,
          awayScore: 1,
          status: 1,
          venue: 1,
          isHomeGame: { $eq: ['$homeTeamId', teamId] }
        }
      },
      
      { $sort: { gameDateUTC: -1 } },
      { $limit: limit }
    ];

    const results = await db.collection('games')
      .aggregate(pipeline)
      .toArray();

    return results as TeamGameEnriched[];
  }

  /**
   * Get team information by ID
   */
  async getTeamById(teamId: string): Promise<Team | null> {
    const db = this.getDb();

    const team = await db.collection('teams')
      .findOne(
        { _id: teamId as any },
        {
          projection: {
            _id: 1,
            name: 1,
            tricode: 1,
            city: 1,
            logoUrl: 1
          }
        }
      );

    return team as unknown as Team | null;
  }

  /**
   * Get player information by ID
   */
  async getPlayerById(playerId: string): Promise<Player | null> {
    const db = this.getDb();

    const player = await db.collection('players')
      .findOne(
        { _id: playerId as any },
        {
          projection: {
            _id: 1,
            fullName: 1,
            headshotUrl: 1,
            position: 1,
            currentTeamId: 1,
            active: 1
          }
        }
      );

    return player as unknown as Player | null;
  }

  /**
   * Get recent games across all teams (for dashboard)
   */
  async getRecentGames(limit: number = 20): Promise<Game[]> {
    const db = this.getDb();

    const games = await db.collection('games')
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

    return games as unknown as Game[];
  }

  /**
   * Search players by name with team information
   */
  async searchPlayersWithTeam(searchQuery: string, limit: number = 20): Promise<any[]> {
    const db = this.getDb();

    const pipeline = [
      {
        $match: {
          fullName: { $regex: searchQuery, $options: 'i' },
          active: true
        }
      },
      
      // Lookup team information
      {
        $lookup: {
          from: 'teams',
          localField: 'currentTeamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      
      // Project final structure
      {
        $project: {
          _id: 1,
          fullName: 1,
          headshotUrl: 1,
          position: 1,
          currentTeamId: 1,
          active: 1,
          teamName: { $arrayElemAt: ['$team.name', 0] },
          teamTricode: { $arrayElemAt: ['$team.tricode', 0] },
          teamCity: { $arrayElemAt: ['$team.city', 0] }
        }
      },
      
      { $limit: limit }
    ];

    const results = await db.collection('players')
      .aggregate(pipeline)
      .toArray();

    return results;
  }
}

// Export singleton instance
export const dbService = new DatabaseService();
