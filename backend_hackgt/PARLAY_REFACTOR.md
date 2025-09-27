# 🎯 BettingSimulator Parlay Refactor

## Overview
The BettingSimulator has been refactored to support **user-defined parlays** instead of auto-selected player combinations. This gives the frontend complete control over betting strategies.

---

## 🔄 **Key Changes**

### 1. **New Parlay Input Format**
```python
# OLD: Auto-selected players
sim.simulate_contract(contract_length=3, parlay_size=2)

# NEW: User-defined parlays
parlays = [
    {"playerId": "201939", "stat": "points"},
    {"playerId": "203507", "stat": "assists"},
    {"playerId": "1627732", "stat": "rebounds"}
]
sim.simulate_contract(contract_length=3, parlays=parlays)
```

### 2. **Updated Method Signatures**
```python
# simulate_game() - now accepts parlays list
def simulate_game(self, gameId: str, parlays: List[dict], multiplier: float, balance: float) -> GameResult

# simulate_contract() - now accepts parlays instead of parlay_size  
def simulate_contract(self, contract_length: int, parlays: List[dict]) -> ContractResult
```

### 3. **Enhanced Outcome Tracking**
```python
# Each parlay leg now returns detailed outcome:
{
    "playerId": "201939",
    "stat": "points", 
    "threshold": 28.5,
    "actual": 30,
    "hit": True
}
```

---

## 🎮 **How It Works**

### **Parlay Evaluation Process**
1. **Input**: Frontend provides specific player-stat combinations
2. **Lookup**: System fetches threshold for that player's chosen stat
3. **Compare**: Actual game performance vs threshold
4. **Result**: Individual leg outcome (hit/miss)
5. **Parlay**: ALL legs must hit to win (strict mode)

### **Fallback Handling**
- Invalid `playerId` → `hit: False`
- Invalid `stat` → `hit: False`  
- Player didn't play in game → `hit: False`
- No threshold data → `hit: False`

---

## 🛠️ **Frontend Integration**

### **Example 1: Single-Leg Parlay**
```python
# Bet on Giannis scoring over his points threshold
parlays = [
    {"playerId": "201939", "stat": "points"}
]
result = sim.simulate_contract(contract_length=3, parlays=parlays)

# Result structure
print(f"Return: {result.total_return_pct:+.1f}%")
print(f"Win rate: {result.games_won}/{result.games_played}")
```

### **Example 2: Multi-Leg Parlay** 
```python
# Bet on 3 different player-stat combinations
parlays = [
    {"playerId": "201939", "stat": "points"},     # Giannis points
    {"playerId": "203507", "stat": "assists"},   # Dame assists
    {"playerId": "1627732", "stat": "rebounds"}  # Brook rebounds
]
result = sim.simulate_contract(contract_length=5, parlays=parlays)

# All 3 players must hit their respective thresholds to win
```

### **Example 3: Detailed Game Analysis**
```python
for game_result in result.game_results:
    print(f"Game {game_result.game_id}: {'WON' if game_result.parlay_hit else 'LOST'}")
    
    for outcome in game_result.outcomes:
        status = "✅" if outcome["hit"] else "❌"
        print(f"  {outcome['playerId']} {outcome['stat']}: "
              f"{outcome['actual']:.1f} vs {outcome['threshold']:.1f} {status}")
```

---

## 📊 **Benefits**

### **For Frontend**
- **Complete Control**: Choose exact player-stat combinations
- **Flexible Strategy**: Mix different stats (points + rebounds + assists)
- **Clear Feedback**: Detailed outcome for each parlay leg
- **Easy Integration**: Simple dict-based API

### **For Users**
- **Strategic Betting**: Target specific player strengths
- **Transparent Results**: See exactly why parlays won/lost
- **Custom Risk**: Choose parlay complexity (1-leg safe vs 5-leg risky)

### **For Analysis**
- **Granular Data**: Track performance by player and stat type
- **Strategy Testing**: Compare different parlay compositions
- **Risk Assessment**: Understand multi-leg parlay difficulty

---

## 🧪 **Testing**

### **Run Tests**
```bash
python test_user_parlays.py
```

### **Test Scenarios**
- ✅ Single-leg parlays
- ✅ Multi-leg parlays  
- ✅ Invalid player IDs (graceful failure)
- ✅ Mixed stat types
- ✅ Threshold lookup accuracy

---

## 🔙 **Backwards Compatibility**

### **Legacy Support**
```python
# Old method still available for existing code
result = sim.simulate_contract_legacy(contract_length=3, parlay_size=2)
```

### **Migration Path**
1. **Phase 1**: Use new API for new features
2. **Phase 2**: Gradually migrate existing functionality  
3. **Phase 3**: Deprecate legacy methods

---

## 📋 **Data Structures**

### **Input Format**
```python
parlays = [
    {
        "playerId": "201939",    # NBA player ID
        "stat": "points"         # "points", "rebounds", or "assists"
    }
]
```

### **Output Format**
```python
GameResult.outcomes = [
    {
        "playerId": "201939",
        "stat": "points",
        "threshold": 28.5,       # Player's calculated threshold
        "actual": 30,            # Actual game performance  
        "hit": True              # Whether threshold was exceeded
    }
]
```

---

## 🚀 **Usage Examples**

### **Conservative Strategy (High Win Rate)**
```python
# Single-leg parlays on reliable performers
parlays = [{"playerId": "reliable_player_id", "stat": "points"}]
```

### **Aggressive Strategy (High Multiplier)**
```python
# 5-leg parlay for maximum payout
parlays = [
    {"playerId": "player1", "stat": "points"},
    {"playerId": "player2", "stat": "rebounds"}, 
    {"playerId": "player3", "stat": "assists"},
    {"playerId": "player4", "stat": "points"},
    {"playerId": "player5", "stat": "rebounds"}
]
```

### **Balanced Strategy (Mixed Stats)**
```python
# Target different stat categories
parlays = [
    {"playerId": "scorer_id", "stat": "points"},
    {"playerId": "rebounder_id", "stat": "rebounds"},
    {"playerId": "playmaker_id", "stat": "assists"}
]
```

---

## 💡 **Next Steps**

### **Potential Enhancements**
1. **Per-Game Parlays**: Different parlays for each game in contract
2. **Stat Combinations**: "points + rebounds" hybrid stats
3. **Dynamic Thresholds**: Adjust based on opponent, home/away, etc.
4. **Player Grouping**: Team-based or position-based parlays
5. **Advanced Multipliers**: Stat-specific risk adjustments

### **Frontend Features**
1. **Parlay Builder**: Drag-and-drop interface
2. **Strategy Templates**: Pre-built parlay combinations  
3. **Risk Calculator**: Show win probability estimates
4. **Player Recommendations**: Suggest high-value parlays

---

## ✅ **Requirements Fulfilled**

- ✅ **User-defined parlays** with player-stat pairs
- ✅ **Threshold lookup** from `player_thresholds`
- ✅ **Strict parlay rules** (all legs must hit)
- ✅ **10% bet amount** maintained
- ✅ **Contract simulation** with consistent parlays
- ✅ **Detailed outcome objects** with all required fields
- ✅ **Graceful fallback** for missing data
- ✅ **Clear API** for frontend integration

The refactored BettingSimulator now provides complete flexibility for user-defined betting strategies while maintaining all existing functionality and performance characteristics.
