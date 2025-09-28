#!/usr/bin/env node

/**
 * Demo Script for Time Pipeline
 * 
 * This script demonstrates the time advancement pipeline by running it for a short period
 * and showing the effects on the system.
 */

import axios from 'axios';
import { config } from '../config';

interface TimeState {
  currentTime: string;
  isSimulationMode: boolean;
}

class TimePipelineDemo {
  private baseUrl: string;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: Date;
  private daysAdvanced: number = 0;

  constructor() {
    this.baseUrl = `http://localhost:${config.port}`;
    this.startTime = new Date();
  }

  /**
   * Make an API request with error handling
   */
  private async makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      };

      if (method === 'GET') {
        return await axios.get(url, config);
      } else {
        return await axios.post(url, data, config);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HTTP ${error.response?.status}: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get current time state
   */
  private async getCurrentTimeState(): Promise<TimeState> {
    const response = await this.makeRequest('GET', '/time');
    return response.data;
  }

  /**
   * Set simulated time
   */
  private async setSimulatedTime(time: string): Promise<void> {
    await this.makeRequest('POST', '/time/set', { time });
  }

  /**
   * Advance time by one day
   */
  private async advanceTimeByDay(): Promise<TimeState> {
    const response = await this.makeRequest('POST', '/time/advance', {
      duration: 1,
      unit: 'days'
    });
    return response.data;
  }

  /**
   * Get time-filtered games
   */
  private async getTimeFilteredGames(): Promise<any> {
    const response = await this.makeRequest('GET', '/games/time-filtered');
    return response.data;
  }

  /**
   * Get demo state
   */
  private async getDemoState(): Promise<any> {
    const response = await this.makeRequest('GET', '/api/demo/state');
    return response.data;
  }

  /**
   * Initialize the demo
   */
  private async initialize(): Promise<void> {
    console.log('🚀 Initializing Time Pipeline Demo...');
    
    // Set initial time to February 1, 2025
    const initialTime = '2025-02-01T00:00:00.000Z';
    await this.setSimulatedTime(initialTime);
    
    console.log(`📅 Set initial time to: ${initialTime}`);
    
    // Get initial game counts
    const games = await this.getTimeFilteredGames();
    console.log(`🎮 Initial game counts - Past: ${games.counts.pastGames}, Future: ${games.counts.futureGames}`);
    
    console.log('✅ Demo initialized successfully\n');
  }

  /**
   * Start the demo
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Demo is already running');
      return;
    }

    await this.initialize();

    this.isRunning = true;
    console.log('⏰ Starting time advancement demo (1 day every 2 seconds for 30 seconds)...');
    console.log('Press Ctrl+C to stop the demo early\n');

    // Start the interval (every 2 seconds for demo)
    this.intervalId = setInterval(async () => {
      await this.advanceTime();
    }, 2000);

    // Stop after 30 seconds
    setTimeout(() => {
      this.stop();
    }, 30000);
  }

  /**
   * Stop the demo
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('\n🛑 Time advancement demo stopped');
    this.logFinalStatus();
  }

  /**
   * Advance time by one day
   */
  private async advanceTime(): Promise<void> {
    try {
      const timeState = await this.advanceTimeByDay();
      this.daysAdvanced++;
      
      const currentTime = new Date(timeState.currentTime);
      console.log(`⏰ Day ${this.daysAdvanced}: ${currentTime.toISOString().split('T')[0]}`);
      
      // Every 5 days, show game counts
      if (this.daysAdvanced % 5 === 0) {
        const games = await this.getTimeFilteredGames();
        console.log(`   📊 Games - Past: ${games.counts.pastGames}, Future: ${games.counts.futureGames}`);
      }
      
    } catch (error) {
      console.error('❌ Error advancing time:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Log final status
   */
  private logFinalStatus(): void {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;
    
    console.log('📊 Demo Summary:');
    console.log(`   Duration: ${minutes}m ${seconds}s`);
    console.log(`   Days Advanced: ${this.daysAdvanced}`);
    console.log(`   Rate: ${(this.daysAdvanced / (uptime / 60)).toFixed(2)} days/minute`);
    console.log(`   Final Time: ${new Date().toISOString()}`);
  }
}

// Create and start the demo
const demo = new TimePipelineDemo();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping demo...');
  demo.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping demo...');
  demo.stop();
  process.exit(0);
});

// Start the demo
demo.start().catch((error) => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});

export default TimePipelineDemo;
