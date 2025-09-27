======================================================================
🏀 CURRENT DATABASE SCHEMA
======================================================================

📊 Collections found: 4
   • games                     |    874 documents
   • playerGameStats           |    975 documents
   • players                   |    656 documents
   • teams                     |     31 documents

📋 PLAYERS Collection:
----------------------------------------
   Schema:
     _id                  | str        | 203952
     fullName             | str        | Andrew Wiggins
     headshotUrl          | str        | https://cdn.nba.com/headshots/nba/latest/1040x760/203952.png
     currentTeamId        | str        | 1610612744
     position             | str        | SF
     active               | bool       | True

   Stats:
     Documents: 656
     Indexes: 2
   Indexes:
     • _id_                      | _id↑
     • fullName_1                | fullName↑

📋 TEAMS Collection:
----------------------------------------
   Schema:
     _id                  | str        | 1610612744
     name                 | str        | Warriors
     tricode              | str        | GSW
     city                 | str        | Golden State
     logoUrl              | str        | https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg

   Stats:
     Documents: 31
     Indexes: 2
   Indexes:
     • _id_                      | _id↑
     • tricode_1                 | tricode↑

📋 GAMES Collection:
----------------------------------------
   Schema:
     _id                  | str        | 0022400673
     season               | str        | 2024-25
     seasonType           | str        | Regular
     gameDateUTC          | datetime   | 2025-01-30 03:00:00
     homeTeamId           | str        | 1610612744
     awayTeamId           | str        | 1610612760
     homeScore            | int        | 116
     awayScore            | int        | 109
     status               | str        | Final
     venue                | str        | Unknown

   Stats:
     Documents: 874
     Indexes: 3
   Indexes:
     • _id_                      | _id↑
     • gameDateUTC_-1            | gameDateUTC↓
     • homeTeamId_1_awayTeamId_1 | homeTeamId↑ + awayTeamId↑

📋 PLAYERGAMESTATS Collection:
----------------------------------------
   Schema:
     _id                  | str        | 201939_0022400673
     gameId               | str        | 0022400673
     playerId             | str        | 201939
     teamId               | str        | 1610612744
     opponentTeamId       | str        | 1610612760
     gameDateUTC          | datetime   | 2025-01-30 03:00:00
     season               | str        | 2024-25
     seasonType           | str        | Regular
     points               | int        | 21
     rebounds             | int        | 1
     assists              | int        | 4

   Stats:
     Documents: 975
     Indexes: 4
   Indexes:
     • _id_                      | _id↑
     • playerId_1_gameId_1       | playerId↑ + gameId↑ [UNIQUE]
     • playerId_1_gameDateUTC_-1 | playerId↑ + gameDateUTC↓
     • teamId_1_gameDateUTC_-1   | teamId↑ + gameDateUTC↓

🔍 DATA INTEGRITY CHECK
----------------------------------------
   Players referenced in stats: 10
   Players in players collection: 656
   Orphaned player references: 0
   Teams referenced in stats: 10
   Teams in teams collection: 31
   Orphaned team references: 0
   Games referenced in stats: 816
   Games in games collection: 874
   Orphaned game references: 0

⭐ STAR PLAYERS STATUS:
   ✅ Giannis Antetokounmpo     | MIL | 92 games
   ✅ Nikola Jokić              | DEN | 101 games
   ✅ Stephen Curry             | GSW | 101 games
   ✅ Joel Embiid               | PHI | 88 games
   ✅ Jayson Tatum              | BOS | 98 games
   ✅ Devin Booker              | PHX | 87 games
   ✅ LeBron James              | LAL | 93 games
   ✅ Donovan Mitchell          | CLE | 95 games
   ✅ Shai Gilgeous-Alexander   | OKC | 111 games
   ✅ Tyrese Haliburton         | IND | 109 games

✅ Schema check completed!