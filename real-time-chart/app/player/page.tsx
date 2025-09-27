"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import Link from "next/link"
import { searchPlayers, getTeamById, Player, Team } from "@/lib/api"

// Mock data for player stock price
const stockData = [
  { date: "Jan 1", price: 45.2, volume: 1200 },

  { date: "Mar 5", price: 67.2, volume: 2680 },
]

// Mock portfolio data
const portfolioData = [
  { player: "Josh Allen", position: "QB", shares: 150, currentPrice: 67.2, roi: 12.5 },
  { player: "Christian McCaffrey", position: "RB", shares: 200, currentPrice: 45.8, roi: -3.2 },
  { player: "Tyreek Hill", position: "WR", shares: 100, currentPrice: 52.1, roi: 8.7 },
  { player: "Travis Kelce", position: "TE", shares: 75, currentPrice: 38.9, roi: 15.3 },
]

const demonLevels = [
  { level: "Buy Signal", price: 50, color: "#10b981" },
  { level: "Hold Signal", price: 60, color: "#f59e0b" },
  { level: "Sell Signal", price: 70, color: "#ef4444" },
]

export default function PlayerPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStat, setSelectedStat] = useState("touchdowns")
  const [buyAmount, setBuyAmount] = useState("")
  const [searchResults, setSearchResults] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Default player data (Josh Allen fallback)
  const defaultPlayerData = {
    name: "Josh Allen",
    position: "QB",
    team: "Buffalo Bills",
    nextGame: "vs Miami Dolphins",
    gameDate: "Sunday, 1:00 PM EST",
    currentPrice: 67.2,
    change: 4.5,
    changePercent: 7.2,
    image: "/placeholder.svg",
  }

  // Search for players with debouncing
  const searchPlayersDebounced = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setIsSearching(true)
      try {
        const results = await searchPlayers(query, 10)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (error) {
        console.error('Search failed:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchPlayersDebounced(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  // Handle player selection
  const handlePlayerSelect = async (player: Player) => {
    setSelectedPlayer(player)
    setSearchQuery(player.fullName)
    setShowSearchResults(false)
    
    // Fetch team data if available
    if (player.teamId) {
      try {
        const team = await getTeamById(player.teamId)
        setSelectedTeam(team)
      } catch (error) {
        console.error('Failed to fetch team:', error)
      }
    }
  }

  // Get display data (use selected player or default)
  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayPlayer = selectedPlayer ? {
    name: selectedPlayer.fullName,
    position: selectedPlayer.position || "Unknown",
    team: selectedTeam ? `${selectedTeam.city} ${selectedTeam.name}` : "Unknown Team",
    nextGame: "vs TBD", // Would need game data
    gameDate: "TBD",
    currentPrice: 67.2, // Mock price data
    change: 4.5,
    changePercent: 7.2,
    image: selectedPlayer.headshotUrl || "/placeholder.svg",
  } : defaultPlayerData

  const currentHoldings = portfolioData.find((p) => p.player === displayPlayer.name)

  return (
    <div className="dark min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:text-primary">
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

      // Debounce properly
      if ((window as any).searchTimeout) {
        clearTimeout((window as any).searchTimeout);
      }
      (window as any).searchTimeout = setTimeout(() => {
        searchPlayersDebounced(e.target.value);
      }, 300);
    }}
    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
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
              <div className="font-medium text-foreground">{player.fullName}</div>
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
                  <div className="flex items-start gap-6">
                  <img
                    src={displayPlayer.image}
                    alt={displayPlayer.name}
                    className="w-24 h-24 rounded-lg object-cover bg-muted"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-foreground">{displayPlayer.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{displayPlayer.position}</Badge>
                          <span className="text-muted-foreground">{displayPlayer.team}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Next: {displayPlayer.nextGame} • {displayPlayer.gameDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-foreground">${displayPlayer.currentPrice}</div>
                        <div
                          className={`flex items-center gap-1 ${displayPlayer.change >= 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {displayPlayer.change >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {displayPlayer.change >= 0 ? "+" : ""}
                            {displayPlayer.change} ({displayPlayer.changePercent}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Player Stock Price</CardTitle>
                <CardDescription className="text-muted-foreground">Performance-based stock price with trading signals</CardDescription>
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
                    <LineChart data={stockData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`$${value}`, "Price"]}
                      />

                      {/* Trading Signal Lines */}
                      {demonLevels.map((level) => (
                        <ReferenceLine
                          key={level.level}
                          y={level.price}
                          stroke={level.color}
                          strokeDasharray="5 5"
                          label={{ value: level.level, position: "right" }}
                        />
                      ))}

                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="var(--color-chart-1)"
                        strokeWidth={2}
                        dot={{ fill: "var(--color-chart-1)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "var(--color-chart-1)", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Trading Controls */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Buy Section */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-primary">Place Bet</CardTitle>
                  <CardDescription className="text-muted-foreground">Bet on player performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Stat Type</label>
                    <Select value={selectedStat} onValueChange={setSelectedStat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="touchdowns">Touchdowns</SelectItem>
                        <SelectItem value="yards">Passing Yards</SelectItem>
                        <SelectItem value="completions">Completions</SelectItem>
                        <SelectItem value="rating">QB Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Bet Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full text-white" size="lg">
                      Place Bet - ${displayPlayer.currentPrice}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="text-green-400 border-green-500 hover:bg-green-500 hover:text-white">
                        Buy Signal ($50)
                      </Button>
                      <Button variant="outline" size="sm" className="text-yellow-400 border-yellow-500 hover:bg-yellow-500 hover:text-white">
                        Hold Signal ($60)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Position */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Current Position</CardTitle>
                  <CardDescription className="text-muted-foreground">Your holdings for this player</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentHoldings ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Holdings</span>
                          <span className="font-medium text-foreground">{currentHoldings.shares} shares</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Value</span>
                          <span className="font-medium text-foreground">
                            ${(currentHoldings.shares * currentHoldings.currentPrice).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ROI</span>
                          <span
                            className={`font-medium ${currentHoldings.roi >= 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {currentHoldings.roi >= 0 ? "+" : ""}
                            {currentHoldings.roi}%
                          </span>
                        </div>
                      </div>

                      <Button variant="destructive" className="w-full text-white" size="lg">
                        Cash Out Position
                      </Button>
                      <Button variant="outline" className="w-full text-white border-white hover:bg-white hover:text-black">
                        Partial Cash Out
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No current position for this player</p>
                      <p className="text-sm mt-1">Place a bet to start trading</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Portfolio Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">My Portfolio</CardTitle>
                <CardDescription className="text-muted-foreground">Current holdings summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolioData.map((holding) => (
                  <div key={holding.player} className="p-3 rounded-lg bg-muted/20 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{holding.player}</p>
                        <Badge variant="outline" className="text-xs">
                          {holding.position}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">${holding.currentPrice}</p>
                        <p className={`text-xs ${holding.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {holding.roi >= 0 ? "+" : ""}
                          {holding.roi}%
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{holding.shares} shares</span>
                      <span>${(holding.shares * holding.currentPrice).toFixed(0)}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-foreground">Total Portfolio Value</span>
                    <span className="text-green-500">$24,847</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Total ROI</span>
                    <span className="text-green-500">+8.3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
