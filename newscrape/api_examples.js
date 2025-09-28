// Example Node.js/React API calls for the Sports News Scraper API

const API_BASE_URL = 'http://localhost:5001';

// Example 1: Search for a single player
async function searchPlayer(playerName, fromDate = null, toDate = null, maxResults = 10) {
    try {
        const params = new URLSearchParams({
            player: playerName,
            max_results: maxResults.toString()
        });
        
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        
        const response = await fetch(`${API_BASE_URL}/api/search/player?${params}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('Error searching for player:', error);
        throw error;
    }
}

// Example 2: Search for multiple players
async function searchMultiplePlayers(players, fromDate = null, toDate = null, maxResultsPerPlayer = 5) {
    try {
        const requestBody = {
            players: players,
            max_results_per_player: maxResultsPerPlayer
        };
        
        if (fromDate) requestBody.from_date = fromDate;
        if (toDate) requestBody.to_date = toDate;
        
        const response = await fetch(`${API_BASE_URL}/api/search/multiple-players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('Error searching for multiple players:', error);
        throw error;
    }
}

// Example 3: Search for all 10 NBA athletes
async function searchNBAAthletes(fromDate = null, toDate = null, maxResultsPerPlayer = 3) {
    try {
        const params = new URLSearchParams({
            max_results_per_player: maxResultsPerPlayer.toString()
        });
        
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        
        const response = await fetch(`${API_BASE_URL}/api/search/nba-athletes?${params}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('Error searching for NBA athletes:', error);
        throw error;
    }
}

// Example 4: Get simple headlines
async function getHeadlines(playerName = null, fromDate = null, toDate = null) {
    try {
        const params = new URLSearchParams();
        if (playerName) params.append('player', playerName);
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        
        const response = await fetch(`${API_BASE_URL}/api/headlines?${params}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('Error getting headlines:', error);
        throw error;
    }
}

// Example 5: Health check
async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

// React component example
const React = require('react');
const { useState, useEffect } = require('react');

function SportsNewsApp() {
    const [headlines, setHeadlines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [playerName, setPlayerName] = useState('LeBron James');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const handleGetHeadlines = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await getHeadlines(playerName, fromDate || null, toDate || null);
            setHeadlines(data.headlines || data.top_headlines || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGetAllNBAHeadlines = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await getHeadlines(null, fromDate || null, toDate || null);
            // Flatten all athlete headlines into a single array
            const allHeadlines = [];
            Object.values(data.athlete_headlines || {}).forEach(athleteHeadlines => {
                if (Array.isArray(athleteHeadlines)) {
                    allHeadlines.push(...athleteHeadlines);
                }
            });
            setHeadlines(allHeadlines);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sports-news-app">
            <h1>🏀 Sports News Scraper</h1>
            
            <div className="search-form">
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name"
                />
                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="From date (optional)"
                />
                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="To date (optional)"
                />
                <button onClick={handleGetHeadlines} disabled={loading}>
                    {loading ? 'Getting Headlines...' : 'Get Player Headlines'}
                </button>
                <button onClick={handleGetAllNBAHeadlines} disabled={loading}>
                    {loading ? 'Getting Headlines...' : 'Get All NBA Headlines'}
                </button>
            </div>

            {error && <div className="error">Error: {error}</div>}

            <div className="headlines">
                <h2>Top Headlines ({headlines.length})</h2>
                {headlines.map((headline, index) => (
                    <div key={index} className="headline-item">
                        <h3>{headline.title}</h3>
                        <a href={headline.url} target="_blank" rel="noopener noreferrer">
                            Read article →
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Usage examples
async function runExamples() {
    console.log('🏀 Sports News Scraper API Examples\n');
    
    try {
        // Health check
        console.log('1. Health Check:');
        const health = await healthCheck();
        console.log(health);
        console.log('');
        
        // Get headlines for LeBron James
        console.log('2. Get headlines for LeBron James:');
        const lebronHeadlines = await getHeadlines('LeBron James', '2025-09-25', '2025-09-27');
        console.log(`Found ${lebronHeadlines.count} headlines:`);
        lebronHeadlines.headlines.forEach((headline, i) => {
            console.log(`  ${i + 1}. ${headline.title}`);
            console.log(`     URL: ${headline.url}`);
        });
        console.log('');
        
        // Search multiple players
        console.log('3. Search for multiple players:');
        const multiData = await searchMultiplePlayers(
            ['Stephen Curry', 'LeBron James'], 
            '2025-09-25', 
            '2025-09-27', 
            3
        );
        console.log(`Total articles: ${multiData.total_articles}`);
        Object.entries(multiData.results).forEach(([player, data]) => {
            console.log(`  ${player}: ${data.count} articles`);
        });
        console.log('');
        
        // Get all NBA headlines
        console.log('4. Get all NBA headlines:');
        const nbaHeadlines = await getHeadlines(null, '2025-09-25', '2025-09-27');
        console.log(`Top 3 headlines from ${nbaHeadlines.total_found} total:`);
        nbaHeadlines.top_headlines.forEach((headline, i) => {
            console.log(`  ${i + 1}. ${headline.title}`);
            console.log(`     URL: ${headline.url}`);
        });
        console.log('');
        
        // Show individual athlete headlines
        console.log('5. Individual athlete headlines:');
        Object.entries(nbaHeadlines.athlete_headlines).forEach(([athlete, headlines]) => {
            if (headlines && headlines.length > 0) {
                console.log(`  ${athlete} (${headlines.length} articles):`);
                headlines.forEach((headline, i) => {
                    console.log(`    ${i + 1}. ${headline.title}`);
                    console.log(`       URL: ${headline.url}`);
                });
            }
        });
        
    } catch (error) {
        console.error('Example failed:', error);
    }
}

// Export for use in other modules
module.exports = {
    searchPlayer,
    searchMultiplePlayers,
    searchNBAAthletes,
    getHeadlines,
    healthCheck,
    SportsNewsApp,
    runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples();
}
