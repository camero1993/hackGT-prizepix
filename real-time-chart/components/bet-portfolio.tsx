"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Clock, Play, Pause } from "lucide-react"

interface BetHolding {
  id: string
  team: string
  sport: string
  betType: string
  odds: string
  stake: number
  currentValue: number
  change: number
  changePercent: number
  status: "live" | "pending" | "settled"
  timeRemaining: string
}

interface BetPortfolioProps {
  holdings: BetHolding[]
}

export function BetPortfolio({ holdings }: BetPortfolioProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "settled":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "live":
        return <Play className="w-3 h-3" />
      case "pending":
        return <Clock className="w-3 h-3" />
      case "settled":
        return <Pause className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-sports text-foreground">YOUR BET HOLDINGS</h2>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Place New Bet</Button>
      </div>

      <div className="grid gap-4">
        {holdings.map((bet) => (
          <Card
            key={bet.id}
            className="bg-card border-border hover:border-primary/50 transition-colors animate-slide-up"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-foreground">{bet.team}</h3>
                    <Badge variant="outline" className="text-xs">
                      {bet.sport}
                    </Badge>
                    <Badge className={`${getStatusColor(bet.status)} text-white text-xs`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(bet.status)}
                        <span className="uppercase">{bet.status}</span>
                      </div>
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <span>{bet.betType}</span>
                    <span>•</span>
                    <span>Odds: {bet.odds}</span>
                    <span>•</span>
                    <span>{bet.timeRemaining}</span>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Stake</p>
                      <p className="font-semibold">${bet.stake}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Value</p>
                      <p className="font-semibold">${bet.currentValue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">P&L</p>
                      <div className={`flex items-center ${bet.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {bet.change >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        <span className="font-semibold">
                          ${Math.abs(bet.change)} ({Math.abs(bet.changePercent)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                  >
                    Cash Out
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {holdings.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground mb-4">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No active bets in your portfolio</p>
              <p className="text-sm">Start trading sports bets to see them here</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Browse Markets</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
