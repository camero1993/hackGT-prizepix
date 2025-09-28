#!/usr/bin/env node

/**
 * Test Script for Time Advancement Pipeline
 * 
 * This script tests the time advancement functionality to ensure it works correctly.
 * It performs various tests including:
 * - Setting simulated time
 * - Advancing time by different units
 * - Verifying time state changes
 * - Testing error handling
 */

import axios from 'axios';
import { config } from '../config';

interface TimeState {
  currentTime: string;
  isSimulationMode: boolean;
}

interface TimeAdvanceRequest {
  duration: number;
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days';
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class TimeAdvancementTester {
  private baseUrl: string;
  private testResults: TestResult[] = [];

  constructor() {
    this.baseUrl = `http://localhost:${config.port}`;
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
   * Run a single test
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    console.log(`🧪 Running test: ${name}`);
    
    try {
      const result = await testFn();
      console.log(`✅ ${name} - PASSED`);
      return { name, passed: true, details: result };
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test 1: Check server health
   */
  private async testServerHealth(): Promise<any> {
    const response = await this.makeRequest('GET', '/health');
    if (response.status !== 200) {
      throw new Error('Server health check failed');
    }
    return response.data;
  }

  /**
   * Test 2: Get initial time state
   */
  private async testGetInitialTimeState(): Promise<TimeState> {
    const response = await this.makeRequest('GET', '/time');
    if (response.status !== 200) {
      throw new Error('Failed to get time state');
    }
    return response.data;
  }

  /**
   * Test 3: Set simulated time to a specific date
   */
  private async testSetSimulatedTime(): Promise<TimeState> {
    const testTime = '2024-01-01T00:00:00.000Z';
    const response = await this.makeRequest('POST', '/time/set', { time: testTime });
    if (response.status !== 200) {
      throw new Error('Failed to set simulated time');
    }
    
    const timeState = response.data;
    if (!timeState.isSimulationMode) {
      throw new Error('Expected to be in simulation mode after setting time');
    }
    
    if (timeState.currentTime !== testTime) {
      throw new Error(`Time mismatch: expected ${testTime}, got ${timeState.currentTime}`);
    }
    
    return timeState;
  }

  /**
   * Test 4: Advance time by 1 day
   */
  private async testAdvanceTimeByDay(): Promise<TimeState> {
    const response = await this.makeRequest('POST', '/time/advance', {
      duration: 1,
      unit: 'days'
    });
    
    if (response.status !== 200) {
      throw new Error('Failed to advance time by 1 day');
    }
    
    const timeState = response.data;
    if (!timeState.isSimulationMode) {
      throw new Error('Expected to be in simulation mode');
    }
    
    // Verify the time advanced by approximately 1 day (24 hours)
    const currentTime = new Date(timeState.currentTime);
    const expectedTime = new Date('2024-01-02T00:00:00.000Z');
    const timeDiff = Math.abs(currentTime.getTime() - expectedTime.getTime());
    
    if (timeDiff > 1000) { // Allow 1 second tolerance
      throw new Error(`Time advancement incorrect: expected ~2024-01-02, got ${timeState.currentTime}`);
    }
    
    return timeState;
  }

  /**
   * Test 5: Advance time by 1 hour
   */
  private async testAdvanceTimeByHour(): Promise<TimeState> {
    const response = await this.makeRequest('POST', '/time/advance', {
      duration: 1,
      unit: 'hours'
    });
    
    if (response.status !== 200) {
      throw new Error('Failed to advance time by 1 hour');
    }
    
    const timeState = response.data;
    const currentTime = new Date(timeState.currentTime);
    const expectedTime = new Date('2024-01-02T01:00:00.000Z');
    const timeDiff = Math.abs(currentTime.getTime() - expectedTime.getTime());
    
    if (timeDiff > 1000) {
      throw new Error(`Time advancement incorrect: expected ~2024-01-02T01:00:00, got ${timeState.currentTime}`);
    }
    
    return timeState;
  }

  /**
   * Test 6: Advance time by 30 minutes
   */
  private async testAdvanceTimeByMinutes(): Promise<TimeState> {
    const response = await this.makeRequest('POST', '/time/advance', {
      duration: 30,
      unit: 'minutes'
    });
    
    if (response.status !== 200) {
      throw new Error('Failed to advance time by 30 minutes');
    }
    
    const timeState = response.data;
    const currentTime = new Date(timeState.currentTime);
    const expectedTime = new Date('2024-01-02T01:30:00.000Z');
    const timeDiff = Math.abs(currentTime.getTime() - expectedTime.getTime());
    
    if (timeDiff > 1000) {
      throw new Error(`Time advancement incorrect: expected ~2024-01-02T01:30:00, got ${timeState.currentTime}`);
    }
    
    return timeState;
  }

  /**
   * Test 7: Test invalid time advancement (negative duration)
   */
  private async testInvalidTimeAdvancement(): Promise<any> {
    try {
      await this.makeRequest('POST', '/time/advance', {
        duration: -1,
        unit: 'days'
      });
      throw new Error('Expected error for negative duration, but request succeeded');
    } catch (error) {
      if (error instanceof Error && error.message.includes('400')) {
        return { error: 'Correctly rejected negative duration' };
      }
      throw error;
    }
  }

  /**
   * Test 8: Test invalid time advancement (zero duration)
   */
  private async testZeroTimeAdvancement(): Promise<any> {
    try {
      await this.makeRequest('POST', '/time/advance', {
        duration: 0,
        unit: 'days'
      });
      throw new Error('Expected error for zero duration, but request succeeded');
    } catch (error) {
      if (error instanceof Error && error.message.includes('400')) {
        return { error: 'Correctly rejected zero duration' };
      }
      throw error;
    }
  }

  /**
   * Test 9: Reset to real time
   */
  private async testResetToRealTime(): Promise<TimeState> {
    const response = await this.makeRequest('POST', '/time/reset');
    
    if (response.status !== 200) {
      throw new Error('Failed to reset to real time');
    }
    
    const timeState = response.data;
    if (timeState.isSimulationMode) {
      throw new Error('Expected to be in real time mode after reset');
    }
    
    // Verify the time is close to current real time
    const currentTime = new Date(timeState.currentTime);
    const realTime = new Date();
    const timeDiff = Math.abs(currentTime.getTime() - realTime.getTime());
    
    if (timeDiff > 5000) { // Allow 5 seconds tolerance
      throw new Error(`Time reset incorrect: expected current time, got ${timeState.currentTime}`);
    }
    
    return timeState;
  }

  /**
   * Test 10: Test time-filtered games endpoint
   */
  private async testTimeFilteredGames(): Promise<any> {
    // First set a specific time
    await this.makeRequest('POST', '/time/set', { time: '2024-01-01T00:00:00.000Z' });
    
    const response = await this.makeRequest('GET', '/games/time-filtered');
    
    if (response.status !== 200) {
      throw new Error('Failed to get time-filtered games');
    }
    
    const data = response.data;
    if (!data.hasOwnProperty('pastGames') || !data.hasOwnProperty('futureGames')) {
      throw new Error('Missing pastGames or futureGames in response');
    }
    
    if (!data.hasOwnProperty('currentTime') || !data.hasOwnProperty('isSimulationMode')) {
      throw new Error('Missing time information in response');
    }
    
    return data;
  }

  /**
   * Run all tests
   */
  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting Time Advancement Tests...\n');

    // Run all tests
    this.testResults.push(await this.runTest('Server Health Check', () => this.testServerHealth()));
    this.testResults.push(await this.runTest('Get Initial Time State', () => this.testGetInitialTimeState()));
    this.testResults.push(await this.runTest('Set Simulated Time', () => this.testSetSimulatedTime()));
    this.testResults.push(await this.runTest('Advance Time by 1 Day', () => this.testAdvanceTimeByDay()));
    this.testResults.push(await this.runTest('Advance Time by 1 Hour', () => this.testAdvanceTimeByHour()));
    this.testResults.push(await this.runTest('Advance Time by 30 Minutes', () => this.testAdvanceTimeByMinutes()));
    this.testResults.push(await this.runTest('Invalid Time Advancement (Negative)', () => this.testInvalidTimeAdvancement()));
    this.testResults.push(await this.runTest('Invalid Time Advancement (Zero)', () => this.testZeroTimeAdvancement()));
    this.testResults.push(await this.runTest('Reset to Real Time', () => this.testResetToRealTime()));
    this.testResults.push(await this.runTest('Time-Filtered Games', () => this.testTimeFilteredGames()));

    // Print results
    this.printResults();
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    console.log('=' .repeat(50));
    console.log(`Total: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Time advancement is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Run the tests
const tester = new TimeAdvancementTester();
tester.runAllTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

export default TimeAdvancementTester;
