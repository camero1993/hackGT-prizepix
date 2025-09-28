/**
 * Frontend Integration Test Script for Sports News Scraper API
 * Tests API integration from a frontend perspective using Node.js
 */

const https = require('https');
const http = require('http');

class FrontendAPITester {
    constructor(baseUrl = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Make HTTP request
     */
    async makeRequest(method, endpoint, data = null, params = null) {
        return new Promise((resolve, reject) => {
            let url;
            try {
                url = new URL(endpoint, this.baseUrl);
            } catch (e) {
                reject(new Error(`Invalid URL: ${this.baseUrl}${endpoint}`));
                return;
            }
            
            if (params) {
                Object.keys(params).forEach(key => 
                    url.searchParams.append(key, params[key])
                );
            }

            const options = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Frontend-Tester/1.0'
                }
            };

            if (data && method.toUpperCase() === 'POST') {
                options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
            }

            const req = http.request(url, options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        resolve({
                            status: res.statusCode,
                            data: jsonData,
                            headers: res.headers
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            data: responseData,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', reject);

            if (data && method.toUpperCase() === 'POST') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Test a single endpoint
     */
    async testEndpoint(method, endpoint, expectedStatus = 200, data = null, params = null, description = '') {
        try {
            console.log(`\n🧪 Testing: ${method} ${endpoint}`);
            if (description) {
                console.log(`   Description: ${description}`);
            }

            const response = await this.makeRequest(method, endpoint, data, params);

            if (response.status === expectedStatus) {
                console.log(`   ✅ Status: ${response.status} (expected ${expectedStatus})`);
                
                if (response.data && typeof response.data === 'object') {
                    console.log(`   📊 Response keys: ${Object.keys(response.data).join(', ')}`);
                    
                    if (response.data.articles) {
                        console.log(`   📰 Articles found: ${response.data.articles.length}`);
                    }
                    if (response.data.headlines) {
                        console.log(`   📰 Headlines found: ${response.data.headlines.length}`);
                    }
                }

                this.results.passed++;
                return true;
            } else {
                console.log(`   ❌ Status: ${response.status} (expected ${expectedStatus})`);
                console.log(`   📝 Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
                this.results.failed++;
                this.results.errors.push(`${method} ${endpoint}: Expected ${expectedStatus}, got ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log(`   💥 Error: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`${method} ${endpoint}: ${error.message}`);
            return false;
        }
    }

    /**
     * Test health endpoint
     */
    async testHealthEndpoint() {
        console.log('\n🏥 Testing Health Endpoint');
        console.log('='.repeat(50));

        await this.testEndpoint(
            'GET',
            '/health',
            200,
            null,
            null,
            'Health check should return service status'
        );
    }

    /**
     * Test headlines endpoints
     */
    async testHeadlinesEndpoints() {
        console.log('\n📰 Testing Headlines Endpoints');
        console.log('='.repeat(50));

        // Test headlines for specific player
        await this.testEndpoint(
            'GET',
            '/api/headlines',
            200,
            null,
            { player: 'LeBron James' },
            'Get headlines for LeBron James'
        );

        // Test headlines for all NBA athletes
        await this.testEndpoint(
            'GET',
            '/api/headlines',
            200,
            null,
            null,
            'Get headlines for all NBA athletes'
        );

        // Test headlines with date range
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        await this.testEndpoint(
            'GET',
            '/api/headlines',
            200,
            null,
            {
                player: 'Stephen Curry',
                from_date: weekAgo.toISOString().split('T')[0],
                to_date: today.toISOString().split('T')[0]
            },
            'Get headlines with date range'
        );
    }

    /**
     * Test search endpoints
     */
    async testSearchEndpoints() {
        console.log('\n🔍 Testing Search Endpoints');
        console.log('='.repeat(50));

        // Test single player search
        await this.testEndpoint(
            'GET',
            '/api/search/player',
            200,
            null,
            {
                player: 'Nikola Jokić',
                max_results: 5
            },
            'Search for Nikola Jokić articles'
        );

        // Test NBA athletes search
        await this.testEndpoint(
            'GET',
            '/api/search/nba-athletes',
            200,
            null,
            { max_results_per_player: 2 },
            'Search all NBA athletes'
        );

        // Test multiple players search
        const multiplePlayersData = {
            players: ['Giannis Antetokounmpo', 'Joel Embiid', 'Donovan Mitchell'],
            max_results_per_player: 2
        };

        await this.testEndpoint(
            'POST',
            '/api/search/multiple-players',
            200,
            multiplePlayersData,
            null,
            'Search multiple players'
        );
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('\n🚨 Testing Error Handling');
        console.log('='.repeat(50));

        // Test missing player parameter
        await this.testEndpoint(
            'GET',
            '/api/search/player',
            400,
            null,
            null,
            'Should return 400 for missing player parameter'
        );

        // Test invalid date format
        await this.testEndpoint(
            'GET',
            '/api/search/player',
            400,
            null,
            {
                player: 'Test Player',
                from_date: 'invalid-date'
            },
            'Should return 400 for invalid date format'
        );

        // Test non-existent endpoint
        await this.testEndpoint(
            'GET',
            '/api/nonexistent',
            404,
            null,
            null,
            'Should return 404 for non-existent endpoint'
        );
    }

    /**
     * Test CORS headers
     */
    async testCORS() {
        console.log('\n🌐 Testing CORS Headers');
        console.log('='.repeat(50));

        try {
            const response = await this.makeRequest('GET', '/health');
            
            if (response.headers['access-control-allow-origin']) {
                console.log('   ✅ CORS headers present');
                console.log(`   📋 Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
                this.results.passed++;
            } else {
                console.log('   ⚠️  CORS headers not found');
                this.results.failed++;
                this.results.errors.push('CORS: Access-Control-Allow-Origin header not found');
            }
        } catch (error) {
            console.log(`   💥 Error testing CORS: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`CORS: ${error.message}`);
        }
    }

    /**
     * Test performance
     */
    async testPerformance() {
        console.log('\n⚡ Testing Performance');
        console.log('='.repeat(50));

        const startTime = Date.now();
        await this.testEndpoint(
            'GET',
            '/api/headlines',
            200,
            null,
            { player: 'LeBron James' },
            'Performance test for headlines'
        );
        const endTime = Date.now();
        const responseTime = (endTime - startTime) / 1000;

        console.log(`   ⏱️  Response time: ${responseTime.toFixed(2)} seconds`);

        if (responseTime > 5.0) {
            console.log('   ⚠️  Response time is slower than expected (>5s)');
        } else {
            console.log('   ✅ Response time is acceptable');
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting Frontend Integration Tests');
        console.log('='.repeat(60));
        console.log(`Testing API at: ${this.baseUrl}`);
        console.log(`Test started at: ${new Date().toISOString()}`);

        await this.testHealthEndpoint();
        await this.testHeadlinesEndpoints();
        await this.testSearchEndpoints();
        await this.testErrorHandling();
        await this.testCORS();
        await this.testPerformance();

        this.printSummary();
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log('\n📊 Test Summary');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${(this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1)}%`);

        if (this.results.errors.length > 0) {
            console.log('\n🚨 Errors:');
            this.results.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
        }

        console.log(`\nTest completed at: ${new Date().toISOString()}`);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const quickMode = args.includes('--quick');
    const baseUrl = args.find(arg => arg.startsWith('http')) || 'http://localhost:5001';

    const tester = new FrontendAPITester(baseUrl);

    if (quickMode) {
        console.log('🏃 Running quick tests only...');
        await tester.testHealthEndpoint();
        await tester.testHeadlinesEndpoints();
        await tester.testSearchEndpoints();
        tester.printSummary();
    } else {
        await tester.runAllTests();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = FrontendAPITester;
