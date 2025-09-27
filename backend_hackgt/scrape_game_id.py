import requests
import pandas as pd
from nba_api.stats.static import teams
from nba_api.stats.endpoints import leaguegamefinder

# ---------------------------
# STEP 1: Get Milwaukee Bucks ID
# ---------------------------
bucks = teams.find_team_by_abbreviation("MIL")
bucks_id = bucks["id"]  # 1610612749

# ---------------------------
# STEP 2: Get Bucks Games (2024-25 season)
# ---------------------------
gamefinder = leaguegamefinder.LeagueGameFinder(
    team_id_nullable=bucks_id,
    season_nullable="2024-25"
)

games_df = gamefinder.get_data_frames()[0]

# Sort by date (most recent first) and get 10 games
games_df = games_df.sort_values("GAME_DATE", ascending=False)
game_ids = games_df["GAME_ID"].tolist()[:10]

print(f"Fetched {len(game_ids)} games for the Bucks")

# ---------------------------
# STEP 3: Define players of interest (by name)
# ---------------------------
players_of_interest = {
    "Giannis Antetokounmpo": None,
    "Khris Middleton": None,
    "Brook Lopez": None,
    "Damian Lillard": None
}

# ---------------------------
# STEP 4: Extract boxscores for each game
# ---------------------------
all_stats = []

for gid in game_ids:
    url = f"https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gid}.json"
    resp = requests.get(url)

    if resp.status_code != 200:
        print(f"Failed to fetch game {gid}")
        continue

    data = resp.json()
    game = data.get("game", {})
    date = game.get("gameTimeUTC", "N/A")

    # Both teams
    for team_key in ["homeTeam", "awayTeam"]:
        team = game.get(team_key, {})
        players = team.get("players", [])

        for p in players:
            name = p["name"]
            stats = p.get("statistics", {})

            if name in players_of_interest:
                all_stats.append({
                    "gameId": gid,
                    "date": date,
                    "player": name,
                    "points": stats.get("points", 0),
                    "rebounds": stats.get("reboundsTotal", 0),
                    "assists": stats.get("assists", 0)
                })

# ---------------------------
# STEP 5: Save to DataFrame
# ---------------------------
df = pd.DataFrame(all_stats)

print("\n=== Player Stats (Last 10 Games) ===")
print(df)

# Save to CSV for later
df.to_csv("bucks_last10_games.csv", index=False)
print("\nSaved to bucks_last10_games.csv ✅")