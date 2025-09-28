#!/usr/bin/env node

/**
 * Test script to verify that the search now requires characters in order
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';

async function testOrderedSearch() {
  console.log('🧪 Testing Ordered Character Search Functionality\n');
  
  try {
    // Test cases for ordered search
    const testCases = [
      {
        name: 'Search "steph" (should find Stephen Curry)',
        query: 'steph',
        expected: ['Stephen Curry'],
        shouldFind: true
      },
      {
        name: 'Search "curry" (should find Stephen Curry)',
        query: 'curry',
        expected: ['Stephen Curry'],
        shouldFind: true
      },
      {
        name: 'Search "lebron" (should find LeBron James)',
        query: 'lebron',
        expected: ['LeBron James'],
        shouldFind: true
      },
      {
        name: 'Search "james" (should find LeBron James)',
        query: 'james',
        expected: ['LeBron James'],
        shouldFind: true
      },
      {
        name: 'Search "jok" (should find Nikola Jokić)',
        query: 'jok',
        expected: ['Nikola Jokić'],
        shouldFind: true
      },
      {
        name: 'Search "jokic" (should find Nikola Jokić)',
        query: 'jokic',
        expected: ['Nikola Jokić'],
        shouldFind: true
      },
      {
        name: 'Search "giannis" (should find Giannis Antetokounmpo)',
        query: 'giannis',
        expected: ['Giannis Antetokounmpo'],
        shouldFind: true
      },
      {
        name: 'Search "antetokounmpo" (should find Giannis Antetokounmpo)',
        query: 'antetokounmpo',
        expected: ['Giannis Antetokounmpo'],
        shouldFind: true
      },
      {
        name: 'Search "tyrese" (should find Tyrese Haliburton)',
        query: 'tyrese',
        expected: ['Tyrese Haliburton'],
        shouldFind: true
      },
      {
        name: 'Search "haliburton" (should find Tyrese Haliburton)',
        query: 'haliburton',
        expected: ['Tyrese Haliburton'],
        shouldFind: true
      },
      {
        name: 'Search "sga" (should find Shai Gilgeous-Alexander)',
        query: 'sga',
        expected: ['Shai Gilgeous-Alexander'],
        shouldFind: true
      },
      {
        name: 'Search "shai" (should find Shai Gilgeous-Alexander)',
        query: 'shai',
        expected: ['Shai Gilgeous-Alexander'],
        shouldFind: true
      },
      {
        name: 'Search "jayson" (should find Jayson Tatum)',
        query: 'jayson',
        expected: ['Jayson Tatum'],
        shouldFind: true
      },
      {
        name: 'Search "tatum" (should find Jayson Tatum)',
        query: 'tatum',
        expected: ['Jayson Tatum'],
        shouldFind: true
      },
      {
        name: 'Search "donovan" (should find Donovan Mitchell)',
        query: 'donovan',
        expected: ['Donovan Mitchell'],
        shouldFind: true
      },
      {
        name: 'Search "mitchell" (should find Donovan Mitchell)',
        query: 'mitchell',
        expected: ['Donovan Mitchell'],
        shouldFind: true
      },
      {
        name: 'Search "devin" (should find Devin Booker)',
        query: 'devin',
        expected: ['Devin Booker'],
        shouldFind: true
      },
      {
        name: 'Search "booker" (should find Devin Booker)',
        query: 'booker',
        expected: ['Devin Booker'],
        shouldFind: true
      },
      {
        name: 'Search "joel" (should find Joel Embiid)',
        query: 'joel',
        expected: ['Joel Embiid'],
        shouldFind: true
      },
      {
        name: 'Search "embiid" (should find Joel Embiid)',
        query: 'embiid',
        expected: ['Joel Embiid'],
        shouldFind: true
      },
      // Test cases that should NOT find results (characters not in order)
      {
        name: 'Search "hst" (should NOT find Stephen Curry - characters not in order)',
        query: 'hst',
        expected: [],
        shouldFind: false
      },
      {
        name: 'Search "rycu" (should NOT find Stephen Curry - characters not in order)',
        query: 'rycu',
        expected: [],
        shouldFind: false
      },
      {
        name: 'Search "jlb" (should NOT find LeBron James - characters not in order)',
        query: 'jlb',
        expected: [],
        shouldFind: false
      },
      {
        name: 'Search "nonexistent" (should NOT find anything)',
        query: 'nonexistent',
        expected: [],
        shouldFind: false
      }
    ];

    let passedTests = 0;
    let totalTests = testCases.length;

    for (const testCase of testCases) {
      console.log(`🔍 ${testCase.name}`);
      
      try {
        const response = await axios.get(`${API_BASE}/players?search=${encodeURIComponent(testCase.query)}&active_only=true&limit=10`);
        const results = response.data;
        
        if (testCase.shouldFind) {
          if (results.length === 0) {
            console.log(`   ❌ Expected to find players, but got 0 results`);
            continue;
          }
          
          const foundNames = results.map(p => p.fullName);
          const foundExpected = testCase.expected.some(expected => 
            foundNames.some(found => found.toLowerCase().includes(expected.toLowerCase()))
          );
          
          if (foundExpected) {
            console.log(`   ✅ Found: ${foundNames.join(', ')}`);
            passedTests++;
          } else {
            console.log(`   ❌ Expected one of: ${testCase.expected.join(', ')}, but found: ${foundNames.join(', ')}`);
          }
        } else {
          if (results.length === 0) {
            console.log(`   ✅ Correctly found no results`);
            passedTests++;
          } else {
            const foundNames = results.map(p => p.fullName);
            console.log(`   ❌ Expected no results, but found: ${foundNames.join(', ')}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }

    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Ordered character search is working correctly.');
      return true;
    } else {
      console.log('❌ Some tests failed. The search functionality needs adjustment.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testOrderedSearch().then(success => {
  process.exit(success ? 0 : 1);
});
