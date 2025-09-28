#!/usr/bin/env node

/**
 * Troubleshooting script for the consolidated API system
 * Helps diagnose issues with player loading and API endpoints
 */

const axios = require('axios');
const { execSync } = require('child_process');

const API_BASE = 'http://localhost:8000';

// Diagnostic functions
async function checkServerStatus() {
  console.log('🔍 Checking server status...');
  try {
    const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    console.log('✅ Server is running');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Database: ${response.data.database}`);
    return true;
  } catch (error) {
    console.log('❌ Server is not responding');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkPlayerLoading() {
  console.log('\n🔍 Checking player loading...');
  try {
    const response = await axios.get(`${API_BASE}/debug/player-loading`, { timeout: 10000 });
    const data = response.data;
    
    console.log(`✅ Player loading debug data:`);
    console.log(`   Loaded players: ${data.loadedPlayers}`);
    console.log(`   Total active players: ${data.totalActivePlayers}`);
    console.log(`   Coverage: ${data.coveragePercentage}%`);
    
    if (data.loadedPlayers === 0) {
      console.log('⚠️  No players loaded! This indicates a problem with the loadAllPlayers() method.');
      return false;
    }
    
    if (data.coveragePercentage < 1) {
      console.log('⚠️  Very low coverage! Most players don\'t have betting data.');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Failed to get player loading debug data');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkPlayersEndpoint() {
  console.log('\n🔍 Checking /players endpoint...');
  try {
    const response = await axios.get(`${API_BASE}/players?active_only=true&limit=10`, { timeout: 10000 });
    const players = response.data;
    
    console.log(`✅ /players endpoint working`);
    console.log(`   Returned ${players.length} players`);
    
    if (players.length === 0) {
      console.log('⚠️  No players returned! This indicates a problem with the endpoint filtering.');
      return false;
    }
    
    // Show first few players
    console.log('   Sample players:');
    players.slice(0, 3).forEach(player => {
      console.log(`     - ${player.fullName} (ID: ${player.id})`);
    });
    
    return true;
  } catch (error) {
    console.log('❌ /players endpoint failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkSearchFunctionality() {
  console.log('\n🔍 Checking search functionality...');
  try {
    // Test search for Stephen Curry
    const response = await axios.get(`${API_BASE}/players?search=curry&active_only=true&limit=5`, { timeout: 10000 });
    const players = response.data;
    
    console.log(`✅ Search functionality working`);
    console.log(`   Search for "curry" returned ${players.length} players`);
    
    const curry = players.find(p => p.fullName.toLowerCase().includes('curry'));
    if (curry) {
      console.log(`   Found Stephen Curry: ${curry.fullName} (ID: ${curry.id})`);
    } else {
      console.log('⚠️  Stephen Curry not found in search results');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Search functionality failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkPlayerThresholds() {
  console.log('\n🔍 Checking player thresholds...');
  try {
    // Test with Stephen Curry (ID: 201939)
    const response = await axios.get(`${API_BASE}/player/201939/thresholds`, { timeout: 10000 });
    const data = response.data;
    
    console.log(`✅ Player thresholds working`);
    console.log(`   Stephen Curry thresholds:`, data);
    
    if (!data.expected_values) {
      console.log('⚠️  No expected values found');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Player thresholds failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function checkDatabaseConnection() {
  console.log('\n🔍 Checking database connection...');
  try {
    // Try to get some basic database info
    const response = await axios.get(`${API_BASE}/debug/players`, { timeout: 10000 });
    const data = response.data;
    
    console.log(`✅ Database connection working`);
    console.log(`   Sample players: ${data.samplePlayers?.length || 0}`);
    console.log(`   Available seasons: ${data.availableSeasons?.join(', ') || 'None'}`);
    
    return true;
  } catch (error) {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function checkServerLogs() {
  console.log('\n🔍 Checking for common server issues...');
  
  try {
    // Check if the server process is running
    const psOutput = execSync('ps aux | grep "node.*app.js" | grep -v grep', { encoding: 'utf8' });
    if (psOutput.trim()) {
      console.log('✅ Node.js server process is running');
    } else {
      console.log('❌ Node.js server process not found');
    }
  } catch (error) {
    console.log('⚠️  Could not check server process status');
  }
  
  console.log('\n📋 Common issues to check:');
  console.log('   1. Is the server running? (npm start or node dist/app.js)');
  console.log('   2. Is MongoDB running? (mongod)');
  console.log('   3. Are there any error messages in the server console?');
  console.log('   4. Is the database populated with player data?');
  console.log('   5. Are there any TypeScript compilation errors?');
}

async function runDiagnostics() {
  console.log('🔧 CONSOLIDATED API TROUBLESHOOTING');
  console.log('='.repeat(50));
  
  const checks = [
    { name: 'Server Status', fn: checkServerStatus },
    { name: 'Database Connection', fn: checkDatabaseConnection },
    { name: 'Player Loading', fn: checkPlayerLoading },
    { name: 'Players Endpoint', fn: checkPlayersEndpoint },
    { name: 'Search Functionality', fn: checkSearchFunctionality },
    { name: 'Player Thresholds', fn: checkPlayerThresholds }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, status: result ? 'PASS' : 'FAIL' });
    } catch (error) {
      console.log(`❌ ${check.name} check crashed: ${error.message}`);
      results.push({ name: check.name, status: 'ERROR' });
    }
  }
  
  checkServerLogs();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
  });
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const total = results.length;
  
  console.log(`\n📈 Overall Health: ${passed}/${total} checks passed`);
  
  if (passed === total) {
    console.log('🎉 All systems are working correctly!');
  } else {
    console.log('🚨 Some issues detected. Check the details above.');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic runner failed:', error);
  process.exit(1);
});
