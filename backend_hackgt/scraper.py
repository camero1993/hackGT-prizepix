import requests
import pandas as pd

# Milwaukee Bucks core players
PLAYERS = {
    203507: "Giannis Antetokounmpo",
    203114: "Khris Middleton",
    201950: "Jrue Holiday",
    201572: "Brook Lopez"
}

# Add 10 Bucks game IDs (regular season or playoffs)
GAME_IDS = [
    "0042000402", "0042000403", "0042000404", "0042000405",
    "0042000406", "0042000407", "0022100001", "0022100002",
    "0022100003", "0022100004"
]

BASE_URL = "https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{}.json"

records = []

for gid in GAME_IDS:
    url = BASE_URL.format(gid)
    try:
        data = requests.get(url).json()
        game_date = data['game']['gameTimeUTC']
        for team in ['homeTeam', 'awayTeam']:
            for player in data['game'][team]['players']:
                pid = player['personId']
                if pid in PLAYERS:
                    stats = player['statistics']
                    records.append({
                        "gameId": gid,
                        "date": game_date,
                        "player": PLAYERS[pid],
                        "points": stats.get("points", 0),
                        "rebounds": stats.get("reboundsTotal", 0),
                        "assists": stats.get("assists", 0)
                    })
    except Exception as e:
        print(f"Failed to fetch game {gid}: {e}")

# Create DataFrame sorted by date
df = pd.DataFrame(records).sort_values(by=["player", "date"])
print(df)

# Save to CSV
df.to_csv("bucks_player_stats_10games.csv", index=False)