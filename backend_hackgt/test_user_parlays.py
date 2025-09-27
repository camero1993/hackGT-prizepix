"""
Test script to demonstrate the refactored BettingSimulator with user-defined parlays.
This shows how the frontend can now specify exact player-stat combinations.
"""

from betting_simulator import BettingSimulator


def test_user_defined_parlays():
    """
    Test the new user-defined parlay functionality.
    Note: This assumes MongoDB is running and has data.
    """
    print("🎯 Testing User-Defined Parlays")
    print("=" * 50)
    
    try:
        # Initialize simulator
        sim = BettingSimulator()
        print("✅ Simulator initialized")
        
        # Load player thresholds
        sim.load_all_thresholds()
        print(f"✅ Loaded {len(sim.player_thresholds)} player thresholds")
        
        if len(sim.player_thresholds) == 0:
            print("❌ No player data found in database")
            return
        
        # Get some sample player IDs
        sample_players = list(sim.player_thresholds.keys())[:3]
        print(f"📊 Sample players: {sample_players}")
        
        # Test 1: Single-leg parlay
        print("\n🎮 Test 1: Single-leg parlay")
        parlays_single = [
            {"playerId": sample_players[0], "stat": "points"}
        ]
        
        result1 = sim.simulate_contract(contract_length=2, parlays=parlays_single)
        print(f"   Result: {result1.total_return_pct:+.1f}% return")
        print(f"   Games won: {result1.games_won}/{result1.games_played}")
        
        # Show detailed outcomes for first game
        if result1.game_results:
            first_game = result1.game_results[0]
            print(f"   First game details:")
            for outcome in first_game.outcomes:
                status = "✅ HIT" if outcome["hit"] else "❌ MISS"
                print(f"     {outcome['playerId']} {outcome['stat']}: {outcome['actual']:.1f} vs {outcome['threshold']:.1f} - {status}")
        
        # Test 2: Multi-leg parlay (if enough players)
        if len(sample_players) >= 2:
            print("\n🎮 Test 2: Multi-leg parlay")
            parlays_multi = [
                {"playerId": sample_players[0], "stat": "points"},
                {"playerId": sample_players[1], "stat": "rebounds"}
            ]
            
            result2 = sim.simulate_contract(contract_length=2, parlays=parlays_multi)
            print(f"   Result: {result2.total_return_pct:+.1f}% return")
            print(f"   Games won: {result2.games_won}/{result2.games_played}")
        
        # Test 3: Invalid player ID (fallback test)
        print("\n🎮 Test 3: Invalid player ID (should fail gracefully)")
        parlays_invalid = [
            {"playerId": "INVALID_ID", "stat": "points"}
        ]
        
        result3 = sim.simulate_contract(contract_length=1, parlays=parlays_invalid)
        print(f"   Result: {result3.total_return_pct:+.1f}% return (should be negative)")
        
        # Test 4: Show player info
        print("\n👥 Player threshold info:")
        for playerId in sample_players[:2]:
            info = sim.get_player_info(playerId)
            print(f"   {playerId}:")
            if "error" not in info:
                print(f"     Points ≥ {info['thresholds']['points']:.1f}")
                print(f"     Rebounds ≥ {info['thresholds']['rebounds']:.1f}")
                print(f"     Assists ≥ {info['thresholds']['assists']:.1f}")
            else:
                print(f"     {info['error']}")
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        print("   Make sure MongoDB is running and has data in the betting_app database")


def show_usage_examples():
    """
    Show code examples for frontend integration.
    """
    print("\n🔧 Frontend Integration Examples")
    print("=" * 50)
    
    print("""
# Example 1: Bet on Giannis points over his threshold
parlays = [
    {"playerId": "201939", "stat": "points"}
]
result = sim.simulate_contract(contract_length=3, parlays=parlays)

# Example 2: 3-leg parlay (all must hit to win)
parlays = [
    {"playerId": "201939", "stat": "points"},     # Giannis points
    {"playerId": "203507", "stat": "assists"},   # Player 2 assists  
    {"playerId": "1627732", "stat": "rebounds"}  # Player 3 rebounds
]
result = sim.simulate_contract(contract_length=5, parlays=parlays)

# Example 3: Check outcomes for each game
for game_result in result.game_results:
    print(f"Game {game_result.game_id}: {'WON' if game_result.parlay_hit else 'LOST'}")
    for outcome in game_result.outcomes:
        print(f"  {outcome['playerId']} {outcome['stat']}: {outcome['actual']} vs {outcome['threshold']}")

# Example 4: Get player threshold info for frontend display
player_info = sim.get_player_info("201939")
print(f"Giannis points threshold: {player_info['thresholds']['points']}")
""")


if __name__ == "__main__":
    test_user_defined_parlays()
    show_usage_examples()
