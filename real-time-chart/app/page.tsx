"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Trophy, BarChart3 } from "lucide-react"
import { BetHoldingsChart } from "@/components/bet-holdings-chart"
import { BetPortfolio } from "@/components/bet-portfolio"
import { SportsNavigation } from "@/components/sports-navigation"
import { PortfolioBalanceChart } from "@/components/portfolio-balance-chart"

// Mock data for sports bets treated as stock holdings
const mockBetHoldings = [
  {
    id: "1",
    team: "Lakers vs Warriors",
    sport: "NBA",
    betType: "Moneyline",
    odds: "+150",
    stake: 100,
    currentValue: 125,
    change: 25,
    changePercent: 25,
    status: "live",
    timeRemaining: "2Q 8:45",
  },
  {
    id: "2",
    team: "Chiefs vs Bills",
    sport: "NFL",
    betType: "Spread -3.5",
    odds: "-110",
    stake: 200,
    currentValue: 180,
    change: -20,
    changePercent: -10,
    status: "live",
    timeRemaining: "3Q 12:30",
  },
  {
    id: "3",
    team: "Man City vs Arsenal",
    sport: "EPL",
    betType: "Over 2.5 Goals",
    odds: "+120",
    stake: 150,
    currentValue: 165,
    change: 15,
    changePercent: 10,
    status: "pending",
    timeRemaining: "Starts in 2h",
  },
]

export default function SportsTrading() {
  const [selectedTab, setSelectedTab] = useState("portfolio")

  // Calculate portfolio totals
  const totalValue = mockBetHoldings.reduce((sum, bet) => sum + bet.currentValue, 0)
  const totalStake = mockBetHoldings.reduce((sum, bet) => sum + bet.stake, 0)
  const totalChange = totalValue - totalStake
  const totalChangePercent = (totalChange / totalStake) * 100

  const liveBets = mockBetHoldings.filter((bet) => bet.status === "live").length
  const pendingBets = mockBetHoldings.filter((bet) => bet.status === "pending").length

  return (
    <div className="dark min-h-screen bg-background">
      <SportsNavigation />

      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-sports text-foreground mb-2">SPORTS PORTFOLIO</h1>
              <p className="text-muted-foreground text-lg">
                Trade your bets like stocks. Track performance in real-time.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">${totalValue.toLocaleString()}</div>
              <div className={`flex items-center justify-end ${totalChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {totalChange >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                ${Math.abs(totalChange).toFixed(0)} ({totalChangePercent.toFixed(1)}%)
              </div>
            </div>
          </div>

          <PortfolioBalanceChart
            totalValue={totalValue}
            totalChange={totalChange}
            totalChangePercent={totalChangePercent}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Live Bets</p>
                    <p className="text-2xl font-bold">{liveBets}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{pendingBets}</p>
                  </div>
                  <Target className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">P&L Today</p>
                    <p className={`text-2xl font-bold ${totalChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                      ${totalChange.toFixed(0)}
                    </p>
                  </div>
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary">
            <TabsTrigger
              value="portfolio"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Portfolio
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Charts
            </TabsTrigger>
            <TabsTrigger
              value="markets"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Markets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-6">
            <BetPortfolio holdings={mockBetHoldings} />
          </TabsContent>

          <TabsContent value="charts" className="mt-6">
            <BetHoldingsChart holdings={mockBetHoldings} />
          </TabsContent>

          <TabsContent value="markets" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-sports">LIVE MARKETS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Market data coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
