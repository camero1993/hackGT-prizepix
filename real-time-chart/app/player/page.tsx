"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import Link from "next/link";
import { searchPlayers, getTeamById, Player, Team } from "@/lib/api";
import { NewsSnippet, NewsSnippetsContainer } from "../../../search-page/news-snippet";
import { NewsApiService, NewsSnippetData } from "@/lib/newsApi";

// Mock data for player stock price
const stockData = [
  { date: "Jan 1", price: 45.2, volume: 1200 },

  { date: "Mar 5", price: 67.2, volume: 2680 },
];
// State
// Mock portfolio data
const portfolioData = [
  {
    player: "Please Search For A Player",
    position: "QB",
    shares: 150,
    currentPrice: 67.2,
    roi: 12.5,
  },
  {
    player: "Christian McCaffrey",
    position: "RB",
    shares: 200,
    currentPrice: 45.8,
    roi: -3.2,
  },
  {
    player: "Tyreek Hill",
    position: "WR",
    shares: 100,
    currentPrice: 52.1,
    roi: 8.7,
  },
  {
    player: "Travis Kelce",
    position: "TE",
    shares: 75,
    currentPrice: 38.9,
    roi: 15.3,
  },
];

const PLAYER_SELECTION_COUNT = 3;


function PlayerSelector({
  index,
  value,
  onChange,
  selectedPlayers,
}: {
  index: number;
  value: Player | null;
  onChange: (index: number, player: Player) => void;
  selectedPlayers: (Player | null)[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length > 1) {
      setIsSearching(true);
      try {
        let players = await searchPlayers(q, 500);
        // 🚫 Filter out already selected players
        const selectedIds = selectedPlayers
          .filter(Boolean)
          .map((p) => (p as Player).id);
        players = players.filter((p) => !selectedIds.includes(p.id));

        setResults(players);
      } finally {
        setIsSearching(false);
      }
    } else {
      setResults([]);
    }
  };

  return (
    <div className="relative mb-2">
      <Input
        placeholder={`Search Player ${index + 1}`}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="text-white placeholder-gray-400 bg-black"
      />
      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card text-center p-2">
          Searching...
        </div>
      )}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
          {results.map((player) => (
            <button
              key={player.id}
              onClick={() => {
                onChange(index, player);
                setQuery(player.fullName);
                setResults([]);
              }}
              className="w-full text-left p-2 hover:bg-muted/50 flex gap-2"
            >
              <img
                src={player.headshotUrl || "/placeholder.svg"}
                alt={player.fullName}
                className="w-6 h-6 rounded-full"
              />
              {player.fullName}
            </button>
          ))}
        </div>
      )}
      {value && (
        <p className="text-sm text-muted-foreground mt-1">
          Selected: {value.fullName}
        </p>
      )}
    </div>
  );
}

export default function PlayerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStat, setSelectedStat] = useState<
    "points" | "rebounds" | "assists"
  >("points");
  const [buyAmount, setBuyAmount] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [contractLength, setContractLength] = useState<number>(3);
  const [selectedPlayers, setSelectedPlayers] = useState<(Player | null)[]>(
    Array(PLAYER_SELECTION_COUNT).fill(null)
  );
  const [selectedPlayers, setSelectedPlayers] = useState<(Player | null)[]>(
    Array(PLAYER_SELECTION_COUNT).fill(null)
  );

  interface PlayerGameStat {
    gameDateUTC: string;
    points: number;
    rebounds: number;
    assists: number;
  }
  const [playerStats, setPlayerStats] = useState<PlayerGameStat[]>([]);
  const [newsData, setNewsData] = useState<NewsSnippetData[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Default player data (Josh Allen fallback)
  const defaultPlayerData = null;

  const chartData = playerStats.map((game) => ({
    date: new Date(game.gameDateUTC).toLocaleDateString(),
    value:
      selectedStat === "points"
        ? game.points
        : selectedStat === "rebounds"
        ? game.rebounds
        : game.assists,
  }));
  // Search for players with debouncing
  const searchPlayersDebounced = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPlayers(query, 10);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change
  useEffect(() => {
    if (!searchQuery) return;
    const timeoutId = setTimeout(() => {
      searchPlayersDebounced(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchPlayersDebounced]);

  // Handle player selection
  const handlePlayerSelect = async (player: Player) => {
    setSelectedPlayer(player);
    setSearchQuery(player.fullName);
    setShowSearchResults(false);

    if (player.teamId) {
      try {
        const team = await getTeamById(player.teamId);
        setSelectedTeam(team);
      } catch (error) {
        console.error("Failed to fetch team:", error);
      }
    }

    // Fetch player stats
    try {
      const res = await fetch(
        `http://localhost:8000/playerGameStats?playerId=${player.id}`
      );
      const data: Array<{
        gameDateUTC: string;
        points: number;
        rebounds: number;
        assists: number;
      }> = await res.json();

      const sorted = data
        .filter((g) => g.gameDateUTC)
        .sort(
          (a, b) =>
            new Date(b.gameDateUTC).getTime() -
            new Date(a.gameDateUTC).getTime()
        )
        .slice(0, 50)
        .reverse();

      setPlayerStats(sorted);
    } catch (err) {
      console.error("Error fetching player stats:", err);
      setPlayerStats([]);
    }

    // Fetch news for the selected player
    setNewsLoading(true);
    try {
      const articles = await NewsApiService.getPlayerNewsLastWeek(player.fullName, 5);
      const transformedNews = articles.map(NewsApiService.transformArticleToNewsSnippet);
      setNewsData(transformedNews);
    } catch (error) {
      console.error("Error fetching player news:", error);
      setNewsData([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Get display data (use selected player or default)
  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".search-container")) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayPlayer = selectedPlayer
    ? {
        name: selectedPlayer.fullName,
        position: selectedPlayer.position || "Unknown",
        team: selectedTeam
          ? `${selectedTeam.city} ${selectedTeam.name}`
          : "Unknown Team",
        nextGame: "vs TBD",
        gameDate: "TBD",
        image: selectedPlayer.headshotUrl || "/placeholder.svg",
      }
    : null;

  // Note: Portfolio data removed - now using news data instead

  return (
    <div className="dark min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portfolio
              </Button>
            </Link>
            <div className="flex-1 max-w-md relative search-container">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                onFocus={() =>
                  searchResults.length > 0 && setShowSearchResults(true)
                }
                className="pl-10 text-white placeholder-gray-400 bg-black"
              />

              {/* Autocomplete Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handlePlayerSelect(player)}
                        className="w-full text-left p-3 hover:bg-muted/50 border-b border-border last:border-b-0 flex items-center gap-3"
                      >
                        <img
                          src={player.headshotUrl || "/placeholder.svg"}
                          alt={player.fullName}
                          className="w-8 h-8 rounded-full object-cover bg-muted"
                        />
                        <div>
                          <div className="font-medium text-foreground">
                            {player.fullName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {player.position || "Unknown Position"}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground">
                      No players found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Player Card */}

            <Card className="bg-card border-border">
              <CardContent className="p-6">
                {displayPlayer ? (
                  <div className="flex items-start gap-6">
                    <img
                      src={displayPlayer.image}
                      alt={displayPlayer.name}
                      className="w-24 h-24 rounded-lg object-cover bg-muted"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h1 className="text-2xl font-bold text-foreground">
                            {displayPlayer.name}
                          </h1>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {displayPlayer.position}
                            </Badge>
                            <span className="text-muted-foreground">
                              {displayPlayer.team}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Next: {displayPlayer.nextGame} •{" "}
                            {displayPlayer.gameDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-foreground"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg font-semibold">
                      Select a player above
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Chart */}
            {/* Stat Selection Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={selectedStat === "points" ? "default" : "outline"}
                onClick={() => setSelectedStat("points")}
              >
                Points
              </Button>
              <Button
                variant={selectedStat === "rebounds" ? "default" : "outline"}
                onClick={() => setSelectedStat("rebounds")}
              >
                Rebounds
              </Button>
              <Button
                variant={selectedStat === "assists" ? "default" : "outline"}
                onClick={() => setSelectedStat("assists")}
              >
                Assists
              </Button>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Player Performace
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Displaying the Players Performaces according to Shooting,
                  Assists , Rebounds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    price: {
                      label: "Stock Price",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData} // ✅ derived from playerStats + selectedStat
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `${value}`}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`${value}`, selectedStat]}
                      />

                      {/* Reference lines (you can remove or adapt them if not needed for stats) */}
                      

                      {/* ✅ Dynamic stat line */}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-chart-1)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Trading Controls */}
            {/* Trading Controls */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Buy Section */}

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Place Bet</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Bet on player performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contract Length Selector */}
                  {/* Contract Length Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">
                      Contract Length
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant={contractLength === 3 ? "default" : "outline"}
                        className={
                          contractLength === 3 ? "bg-primary text-white" : ""
                        }
                        onClick={() => setContractLength(3)}
                      >
                        3 Games
                      </Button>
                      <Button
                        variant={contractLength === 5 ? "default" : "outline"}
                        className={
                          contractLength === 5 ? "bg-primary text-white" : ""
                        }
                        onClick={() => setContractLength(5)}
                      >
                        5 Games
                      </Button>
                    </div>
                  </div>
                  {/* Player Selection Slots */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">
                      Pick {PLAYER_SELECTION_COUNT} Players
                      Pick {PLAYER_SELECTION_COUNT} Players
                    </label>
                    {selectedPlayers.map((player, i) => (
                      <PlayerSelector
                        key={i}
                        index={i}
                        value={player}
                        onChange={(index, chosenPlayer) => {
                          const updated = [...selectedPlayers];
                          updated[index] = chosenPlayer;
                          setSelectedPlayers(updated);
                        }}
                        selectedPlayers={selectedPlayers}
                      />
                    ))}
                  </div>
                  {/* Stat Type Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">
                      Stat Type
                    </label>
                    <Select
                      value={selectedStat}
                      onValueChange={(value) =>
                        setSelectedStat(
                          value as "points" | "rebounds" | "assists"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Points</SelectItem>
                        <SelectItem value="rebounds">Rebounds</SelectItem>
                        <SelectItem value="assists">Assists</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bet Amount Input */}
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">
                      Bet Amount ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                    />
                  </div>

                  {/* Place Bet Button */}
                  <div className="space-y-2">
                    <Button
                      className="w-full text-white"
                      size="lg"
                      disabled={
                        !buyAmount ||
                        Number(buyAmount) <= 0 ||
                        selectedPlayers.some((p) => !p)
                      }
                    >
                      {buyAmount ? `Place Bet - $${buyAmount}` : "Place Bet"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* News Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Latest News</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {selectedPlayer ? `News about ${selectedPlayer.fullName}` : "Select a player to see news"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {newsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading news...</p>
                  </div>
                ) : newsData.length > 0 ? (
                  <NewsSnippetsContainer>
                    {newsData.map((news, index) => (
                      <NewsSnippet
                        key={index}
                        title={news.title}
                        content={news.content}
                        source={news.source}
                        publishedAt={news.publishedAt}
                        sentiment={news.sentiment}
                        playerName={news.playerName}
                        url={news.url}
                      />
                    ))}
                  </NewsSnippetsContainer>
                ) : selectedPlayer ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No recent news found for {selectedPlayer.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Try searching for a different player</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Select a player to see their latest news</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
