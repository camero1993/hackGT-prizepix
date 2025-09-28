#!/usr/bin/env node

/**
 * Time Advancement Pipeline
 * 
 * This script automatically advances the simulated time by one day every 5 seconds.
 * It's designed to run as a background service to continuously advance time for
 * the betting simulation system.
 */

import axios from 'axios';
import { config } from '../config';

interface TimeState {
  currentTime: string;
  isSimulationMode: boolean;
}

interface TimeAdvanceRequest {
  duration: number;
  unit: 'days';
}

class TimePipeline {
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
   * Check if the API server is running and accessible
   */
  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('❌ Server health check failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get the current time state from the API
   */
  private async getCurrentTimeState(): Promise<TimeState | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/time`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get current time state:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Set the simulated time to a specific date
   */
  private async setSimulatedTime(time: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.baseUrl}/time/set`, 
        { time }, 
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000 
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error('❌ Failed to set simulated time:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Advance time by one day
   */
  private async advanceTimeByDay(): Promise<boolean> {
    try {
      const request: TimeAdvanceRequest = {
        duration: 1,
        unit: 'days'
      };

      const response = await axios.post(`${this.baseUrl}/time/advance`, 
        request, 
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000 
        }
      );
      
      if (response.status === 200) {
        this.daysAdvanced++;
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to advance time:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Initialize the pipeline by setting up simulated time
   */
  private async initialize(): Promise<boolean> {
    console.log('🚀 Initializing Time Pipeline...');
    
    // Check if server is running
    const isHealthy = await this.checkServerHealth();
    if (!isHealthy) {
      console.error('❌ Server is not running or not accessible');
      return false;
    }

    // Get current time state
    const timeState = await this.getCurrentTimeState();
    if (!timeState) {
      console.error('❌ Failed to get current time state');
      return false;
    }

    // If not in simulation mode, set to current time
    if (!timeState.isSimulationMode) {
      console.log('📅 Setting simulated time to current time...');
      const now = new Date().toISOString();
      const success = await this.setSimulatedTime(now);
      if (!success) {
        console.error('❌ Failed to set simulated time');
        return false;
      }
    }

    console.log('✅ Time Pipeline initialized successfully');
    return true;
  }

  /**
   * Start the time advancement pipeline
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Pipeline is already running');
      return;
    }

    // Initialize the pipeline
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Failed to initialize pipeline');
      process.exit(1);
    }

    this.isRunning = true;
    console.log('⏰ Starting time advancement pipeline (1 day every 5 seconds)...');
    console.log('Press Ctrl+C to stop the pipeline');

    // Start the interval
    this.intervalId = setInterval(async () => {
      await this.advanceTime();
    }, 5000); // 5 seconds

    // Log status every 30 seconds
    setInterval(() => {
      this.logStatus();
    }, 30000);
  }

  /**
   * Stop the time advancement pipeline
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Pipeline is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('🛑 Time advancement pipeline stopped');
    this.logFinalStatus();
  }

  /**
   * Advance time by one day
   */
  private async advanceTime(): Promise<void> {
    try {
      const success = await this.advanceTimeByDay();
      if (success) {
        const timeState = await this.getCurrentTimeState();
        if (timeState) {
          const currentTime = new Date(timeState.currentTime);
          console.log(`⏰ Advanced time by 1 day (Total: ${this.daysAdvanced} days) - Current: ${currentTime.toISOString()}`);
        }
      } else {
        console.error('❌ Failed to advance time');
      }
    } catch (error) {
      console.error('❌ Error advancing time:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Log current status
   */
  private logStatus(): void {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    console.log(`📊 Status - Uptime: ${hours}h ${minutes}m ${seconds}s, Days Advanced: ${this.daysAdvanced}`);
  }

  /**
   * Log final status when stopping
   */
  private logFinalStatus(): void {
    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    console.log('📊 Final Status:');
    console.log(`   Total Uptime: ${hours}h ${minutes}m ${seconds}s`);
    console.log(`   Total Days Advanced: ${this.daysAdvanced}`);
    console.log(`   Average Rate: ${(this.daysAdvanced / (uptime / 60)).toFixed(2)} days/minute`);
  }
}

// Create and start the pipeline
const pipeline = new TimePipeline();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  pipeline.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  pipeline.stop();
  process.exit(0);
});

// Start the pipeline
pipeline.start().catch((error) => {
  console.error('❌ Failed to start pipeline:', error);
  process.exit(1);
});

export default TimePipeline;
