"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Clock, Play, Pause } from "lucide-react"

// Data structure matching our MongoDB Bet model
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

interface BetPortfolioProps {
  holdings: BetHolding[]
}

export function BetPortfolio({ holdings }: BetPortfolioProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "won":
        return "bg-green-500"
      case "lost":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3" />
      case "won":
        return <TrendingUp className="w-3 h-3" />
      case "lost":
        return <TrendingDown className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "LIVE"
      case "won":
        return "WON"
      case "lost":
        return "LOST"
      default:
        return "UNKNOWN"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-sports text-foreground">YOUR BET HOLDINGS</h2>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Place New Bet</Button>
      </div>

      <div className="grid gap-4">
        {holdings.map((bet) => {
          const currentValue = bet.actualWinnings || bet.betAmount
          const change = currentValue - bet.betAmount
          const changePercent = (change / bet.betAmount) * 100
          const isPositive = change >= 0

          return (
            <Card
              key={bet._id}
              className="bg-card border-border hover:border-primary/50 transition-colors animate-slide-up"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-bold text-foreground">
                        Player {bet.playerId} - {bet.stat.toUpperCase()}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {bet.betType.toUpperCase()}
                      </Badge>
                      <Badge className={`${getStatusColor(bet.status)} text-white text-xs`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(bet.status)}
                          <span className="uppercase">{getStatusLabel(bet.status)}</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      <span>Threshold: {bet.threshold}</span>
                      <span>•</span>
                      <span>Actual: {bet.actual || 'TBD'}</span>
                      <span>•</span>
                      <span>Multiplier: {bet.multiplier}x</span>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Stake</p>
                        <p className="font-semibold">${bet.betAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current Value</p>
                        <p className="font-semibold">${currentValue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">P&L</p>
                        <div className={`flex items-center ${isPositive ? "text-green-500" : "text-red-500"}`}>
                          {isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          <span className="font-semibold">
                            ${Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {bet.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                      >
                        Cash Out
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
