"""
FastAPI Backend for NBA Betting Simulator

This API provides endpoints for fetching NBA data and running betting contract simulations.
Integrates with the refactored BettingSimulator class for user-defined parlays.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging
from betting_simulator import BettingSimulator, ContractResult, GameResult

# -----------------------------
# Configuration
# -----------------------------
MONGO_URI = "mongodb+srv://mabugraham:JBpqaj8JjY6NWKDE@cluster0.mongodb.net"
DB_NAME = "betting_app"

# Initialize MongoDB connection
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Initialize BettingSimulator
betting_simulator = BettingSimulator(
    mongo_uri=MONGO_URI,
    db_name=DB_NAME,
    initial_balance=1000.0
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------
# FastAPI app
# -----------------------------
app = FastAPI(
    title="NBA Betting Simulator API",
    description="API for NBA player data and betting contract simulations",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Pydantic Models
# -----------------------------

class PlayerResponse(BaseModel):
    """Player information response model."""
    id: str = Field(alias="_id")
    fullName: str
    headshotUrl: Optional[str] = None
    position: Optional[str] = None
    teamId: Optional[str] = None
    active: Optional[bool] = True

    class Config:
        allow_population_by_field_name = True


class GameResponse(BaseModel):
    """Game information response model."""
    id: str = Field(alias="_id")
    gameDateUTC: datetime
    homeTeamId: str
    awayTeamId: str
    homeScore: Optional[int] = 0
    awayScore: Optional[int] = 0
    status: str

    class Config:
        allow_population_by_field_name = True


class Parlay(BaseModel):
    """Individual parlay leg definition."""
    playerId: str = Field(description="NBA player ID")
    stat: str = Field(description="Stat type: 'points', 'rebounds', or 'assists'")


class SimulationRequest(BaseModel):
    """Betting contract simulation request."""
    contract_length: int = Field(ge=1, le=10, description="Number of games in contract")
    parlays: List[Parlay] = Field(min_items=1, max_items=10, description="List of parlay legs")


class ParlayOutcome(BaseModel):
    """Individual parlay leg outcome."""
    playerId: str
    stat: str
    threshold: float
    actual: float
    hit: bool


class GameResultResponse(BaseModel):
    """Single game simulation result."""
    game_id: str
    date: str
    parlay_size: int
    outcomes: List[ParlayOutcome]
    parlay_hit: bool
    multiplier: float
    balance_before: float
    balance_after: float


class SimulationResponse(BaseModel):
    """Complete contract simulation response."""
    contract_length: int
    parlay_size: int
    initial_balance: float
    final_balance: float
    total_return_pct: float
    games_played: int
    games_won: int
    win_rate: float
    game_results: List[GameResultResponse]


class PlayerThresholdResponse(BaseModel):
    """Player threshold information."""
    playerId: str
    thresholds: Dict[str, float]
    games_analyzed: int


# -----------------------------
# Helper Functions
# -----------------------------

def convert_game_result_to_dict(game_result: GameResult) -> Dict[str, Any]:
    """Convert GameResult dataclass to dictionary for JSON serialization."""
    return {
        "game_id": game_result.game_id,
        "date": game_result.date,
        "parlay_size": game_result.parlay_size,
        "outcomes": game_result.outcomes,
        "parlay_hit": game_result.parlay_hit,
        "multiplier": game_result.multiplier,
        "balance_before": game_result.balance_before,
        "balance_after": game_result.balance_after
    }


def convert_contract_result_to_dict(contract_result: ContractResult) -> Dict[str, Any]:
    """Convert ContractResult dataclass to dictionary for JSON serialization."""
    return {
        "contract_length": contract_result.contract_length,
        "parlay_size": contract_result.parlay_size,
        "initial_balance": contract_result.initial_balance,
        "final_balance": contract_result.final_balance,
        "total_return_pct": contract_result.total_return_pct,
        "games_played": contract_result.games_played,
        "games_won": contract_result.games_won,
        "win_rate": (contract_result.games_won / contract_result.games_played * 100) if contract_result.games_played > 0 else 0,
        "game_results": [convert_game_result_to_dict(gr) for gr in contract_result.game_results]
    }


# -----------------------------
# API Routes
# -----------------------------

@app.get("/", tags=["General"])
def root():
    """Welcome endpoint."""
    return {
        "message": "Welcome to NBA Betting Simulator API 🏀",
        "version": "1.0.0",
        "endpoints": {
            "players": "/players",
            "games": "/games",
            "simulate": "/simulate",
            "player_thresholds": "/player/{player_id}/thresholds"
        }
    }


@app.get("/health", tags=["General"])
def health_check():
    """Health check endpoint."""
    try:
        # Test database connection
        db.admin.command('ping')
        
        # Test if we have data
        player_count = db.players.count_documents({})
        game_count = db.games.count_documents({})
        
        return {
            "status": "healthy",
            "database": "connected",
            "data": {
                "players": player_count,
                "games": game_count
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@app.get("/players", response_model=List[PlayerResponse], tags=["Players"])
def get_players(
    active_only: bool = Query(True, description="Return only active players"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of players to return")
):
    """
    Fetch player information from the players collection.
    Returns player ID, full name, headshot URL, and position.
    """
    try:
        query = {"active": True} if active_only else {}
        
        players = db.players.find(
            query,
            {
                "_id": 1,
                "fullName": 1,
                "headshotUrl": 1,
                "position": 1,
                "currentTeamId": 1,
                "active": 1
            }
        ).limit(limit)
        
        result = []
        for player in players:
            result.append(PlayerResponse(
                _id=player["_id"],
                fullName=player.get("fullName", "Unknown"),
                headshotUrl=player.get("headshotUrl"),
                position=player.get("position"),
                teamId=player.get("currentTeamId"),
                active=player.get("active", True)
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching players: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch players")


@app.get("/games", response_model=List[GameResponse], tags=["Games"])
def get_games(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of games to return")
):
    """
    Fetch latest games from the games collection.
    Returns game ID, date, team IDs, scores, and status.
    """
    try:
        games = db.games.find(
            {},
            {
                "_id": 1,
                "gameDateUTC": 1,
                "homeTeamId": 1,
                "awayTeamId": 1,
                "homeScore": 1,
                "awayScore": 1,
                "status": 1
            }
        ).sort("gameDateUTC", -1).limit(limit)
        
        result = []
        for game in games:
            result.append(GameResponse(
                _id=game["_id"],
                gameDateUTC=game["gameDateUTC"],
                homeTeamId=game["homeTeamId"],
                awayTeamId=game["awayTeamId"],
                homeScore=game.get("homeScore", 0),
                awayScore=game.get("awayScore", 0),
                status=game["status"]
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching games: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch games")


@app.get("/player/{player_id}/thresholds", response_model=PlayerThresholdResponse, tags=["Players"])
def get_player_thresholds(player_id: str):
    """
    Get betting thresholds for a specific player.
    Calculates thresholds based on recent performance.
    """
    try:
        # Ensure thresholds are loaded
        if not betting_simulator.player_thresholds:
            logger.info("Loading player thresholds...")
            betting_simulator.load_all_thresholds()
        
        # Get player info
        player_info = betting_simulator.get_player_info(player_id)
        
        if "error" in player_info:
            raise HTTPException(status_code=404, detail=f"Player {player_id} not found or no threshold data available")
        
        return PlayerThresholdResponse(
            playerId=player_id,
            thresholds=player_info["thresholds"],
            games_analyzed=player_info["games_analyzed"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching player thresholds: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch player thresholds")


@app.post("/simulate", response_model=SimulationResponse, tags=["Simulation"])
def simulate_contract(request: SimulationRequest):
    """
    Run a betting contract simulation with user-defined parlays.
    
    Accepts contract length and a list of parlay legs (player-stat pairs).
    Returns detailed simulation results including balance changes and game outcomes.
    """
    try:
        logger.info(f"Starting simulation: {request.contract_length} games, {len(request.parlays)} parlay legs")
        
        # Ensure thresholds are loaded
        if not betting_simulator.player_thresholds:
            logger.info("Loading player thresholds...")
            betting_simulator.load_all_thresholds()
        
        # Convert Pydantic models to dicts
        parlays = [{"playerId": p.playerId, "stat": p.stat} for p in request.parlays]
        
        # Validate stat types
        valid_stats = {"points", "rebounds", "assists"}
        for parlay in parlays:
            if parlay["stat"] not in valid_stats:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid stat type '{parlay['stat']}'. Must be one of: {valid_stats}"
                )
        
        # Run simulation
        result = betting_simulator.simulate_contract(
            contract_length=request.contract_length,
            parlays=parlays
        )
        
        # Convert to JSON-serializable format
        response_data = convert_contract_result_to_dict(result)
        
        logger.info(f"Simulation completed: {response_data['total_return_pct']:+.1f}% return")
        
        return SimulationResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@app.get("/simulate/example", tags=["Simulation"])
def get_simulation_example():
    """
    Get an example simulation request for testing purposes.
    """
    # Get some sample players
    try:
        sample_players = list(db.players.find({}, {"_id": 1}).limit(3))
        
        if len(sample_players) < 2:
            return {
                "error": "Not enough players in database for example",
                "note": "Please ensure the database has player data"
            }
        
        return {
            "example_request": {
                "contract_length": 3,
                "parlays": [
                    {"playerId": sample_players[0]["_id"], "stat": "points"},
                    {"playerId": sample_players[1]["_id"], "stat": "rebounds"}
                ]
            },
            "description": "POST this JSON to /simulate to run a sample simulation",
            "available_stats": ["points", "rebounds", "assists"]
        }
        
    except Exception as e:
        logger.error(f"Error generating example: {e}")
        return {
            "example_request": {
                "contract_length": 3,
                "parlays": [
                    {"playerId": "sample_player_id", "stat": "points"},
                    {"playerId": "another_player_id", "stat": "rebounds"}
                ]
            },
            "note": "Replace player IDs with actual values from /players endpoint"
        }


# -----------------------------
# Error Handlers
# -----------------------------

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "detail": str(exc)}


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "detail": "Something went wrong"}


# -----------------------------
# Startup Event
# -----------------------------

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    logger.info("Starting NBA Betting Simulator API...")
    
    try:
        # Test database connection
        db.admin.command('ping')
        logger.info("✅ Database connection successful")
        
        # Load player thresholds in background
        logger.info("🔄 Loading player thresholds...")
        betting_simulator.load_all_thresholds()
        logger.info(f"✅ Loaded {len(betting_simulator.player_thresholds)} player thresholds")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
