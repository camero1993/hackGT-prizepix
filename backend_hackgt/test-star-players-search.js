#!/usr/bin/env node

/**
 * Test script to verify that the /players endpoint only returns the 10 star players
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';

// The 10 star players we expect to see
const EXPECTED_STAR_PLAYERS = [
  { id: '1628983', name: 'Shai Gilgeous-Alexander' },
  { id: '1630169', name: 'Tyrese Haliburton' },
  { id: '203999', name: 'Nikola Jokić' },
  { id: '1628369', name: 'Jayson Tatum' },
  { id: '201939', name: 'Stephen Curry' },
  { id: '1628378', name: 'Donovan Mitchell' },
  { id: '2544', name: 'LeBron James' },
  { id: '1626164', name: 'Devin Booker' },
  { id: '203507', name: 'Giannis Antetokounmpo' },
  { id: '203954', name: 'Joel Embiid' }
];

async function testStarPlayersSearch() {
  console.log('🧪 Testing Star Players Search Functionality\n');
  
  try {
    // Test 1: Get all players (should return exactly 10)
    console.log('1️⃣ Testing: Get all players');
    const allPlayersResponse = await axios.get(`${API_BASE}/players?active_only=true&limit=50`);
    const allPlayers = allPlayersResponse.data;
    
    console.log(`   ✅ Found ${allPlayers.length} players`);
    
    if (allPlayers.length !== 10) {
      console.log(`   ❌ Expected exactly 10 players, got ${allPlayers.length}`);
      return false;
    }
    
    // Verify all returned players are in our star players list
    const returnedIds = allPlayers.map(p => p.id);
    const expectedIds = EXPECTED_STAR_PLAYERS.map(p => p.id);
    
    const unexpectedPlayers = returnedIds.filter(id => !expectedIds.includes(id));
    if (unexpectedPlayers.length > 0) {
      console.log(`   ❌ Found unexpected players: ${unexpectedPlayers.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ All returned players are star players\n');
    
    // Test 2: Search for specific players
    console.log('2️⃣ Testing: Search for "curry"');
    const curryResponse = await axios.get(`${API_BASE}/players?search=curry&active_only=true&limit=10`);
    const curryResults = curryResponse.data;
    
    console.log(`   ✅ Found ${curryResults.length} results for "curry"`);
    
    if (curryResults.length !== 1 || !curryResults[0].fullName.toLowerCase().includes('curry')) {
      console.log('   ❌ Expected to find Stephen Curry');
      return false;
    }
    
    console.log(`   ✅ Found: ${curryResults[0].fullName}\n`);
    
    // Test 3: Search for "lebron"
    console.log('3️⃣ Testing: Search for "lebron"');
    const lebronResponse = await axios.get(`${API_BASE}/players?search=lebron&active_only=true&limit=10`);
    const lebronResults = lebronResponse.data;
    
    console.log(`   ✅ Found ${lebronResults.length} results for "lebron"`);
    
    if (lebronResults.length !== 1 || !lebronResults[0].fullName.toLowerCase().includes('lebron')) {
      console.log('   ❌ Expected to find LeBron James');
      return false;
    }
    
    console.log(`   ✅ Found: ${lebronResults[0].fullName}\n`);
    
    // Test 4: Search for non-existent player
    console.log('4️⃣ Testing: Search for "nonexistent"');
    const nonexistentResponse = await axios.get(`${API_BASE}/players?search=nonexistent&active_only=true&limit=10`);
    const nonexistentResults = nonexistentResponse.data;
    
    console.log(`   ✅ Found ${nonexistentResults.length} results for "nonexistent"`);
    
    if (nonexistentResults.length !== 0) {
      console.log('   ❌ Expected no results for nonexistent player');
      return false;
    }
    
    console.log('   ✅ No results found as expected\n');
    
    // Test 5: Search for partial match
    console.log('5️⃣ Testing: Search for "jok"');
    const jokResponse = await axios.get(`${API_BASE}/players?search=jok&active_only=true&limit=10`);
    const jokResults = jokResponse.data;
    
    console.log(`   ✅ Found ${jokResults.length} results for "jok"`);
    
    if (jokResults.length !== 1 || !jokResults[0].fullName.toLowerCase().includes('jokić')) {
      console.log('   ❌ Expected to find Nikola Jokić');
      return false;
    }
    
    console.log(`   ✅ Found: ${jokResults[0].fullName}\n`);
    
    console.log('🎉 All tests passed! The search is correctly limited to the 10 star players.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testStarPlayersSearch().then(success => {
  process.exit(success ? 0 : 1);
});
