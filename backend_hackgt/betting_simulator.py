from pymongo import MongoClient
from dataclasses import dataclass, field
from typing import Dict, List
import pandas as pd
from datetime import datetime

# ==============================
# Data Classes
# ==============================
@dataclass
class PlayerThreshold:
    player: str
    points_threshold: float
    rebounds_threshold: float
    assists_threshold: float
    games_analyzed: int


@dataclass
class GameResult:
    game_id: str
    date: str
    parlay_size: int
    outcomes: List[dict]  # List of parlay leg results with playerId, stat, threshold, actual, hit
    parlay_hit: bool
    multiplier: float
    balance_before: float
    balance_after: float


@dataclass
class ContractResult:
    contract_length: int
    parlay_size: int
    initial_balance: float
    final_balance: float
    total_return_pct: float
    games_played: int
    games_won: int
    game_results: List[GameResult] = field(default_factory=list)


# ==============================
# Betting Simulator with Mongo
# ==============================
class BettingSimulator:
    def __init__(self, mongo_uri="mongodb://localhost:27017/",
                 db_name="betting_app",
                 initial_balance: float = 1000.0):
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.initial_balance = initial_balance
        self.player_thresholds: Dict[str, PlayerThreshold] = {}

    # ----------------------------
    # Load Player Thresholds
    # ----------------------------
    def calculate_player_thresholds(self, playerId: str, lookback_games: int = 5) -> PlayerThreshold | None:
        pipeline = [
            {"$match": {"playerId": playerId}},
            {"$sort": {"gameDateUTC": -1}},
            {"$limit": lookback_games},
            {"$group": {
                "_id": "$playerId",
                "points_avg": {"$avg": "$points"},
                "rebounds_avg": {"$avg": "$rebounds"},
                "assists_avg": {"$avg": "$assists"},
                "count": {"$sum": 1}
            }}
        ]
        result = list(self.db.playerGameStats.aggregate(pipeline))
        if not result:
            return None

        r = result[0]
        return PlayerThreshold(
            player=playerId,
            points_threshold=r["points_avg"],
            rebounds_threshold=r["rebounds_avg"],
            assists_threshold=r["assists_avg"],
            games_analyzed=r["count"]
        )

    def load_all_thresholds(self, lookback_games: int = 5):
        player_ids = self.db.playerGameStats.distinct("playerId")
        for pid in player_ids:
            t = self.calculate_player_thresholds(pid, lookback_games)
            if t:
                self.player_thresholds[pid] = t

    # ----------------------------
    # Helpers
    # ----------------------------
    def is_outlier_game(self, gameId: str) -> bool:
        stats = list(self.db.playerGameStats.find({"gameId": gameId}))
        return all(s["points"] == 0 and s["rebounds"] == 0 and s["assists"] == 0 for s in stats)

    def get_multiplier(self, contract_length: int, parlay_size: int) -> float:
        base = {1: 1.8, 2: 3.5, 3: 6.0, 5: 15.0}
        adj = {2: 1.3, 3: 1.15, 5: 1.0}
        return base.get(parlay_size, 2.0) * adj.get(contract_length, 1.0)

    # ----------------------------
    # Simulation
    # ----------------------------
    def simulate_game(self, gameId: str, parlays: List[dict], multiplier: float, balance: float) -> GameResult:
        """
        Simulate betting on a single game with user-defined parlays.
        
        Args:
            gameId: The game to simulate
            parlays: List of dicts with format [{"playerId": "201939", "stat": "points"}, ...]
            multiplier: Winning multiplier
            balance: Current account balance
            
        Returns:
            GameResult with detailed parlay leg outcomes
        """
        stats = list(self.db.playerGameStats.find({"gameId": gameId}))
        if not stats:
            return GameResult(gameId, "Unknown", len(parlays), [], False, multiplier, balance, balance)

        game_date = stats[0]["gameDateUTC"].strftime("%Y-%m-%d")
        
        # Create lookup dict for player stats
        player_stats = {s["playerId"]: s for s in stats}

        outcomes = []
        for parlay_leg in parlays:
            playerId = parlay_leg["playerId"]
            stat = parlay_leg["stat"]
            
            # Default to failed if player/threshold not found
            hit = False
            actual_value = 0
            threshold = 0
            
            # Check if player has threshold data
            if playerId in self.player_thresholds:
                threshold_data = self.player_thresholds[playerId]
                
                # Get the appropriate threshold
                if stat == "points":
                    threshold = threshold_data.points_threshold
                elif stat == "rebounds":
                    threshold = threshold_data.rebounds_threshold
                elif stat == "assists":
                    threshold = threshold_data.assists_threshold
                else:
                    # Invalid stat type - mark as failed
                    hit = False
                
                # Check if player played in this game
                if playerId in player_stats:
                    game_stats = player_stats[playerId]
                    actual_value = game_stats.get(stat, 0)
                    hit = actual_value >= threshold
            
            # Record the outcome for this parlay leg
            outcomes.append({
                "playerId": playerId,
                "stat": stat,
                "threshold": threshold,
                "actual": actual_value,
                "hit": hit
            })

        # Parlay hits only if ALL legs hit (strict mode)
        parlay_hit = len(outcomes) > 0 and all(outcome["hit"] for outcome in outcomes)

        # Calculate balance change
        bet_amount = balance * 0.1
        if parlay_hit:
            new_balance = balance - bet_amount + (bet_amount * multiplier)
        else:
            new_balance = balance - bet_amount

        return GameResult(gameId, game_date, len(parlays), outcomes, parlay_hit, multiplier, balance, new_balance)

    def simulate_contract(self, contract_length: int, parlays: List[dict]) -> ContractResult:
        """
        Simulate a complete betting contract with user-defined parlays.
        
        Args:
            contract_length: Number of games in the contract
            parlays: List of parlay leg definitions [{"playerId": "201939", "stat": "points"}, ...]
            
        Returns:
            ContractResult with complete simulation results
        """
        games = list(self.db.games.find().sort("gameDateUTC", -1).limit(contract_length * 2))
        valid_games = [g["_id"] for g in games if not self.is_outlier_game(g["_id"])]
        games_to_play = valid_games[:contract_length]

        balance = self.initial_balance
        results = []
        parlay_size = len(parlays)
        multiplier = self.get_multiplier(contract_length, parlay_size)

        for g in games_to_play:
            res = self.simulate_game(g, parlays, multiplier, balance)
            results.append(res)
            balance = res.balance_after

        won = sum(1 for r in results if r.parlay_hit)
        pct = ((balance - self.initial_balance) / self.initial_balance) * 100

        return ContractResult(contract_length, parlay_size, self.initial_balance,
                              balance, pct, len(results), won, results)

    # ----------------------------
    # Convenience Methods
    # ----------------------------
    def simulate_contract_legacy(self, contract_length: int, parlay_size: int) -> ContractResult:
        """
        Legacy method for backwards compatibility - auto-selects players.
        For new code, use simulate_contract() with explicit parlays.
        """
        # Get available players with thresholds
        available_players = list(self.player_thresholds.keys())
        if len(available_players) < parlay_size:
            raise ValueError(f"Not enough players with thresholds ({len(available_players)}) for parlay size {parlay_size}")
        
        # Create default parlays (points bets for top players)
        parlays = []
        for i in range(parlay_size):
            parlays.append({
                "playerId": available_players[i],
                "stat": "points"  # Default to points
            })
        
        return self.simulate_contract(contract_length, parlays)

    def get_player_info(self, playerId: str) -> dict:
        """
        Get player threshold information for frontend display.
        """
        if playerId not in self.player_thresholds:
            return {"error": f"No threshold data for player {playerId}"}
        
        threshold = self.player_thresholds[playerId]
        return {
            "playerId": playerId,
            "thresholds": {
                "points": threshold.points_threshold,
                "rebounds": threshold.rebounds_threshold,
                "assists": threshold.assists_threshold
            },
            "games_analyzed": threshold.games_analyzed
        }


# ==============================
# Example Usage & Testing
# ==============================
def example_usage():
    """
    Example of how to use the refactored BettingSimulator with user-defined parlays.
    """
    print("🎯 BettingSimulator with User-Defined Parlays")
    print("=" * 50)
    
    # Initialize simulator
    sim = BettingSimulator()
    
    # Load all player thresholds
    sim.load_all_thresholds()
    
    # Example 1: Single-leg parlay (betting on one player's points)
    print("\n📋 Example 1: Single-leg parlay")
    parlays_single = [
        {"playerId": "201939", "stat": "points"}  # Bet on specific player's points
    ]
    
    try:
        result = sim.simulate_contract(contract_length=3, parlays=parlays_single)
        print(f"Result: {result.total_return_pct:+.1f}% return")
        
        # Show detailed outcomes
        for game_result in result.game_results:
            print(f"  Game {game_result.game_id}: {'WON' if game_result.parlay_hit else 'LOST'}")
            for outcome in game_result.outcomes:
                hit_status = "✅" if outcome["hit"] else "❌"
                print(f"    {outcome['playerId']} {outcome['stat']}: {outcome['actual']:.1f} vs {outcome['threshold']:.1f} {hit_status}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 2: Multi-leg parlay (betting on multiple player-stat combinations)
    print("\n📋 Example 2: Multi-leg parlay")
    parlays_multi = [
        {"playerId": "201939", "stat": "points"},
        {"playerId": "203507", "stat": "assists"},
        {"playerId": "1627732", "stat": "rebounds"}
    ]
    
    try:
        result = sim.simulate_contract(contract_length=3, parlays=parlays_multi)
        print(f"Result: {result.total_return_pct:+.1f}% return")
        print(f"Win rate: {result.games_won}/{result.games_played} ({result.games_won/result.games_played*100:.1f}%)")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 3: Show available players and their thresholds
    print("\n👥 Available Players:")
    for playerId in list(sim.player_thresholds.keys())[:5]:  # Show first 5
        info = sim.get_player_info(playerId)
        if "error" not in info:
            print(f"  {playerId}:")
            print(f"    Points ≥ {info['thresholds']['points']:.1f}")
            print(f"    Rebounds ≥ {info['thresholds']['rebounds']:.1f}")
            print(f"    Assists ≥ {info['thresholds']['assists']:.1f}")


if __name__ == "__main__":
    example_usage()