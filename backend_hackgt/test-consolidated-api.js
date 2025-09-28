#!/usr/bin/env node

/**
 * Test script for the consolidated API system
 * Tests the new loadAllPlayers functionality and updated /players endpoint
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test configuration
const tests = [
  {
    name: 'Server Health Check',
    endpoint: '/health',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Player Loading Debug',
    endpoint: '/debug/player-loading',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ Loaded players: ${data.loadedPlayers}`);
      console.log(`📊 Total active players: ${data.totalActivePlayers}`);
      console.log(`📈 Coverage: ${data.coveragePercentage}%`);
      return data.loadedPlayers > 0 && data.totalActivePlayers > 0;
    }
  },
  {
    name: 'Get All Players (No Search)',
    endpoint: '/players?active_only=true&limit=50',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ Found ${data.length} players with betting data`);
      return Array.isArray(data) && data.length > 0;
    }
  },
  {
    name: 'Search Players - Stephen Curry',
    endpoint: '/players?search=curry&active_only=true&limit=10',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ Search results: ${data.length} players found`);
      const curry = data.find(p => p.fullName.toLowerCase().includes('curry'));
      if (curry) {
        console.log(`✅ Found Stephen Curry: ${curry.fullName} (ID: ${curry.id})`);
        return true;
      }
      console.log('❌ Stephen Curry not found in search results');
      return false;
    }
  },
  {
    name: 'Search Players - LeBron James',
    endpoint: '/players?search=lebron&active_only=true&limit=10',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ Search results: ${data.length} players found`);
      const lebron = data.find(p => p.fullName.toLowerCase().includes('lebron'));
      if (lebron) {
        console.log(`✅ Found LeBron James: ${lebron.fullName} (ID: ${lebron.id})`);
        return true;
      }
      console.log('❌ LeBron James not found in search results');
      return false;
    }
  },
  {
    name: 'Search Players - Partial Match',
    endpoint: '/players?search=steph&active_only=true&limit=10',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ Partial search results: ${data.length} players found`);
      return Array.isArray(data);
    }
  },
  {
    name: 'Search Players - No Results',
    endpoint: '/players?search=nonexistentplayer&active_only=true&limit=10',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ No results search: ${data.length} players found (expected 0)`);
      return Array.isArray(data) && data.length === 0;
    }
  },
  {
    name: 'Player Thresholds - Stephen Curry',
    endpoint: '/player/201939/thresholds',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => {
      console.log(`✅ Stephen Curry thresholds:`, data);
      return data.expected_values && 
             typeof data.expected_values.points === 'number' &&
             typeof data.expected_values.rebounds === 'number' &&
             typeof data.expected_values.assists === 'number';
    }
  },
  {
    name: 'Player Thresholds - Invalid Player',
    endpoint: '/player/invalid123/thresholds',
    method: 'GET',
    expectedStatus: 404,
    validate: (data) => {
      console.log(`✅ Invalid player response:`, data);
      return data.error && data.error.includes('not found');
    }
  }
];

// Test runner
async function runTests() {
  console.log('🧪 Starting Consolidated API Tests...\n');
  
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    try {
      console.log(`\n🔍 Running: ${test.name}`);
      console.log(`   ${test.method} ${test.endpoint}`);
      
      const startTime = Date.now();
      
      let response;
      if (test.method === 'GET') {
        response = await axios.get(`${API_BASE}${test.endpoint}`, {
          timeout: TEST_TIMEOUT,
          validateStatus: () => true // Don't throw on any status code
        });
      } else {
        throw new Error(`Unsupported method: ${test.method}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Check status code
      if (response.status !== test.expectedStatus) {
        throw new Error(`Expected status ${test.expectedStatus}, got ${response.status}`);
      }
      
      // Run custom validation if provided
      let validationPassed = true;
      if (test.validate) {
        try {
          validationPassed = test.validate(response.data);
        } catch (validationError) {
          console.log(`❌ Validation error: ${validationError.message}`);
          validationPassed = false;
        }
      }
      
      if (validationPassed) {
        console.log(`✅ PASSED (${duration}ms)`);
        passed++;
        results.push({ test: test.name, status: 'PASSED', duration });
      } else {
        console.log(`❌ FAILED - Validation failed (${duration}ms)`);
        failed++;
        results.push({ test: test.name, status: 'FAILED', duration, error: 'Validation failed' });
      }
      
    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
      failed++;
      results.push({ test: test.name, status: 'FAILED', duration: 0, error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.test} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  if (failed > 0) {
    console.log('\n🚨 Some tests failed. Check the server logs and database connection.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! The consolidated API system is working correctly.');
    process.exit(0);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
