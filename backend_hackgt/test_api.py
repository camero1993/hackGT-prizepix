"""
Test script for the NBA Betting Simulator FastAPI backend.
Tests all endpoints and demonstrates usage.
"""

import requests
import json
from typing import Dict, Any

# API base URL (adjust if running on different host/port)
BASE_URL = "http://localhost:8000"


def test_endpoint(endpoint: str, method: str = "GET", data: Dict[Any, Any] = None) -> Dict[Any, Any]:
    """Test a single API endpoint."""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return {
            "success": True,
            "status_code": response.status_code,
            "data": response.json()
        }
        
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": str(e),
            "status_code": getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None
        }


def run_api_tests():
    """Run comprehensive API tests."""
    print("🧪 Testing NBA Betting Simulator API")
    print("=" * 50)
    
    # Test 1: Root endpoint
    print("\n1️⃣ Testing root endpoint...")
    result = test_endpoint("/")
    if result["success"]:
        print("✅ Root endpoint working")
        print(f"   Message: {result['data']['message']}")
    else:
        print(f"❌ Root endpoint failed: {result['error']}")
        return
    
    # Test 2: Health check
    print("\n2️⃣ Testing health check...")
    result = test_endpoint("/health")
    if result["success"]:
        print("✅ Health check passed")
        print(f"   Status: {result['data']['status']}")
        print(f"   Database: {result['data']['database']}")
    else:
        print(f"❌ Health check failed: {result['error']}")
    
    # Test 3: Get players
    print("\n3️⃣ Testing players endpoint...")
    result = test_endpoint("/players?limit=5")
    if result["success"]:
        players = result["data"]
        print(f"✅ Players endpoint working - found {len(players)} players")
        if players:
            print(f"   Sample player: {players[0]['fullName']} (ID: {players[0]['id']})")
            sample_player_id = players[0]['id']
        else:
            print("   ⚠️ No players found in database")
            sample_player_id = None
    else:
        print(f"❌ Players endpoint failed: {result['error']}")
        sample_player_id = None
    
    # Test 4: Get games
    print("\n4️⃣ Testing games endpoint...")
    result = test_endpoint("/games?limit=3")
    if result["success"]:
        games = result["data"]
        print(f"✅ Games endpoint working - found {len(games)} games")
        if games:
            print(f"   Sample game: {games[0]['id']} on {games[0]['gameDateUTC'][:10]}")
    else:
        print(f"❌ Games endpoint failed: {result['error']}")
    
    # Test 5: Get player thresholds (if we have a player)
    if sample_player_id:
        print(f"\n5️⃣ Testing player thresholds for {sample_player_id}...")
        result = test_endpoint(f"/player/{sample_player_id}/thresholds")
        if result["success"]:
            print("✅ Player thresholds endpoint working")
            thresholds = result["data"]["thresholds"]
            print(f"   Points threshold: {thresholds['points']:.1f}")
            print(f"   Rebounds threshold: {thresholds['rebounds']:.1f}")
            print(f"   Assists threshold: {thresholds['assists']:.1f}")
        else:
            print(f"❌ Player thresholds failed: {result['error']}")
    
    # Test 6: Get simulation example
    print("\n6️⃣ Testing simulation example...")
    result = test_endpoint("/simulate/example")
    if result["success"]:
        print("✅ Simulation example endpoint working")
        example = result["data"]["example_request"]
        print(f"   Example contract length: {example['contract_length']}")
        print(f"   Example parlays: {len(example['parlays'])} legs")
    else:
        print(f"❌ Simulation example failed: {result['error']}")
    
    # Test 7: Run actual simulation (if we have players)
    if sample_player_id:
        print(f"\n7️⃣ Testing actual simulation...")
        
        # Get a second player for multi-leg parlay
        result = test_endpoint("/players?limit=10")
        if result["success"] and len(result["data"]) >= 2:
            players = result["data"]
            
            simulation_data = {
                "contract_length": 2,
                "parlays": [
                    {"playerId": players[0]["id"], "stat": "points"},
                    {"playerId": players[1]["id"], "stat": "rebounds"}
                ]
            }
            
            print(f"   Simulating: {players[0]['fullName']} points + {players[1]['fullName']} rebounds")
            
            result = test_endpoint("/simulate", method="POST", data=simulation_data)
            if result["success"]:
                sim_result = result["data"]
                print("✅ Simulation successful!")
                print(f"   Return: {sim_result['total_return_pct']:+.1f}%")
                print(f"   Win rate: {sim_result['games_won']}/{sim_result['games_played']}")
                print(f"   Final balance: ${sim_result['final_balance']:.2f}")
                
                # Show game details
                for i, game in enumerate(sim_result['game_results'], 1):
                    status = "🎉 WON" if game['parlay_hit'] else "💸 LOST"
                    print(f"   Game {i}: {status} (${game['balance_before']:.2f} → ${game['balance_after']:.2f})")
                    
            else:
                print(f"❌ Simulation failed: {result['error']}")
        else:
            print("   ⚠️ Not enough players for multi-leg parlay test")
    
    print("\n🎯 API Testing Complete!")
    print("   If all tests passed, your FastAPI backend is ready!")


def test_simulation_scenarios():
    """Test different simulation scenarios."""
    print("\n🎮 Testing Various Simulation Scenarios")
    print("=" * 50)
    
    # Get some players first
    result = test_endpoint("/players?limit=5")
    if not result["success"] or not result["data"]:
        print("❌ Cannot test simulations - no players available")
        return
    
    players = result["data"]
    print(f"Using {len(players)} players for scenario testing...")
    
    scenarios = [
        {
            "name": "Conservative (1-leg)",
            "data": {
                "contract_length": 3,
                "parlays": [{"playerId": players[0]["id"], "stat": "points"}]
            }
        },
        {
            "name": "Moderate (2-leg)",
            "data": {
                "contract_length": 3,
                "parlays": [
                    {"playerId": players[0]["id"], "stat": "points"},
                    {"playerId": players[1]["id"], "stat": "rebounds"}
                ]
            }
        }
    ]
    
    if len(players) >= 3:
        scenarios.append({
            "name": "Aggressive (3-leg)",
            "data": {
                "contract_length": 2,
                "parlays": [
                    {"playerId": players[0]["id"], "stat": "points"},
                    {"playerId": players[1]["id"], "stat": "rebounds"},
                    {"playerId": players[2]["id"], "stat": "assists"}
                ]
            }
        })
    
    for scenario in scenarios:
        print(f"\n🎯 {scenario['name']} Strategy:")
        result = test_endpoint("/simulate", method="POST", data=scenario["data"])
        
        if result["success"]:
            sim = result["data"]
            print(f"   Return: {sim['total_return_pct']:+.1f}%")
            print(f"   Win Rate: {sim['win_rate']:.1f}%")
            print(f"   Risk Level: {len(scenario['data']['parlays'])}-leg parlay")
        else:
            print(f"   ❌ Failed: {result['error']}")


if __name__ == "__main__":
    print("🏀 NBA Betting Simulator API Test Suite")
    print("Make sure the API server is running on http://localhost:8000")
    print("Start with: python app.py or uvicorn app:app --reload")
    print()
    
    # Run basic API tests
    run_api_tests()
    
    # Run simulation scenario tests
    test_simulation_scenarios()
    
    print("\n💡 Next Steps:")
    print("   - Open http://localhost:8000/docs for interactive API documentation")
    print("   - Use the /simulate endpoint with your frontend")
    print("   - Check /simulate/example for request format")
