#!/usr/bin/env python3
"""
Comprehensive test script for the Sports News Scraper API.
Tests all endpoints and validates responses.
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List


class APITester:
    """Test suite for the Sports News Scraper API."""
    
    def __init__(self, base_url: str = "http://localhost:5001"):
        """Initialize the API tester.
        
        Args:
            base_url: Base URL of the API server
        """
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'API-Tester/1.0'
        })
        
        # Test results
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200, 
                     data: Dict = None, params: Dict = None, description: str = "") -> bool:
        """Test a single API endpoint.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            expected_status: Expected HTTP status code
            data: Request body data
            params: Query parameters
            description: Test description
            
        Returns:
            True if test passed, False otherwise
        """
        try:
            url = f"{self.base_url}{endpoint}"
            print(f"\n🧪 Testing: {method} {endpoint}")
            if description:
                print(f"   Description: {description}")
            
            # Make request
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check status code
            if response.status_code == expected_status:
                print(f"   ✅ Status: {response.status_code} (expected {expected_status})")
                
                # Try to parse JSON response
                try:
                    json_data = response.json()
                    print(f"   📊 Response keys: {list(json_data.keys()) if isinstance(json_data, dict) else 'Not a dict'}")
                    
                    # Print sample data for debugging
                    if isinstance(json_data, dict) and 'articles' in json_data:
                        print(f"   📰 Articles found: {len(json_data['articles'])}")
                    elif isinstance(json_data, dict) and 'headlines' in json_data:
                        print(f"   📰 Headlines found: {len(json_data['headlines'])}")
                    
                except json.JSONDecodeError:
                    print(f"   ⚠️  Response is not valid JSON")
                
                self.results['passed'] += 1
                return True
            else:
                print(f"   ❌ Status: {response.status_code} (expected {expected_status})")
                print(f"   📝 Response: {response.text[:200]}...")
                self.results['failed'] += 1
                self.results['errors'].append(f"{method} {endpoint}: Expected {expected_status}, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"   💥 Error: {str(e)}")
            self.results['failed'] += 1
            self.results['errors'].append(f"{method} {endpoint}: {str(e)}")
            return False
    
    def test_health_endpoint(self):
        """Test the health check endpoint."""
        print("\n🏥 Testing Health Endpoint")
        print("=" * 50)
        
        self.test_endpoint(
            method="GET",
            endpoint="/health",
            expected_status=200,
            description="Health check should return service status"
        )
    
    def test_headlines_endpoints(self):
        """Test headlines endpoints."""
        print("\n📰 Testing Headlines Endpoints")
        print("=" * 50)
        
        # Test headlines for specific player
        self.test_endpoint(
            method="GET",
            endpoint="/api/headlines",
            params={"player": "LeBron James"},
            expected_status=200,
            description="Get headlines for LeBron James"
        )
        
        # Test headlines for all NBA athletes
        self.test_endpoint(
            method="GET",
            endpoint="/api/headlines",
            expected_status=200,
            description="Get headlines for all NBA athletes"
        )
        
        # Test headlines with date range
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        
        self.test_endpoint(
            method="GET",
            endpoint="/api/headlines",
            params={
                "player": "Stephen Curry",
                "from_date": week_ago.strftime("%Y-%m-%d"),
                "to_date": today.strftime("%Y-%m-%d")
            },
            expected_status=200,
            description="Get headlines with date range"
        )
    
    def test_search_endpoints(self):
        """Test search endpoints."""
        print("\n🔍 Testing Search Endpoints")
        print("=" * 50)
        
        # Test single player search
        self.test_endpoint(
            method="GET",
            endpoint="/api/search/player",
            params={
                "player": "Nikola Jokić",
                "max_results": 5
            },
            expected_status=200,
            description="Search for Nikola Jokić articles"
        )
        
        # Test single player search with date range
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        
        self.test_endpoint(
            method="GET",
            endpoint="/api/search/player",
            params={
                "player": "Jayson Tatum",
                "from_date": week_ago.strftime("%Y-%m-%d"),
                "to_date": today.strftime("%Y-%m-%d"),
                "max_results": 3
            },
            expected_status=200,
            description="Search with date range"
        )
        
        # Test NBA athletes search
        self.test_endpoint(
            method="GET",
            endpoint="/api/search/nba-athletes",
            params={"max_results_per_player": 2},
            expected_status=200,
            description="Search all NBA athletes"
        )
        
        # Test multiple players search
        multiple_players_data = {
            "players": ["Giannis Antetokounmpo", "Joel Embiid", "Donovan Mitchell"],
            "max_results_per_player": 2
        }
        
        self.test_endpoint(
            method="POST",
            endpoint="/api/search/multiple-players",
            data=multiple_players_data,
            expected_status=200,
            description="Search multiple players"
        )
    
    def test_error_handling(self):
        """Test error handling."""
        print("\n🚨 Testing Error Handling")
        print("=" * 50)
        
        # Test missing player parameter
        self.test_endpoint(
            method="GET",
            endpoint="/api/search/player",
            expected_status=400,
            description="Should return 400 for missing player parameter"
        )
        
        # Test invalid date format
        self.test_endpoint(
            method="GET",
            endpoint="/api/search/player",
            params={
                "player": "Test Player",
                "from_date": "invalid-date"
            },
            expected_status=400,
            description="Should return 400 for invalid date format"
        )
        
        # Test non-existent endpoint
        self.test_endpoint(
            method="GET",
            endpoint="/api/nonexistent",
            expected_status=404,
            description="Should return 404 for non-existent endpoint"
        )
    
    def test_performance(self):
        """Test API performance."""
        print("\n⚡ Testing Performance")
        print("=" * 50)
        
        # Test response time for headlines
        start_time = time.time()
        self.test_endpoint(
            method="GET",
            endpoint="/api/headlines",
            params={"player": "LeBron James"},
            description="Performance test for headlines"
        )
        end_time = time.time()
        response_time = end_time - start_time
        print(f"   ⏱️  Response time: {response_time:.2f} seconds")
        
        if response_time > 5.0:
            print("   ⚠️  Response time is slower than expected (>5s)")
        else:
            print("   ✅ Response time is acceptable")
    
    def run_all_tests(self):
        """Run all API tests."""
        print("🚀 Starting Sports News Scraper API Tests")
        print("=" * 60)
        print(f"Testing API at: {self.base_url}")
        print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run all test suites
        self.test_health_endpoint()
        self.test_headlines_endpoints()
        self.test_search_endpoints()
        self.test_error_handling()
        self.test_performance()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary."""
        print("\n📊 Test Summary")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🚨 Errors:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


def main():
    """Main function to run the API tests."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test the Sports News Scraper API')
    parser.add_argument('--url', default='http://localhost:5001', 
                       help='Base URL of the API server (default: http://localhost:5001)')
    parser.add_argument('--quick', action='store_true', 
                       help='Run only quick tests (skip performance tests)')
    
    args = parser.parse_args()
    
    tester = APITester(base_url=args.url)
    
    if args.quick:
        print("🏃 Running quick tests only...")
        tester.test_health_endpoint()
        tester.test_headlines_endpoints()
        tester.test_search_endpoints()
        tester.print_summary()
    else:
        tester.run_all_tests()


if __name__ == "__main__":
    main()
