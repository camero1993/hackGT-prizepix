"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Trophy } from "lucide-react"
import { BetHoldingsChart } from "@/components/bet-holdings-chart"
import { BetPortfolio } from "@/components/bet-portfolio"
import { SportsNavigation } from "@/components/sports-navigation"
import { PortfolioBalanceChart } from "@/components/portfolio-balance-chart"

// Data structures matching our Redis/MongoDB format
interface DemoState {
  balance: number
  totalBetsPlaced: number
  totalWinnings: number
  totalWagered: number
  activeSimulationId?: string
  lastUpdated: string
}

interface BalanceHistoryEntry {
  timestamp: number
  balance: number
}

interface BetHolding {
  _id: string
  gameId: string
  playerId: string
  stat: 'points' | 'rebounds' | 'assists'
  betType: 'flex' | 'power'
  threshold: number
  actual?: number
  hit?: boolean
  betAmount: number
  multiplier: number
  potentialWinnings: number
  actualWinnings?: number
  status: 'pending' | 'won' | 'lost'
  createdAt: string
  resolvedAt?: string
  parlayId?: string
  simulationId?: string
}

// Mock data matching our backend format
const mockBetHoldings: BetHolding[] = [
  {
    _id: "bet_1",
    gameId: "game_1",
    playerId: "201939",
    stat: "points",
    betType: "flex",
    threshold: 25.5,
    actual: 28,
    hit: true,
    betAmount: 100,
    multiplier: 1.5,
    potentialWinnings: 150,
    actualWinnings: 150,
    status: "won",
    createdAt: "2025-01-30T10:00:00Z",
    resolvedAt: "2025-01-30T12:00:00Z"
  },
  {
    _id: "bet_2",
    gameId: "game_2",
    playerId: "203999",
    stat: "rebounds",
    betType: "power",
    threshold: 8.3,
    actual: 6,
    hit: false,
    betAmount: 200,
    multiplier: 2.0,
    potentialWinnings: 400,
    actualWinnings: 0,
    status: "lost",
    createdAt: "2025-01-30T11:00:00Z",
    resolvedAt: "2025-01-30T13:00:00Z"
  },
  {
    _id: "bet_3",
    gameId: "game_3",
    playerId: "201142",
    stat: "assists",
    betType: "flex",
    threshold: 4.5,
    actual: undefined,
    hit: undefined,
    betAmount: 150,
    multiplier: 1.5,
    potentialWinnings: 225,
    actualWinnings: undefined,
    status: "pending",
    createdAt: "2025-01-30T14:00:00Z"
  }
]

const mockDemoState: DemoState = {
  balance: 470.00,
  totalBetsPlaced: 3,
  totalWinnings: -30,
  totalWagered: 450,
  lastUpdated: "2025-01-30T15:00:00Z"
}

const mockBalanceHistory: BalanceHistoryEntry[] = [
  { timestamp: 1738234800000, balance: 1000 },
  { timestamp: 1738234860000, balance: 900 },
  { timestamp: 1738234920000, balance: 1050 },
  { timestamp: 1738234980000, balance: 850 },
  { timestamp: 1738235040000, balance: 470 }
]

export default function SportsTrading() {
  const [selectedTab, setSelectedTab] = useState("portfolio")
  const parallaxRef = useRef<HTMLDivElement>(null)

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrolled = window.pageYOffset
        const bannerHeight = 400 // Match the banner height
        const bannerElement = parallaxRef.current.parentElement
        
        if (bannerElement) {
          const bannerRect = bannerElement.getBoundingClientRect()
          const bannerOffsetTop = bannerElement.offsetTop
          const bannerBottom = bannerOffsetTop + bannerHeight
          
          // Only apply parallax while the banner is in view and not completely scrolled past
          if (scrolled < bannerBottom && bannerRect.bottom > 0) {
            // Calculate parallax movement based on how much we've scrolled within the banner area
            const scrollProgress = Math.min(scrolled / bannerBottom, 1)
            const rate = scrollProgress * bannerHeight * -0.2 // Gentle parallax based on scroll progress
            
            // Constrain the movement to prevent going out of bounds
            const maxMove = bannerHeight * 0.25
            const constrainedRate = Math.max(-maxMove, Math.min(0, rate))
            
            parallaxRef.current.style.transform = `translateY(${constrainedRate}px)`
          } else if (scrolled >= bannerBottom) {
            // Stop parallax movement when completely past the banner
            const finalPosition = bannerHeight * -0.25
            parallaxRef.current.style.transform = `translateY(${finalPosition}px)`
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Calculate portfolio totals from our data format
  const totalValue = mockDemoState.balance
  const totalChange = mockDemoState.totalWinnings
  const totalChangePercent = mockDemoState.totalWagered > 0 ? (totalChange / mockDemoState.totalWagered) * 100 : 0

  const liveBets = mockBetHoldings.filter((bet) => bet.status === "pending").length

  return (
    <div className="dark min-h-screen bg-background">
      <SportsNavigation />

      <main className="container mx-auto px-4 py-6">
        {/* Hero Section with Parallax */}
        <div className="mb-8">
          <div className="relative h-[400px] rounded-lg overflow-hidden mb-6 animate-float">
            <div 
              ref={parallaxRef}
              className="parallax-element parallax-enhanced absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/american-football-player-mixed-media-600nw-1926986162.jpg copy.png')",
                height: '130%',
                width: '100%',
                top: '-15%',
                left: '0'
              }}
            />
            {/* Enhanced overlay with depth */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent flex items-center justify-between px-8">
              {/* Left side content with enhanced depth */}
              <div className="text-white relative z-10">
                <h1 className="text-5xl font-sports mb-3 text-glow drop-shadow-2xl animate-slide-up hover:scale-105 transition-transform duration-300">
                  SPORTS PORTFOLIO
                </h1>
                <p className="text-xl text-gray-200 text-shadow-md drop-shadow-lg animate-slide-up hover:text-white transition-colors duration-300" style={{animationDelay: '0.1s'}}>
                  Trade your bets like stocks. Track performance in real-time.
                </p>
              </div>
              
              {/* Right side content with enhanced depth */}
              <div className="text-right relative z-10 backdrop-blur-sm bg-black/20 rounded-lg p-6 border border-white/10 animate-slide-up hover:bg-black/30 hover:border-white/20 transition-all duration-300 hover:scale-105" style={{animationDelay: '0.2s'}}>
                <div className="text-4xl font-bold text-white text-glow drop-shadow-2xl hover:scale-110 transition-transform duration-300">
                  ${totalValue.toLocaleString()}
                </div>
                <div className={`flex items-center justify-end text-lg font-semibold ${totalChange >= 0 ? "text-green-400" : "text-red-400"} text-shadow-md drop-shadow-lg hover:scale-105 transition-transform duration-300`}>
                  {totalChange >= 0 ? <TrendingUp className="w-5 h-5 mr-2" /> : <TrendingDown className="w-5 h-5 mr-2" />}
                  ${Math.abs(totalChange).toFixed(0)} ({totalChangePercent.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>

          <PortfolioBalanceChart
            totalValue={totalValue}
            totalChange={totalChange}
            totalChangePercent={totalChangePercent}
            balanceHistory={mockBalanceHistory}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
        <div className="py-12">
            <h2 className="text-3xl font-sports text-foreground mb-6 text-center">Why Choose SPORTFOLIO?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Real-Time Tracking</h3>
                  <p className="text-muted-foreground">Monitor your bets as they happen with live updates and instant notifications.</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Advanced Analytics</h3>
                  <p className="text-muted-foreground">Get detailed insights into your betting performance with comprehensive analytics.</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <Activity className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Portfolio Management</h3>
                  <p className="text-muted-foreground">Manage your bets like a professional trader with our intuitive portfolio tools.</p>
                </CardContent>
              </Card>
            </div>
          </div>
      </main>
    </div>
  )
}
