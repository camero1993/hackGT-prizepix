import { Game } from '../types';

export interface TimeState {
  currentTime: Date;
  isSimulationMode: boolean;
}

export class SimulatedTimeService {
  private currentTime: Date;
  private isSimulationMode: boolean;

  constructor(initialTime?: Date) {
    this.currentTime = initialTime || new Date();
    this.isSimulationMode = initialTime !== undefined;
  }

  /**
   * Get the current simulated time
   */
  getCurrentTime(): Date {
    return new Date(this.currentTime);
  }

  /**
   * Set the simulated time
   */
  setCurrentTime(time: Date): void {
    this.currentTime = new Date(time);
    this.isSimulationMode = true;
  }

  /**
   * Reset to real time
   */
  resetToRealTime(): void {
    this.currentTime = new Date();
    this.isSimulationMode = false;
  }

  /**
   * Check if we're in simulation mode
   */
  isInSimulationMode(): boolean {
    return this.isSimulationMode;
  }

  /**
   * Get time state
   */
  getTimeState(): TimeState {
    return {
      currentTime: this.getCurrentTime(),
      isSimulationMode: this.isSimulationMode
    };
  }

  /**
   * Filter games based on simulated time
   * - Games before current time: Past games (for modeling)
   * - Games after current time: Future games (unknown to system)
   */
  filterGamesByTime(games: Game[]): {
    pastGames: Game[];
    futureGames: Game[];
  } {
    const currentTime = this.getCurrentTime();
    
    const pastGames: Game[] = [];
    const futureGames: Game[] = [];

    games.forEach(game => {
      const gameTime = new Date(game.gameDateUTC);
      if (gameTime < currentTime) {
        pastGames.push(game);
      } else {
        futureGames.push(game);
      }
    });

    return { pastGames, futureGames };
  }

  /**
   * Get games that are "known" to the system (past games)
   */
  getKnownGames(games: Game[]): Game[] {
    const { pastGames } = this.filterGamesByTime(games);
    return pastGames;
  }

  /**
   * Get games that are "unknown" to the system (future games)
   */
  getUnknownGames(games: Game[]): Game[] {
    const { futureGames } = this.filterGamesByTime(games);
    return futureGames;
  }

  /**
   * Advance simulated time by a specified duration
   */
  advanceTime(durationMs: number): void {
    if (!this.isSimulationMode) {
      throw new Error('Cannot advance time when not in simulation mode');
    }
    this.currentTime = new Date(this.currentTime.getTime() + durationMs);
  }

  /**
   * Advance simulated time by days
   */
  advanceTimeByDays(days: number): void {
    this.advanceTime(days * 24 * 60 * 60 * 1000);
  }

  /**
   * Advance simulated time by hours
   */
  advanceTimeByHours(hours: number): void {
    this.advanceTime(hours * 60 * 60 * 1000);
  }

  /**
   * Get a formatted string representation of current time
   */
  getFormattedTime(): string {
    return this.currentTime.toISOString();
  }

  /**
   * Get time difference from real time
   */
  getTimeDifferenceFromReal(): number {
    const realTime = new Date();
    return this.currentTime.getTime() - realTime.getTime();
  }
}

// Singleton instance
export const simulatedTimeService = new SimulatedTimeService();
