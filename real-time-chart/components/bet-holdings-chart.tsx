"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

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

interface BetHoldingsChartProps {
  holdings: BetHolding[]
}

// Generate mock historical data for portfolio value
const generatePortfolioHistory = (currentValue: number) => {
  const data = []
  const baseValue = currentValue * 0.9 // Start 10% lower

  for (let i = 0; i < 24; i++) {
    const time = new Date(Date.now() - (23 - i) * 60 * 60 * 1000)
    const variance = (Math.random() - 0.5) * 0.1 // ±5% variance
    const value = baseValue + (currentValue - baseValue) * (i / 23) + baseValue * variance

    data.push({
      time: time.toISOString(),
      value: Math.max(0, value),
      hour: time.getHours(),
    })
  }

  return data
}

export function BetHoldingsChart({ holdings }: BetHoldingsChartProps) {
  const totalValue = holdings.reduce((sum, bet) => sum + bet.currentValue, 0)
  const totalStake = holdings.reduce((sum, bet) => sum + bet.stake, 0)
  const totalChange = totalValue - totalStake
  const totalChangePercent = totalStake > 0 ? (totalChange / totalStake) * 100 : 0

  const [chartData, setChartData] = useState(generatePortfolioHistory(totalValue))
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      setChartData((prevData) => {
        const newData = [...prevData]
        const lastValue = newData[newData.length - 1].value
        const newValue = lastValue + (Math.random() - 0.5) * 20 // ±$10 variance

        newData.push({
          time: new Date().toISOString(),
          value: Math.max(0, newValue),
          hour: new Date().getHours(),
        })

        // Keep only last 24 hours of data
        return newData.slice(-24)
      })
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isLive])

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const isPositive = totalChange >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-sports text-foreground">PORTFOLIO PERFORMANCE</h2>
        <div className="flex items-center space-x-4">
          <Badge variant={isLive ? "default" : "secondary"} className="bg-green-500 text-white">
            {isLive ? "LIVE" : "PAUSED"}
          </Badge>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">${totalValue.toLocaleString()}</CardTitle>
              <div className={`flex items-center mt-2 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                <span className="font-semibold">
                  ${Math.abs(totalChange).toFixed(0)} ({Math.abs(totalChangePercent).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">24h Performance</p>
              <p className="text-lg font-semibold">Real-time tracking</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ChartContainer
              config={{
                value: {
                  label: "Portfolio Value",
                  color: isPositive ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))",
                },
              }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatTime}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, "Portfolio Value"]}
                        labelFormatter={formatTime}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-value)"
                    fill="var(--color-value)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Bet Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {holdings.map((bet) => (
          <Card key={bet.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{bet.team}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {bet.sport}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value</span>
                  <span className="font-semibold">${bet.currentValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">P&L</span>
                  <span className={`font-semibold ${bet.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    ${bet.change > 0 ? "+" : ""}${bet.change}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    className={`text-xs ${bet.status === "live" ? "bg-green-500" : bet.status === "pending" ? "bg-yellow-500" : "bg-gray-500"} text-white`}
                  >
                    {bet.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
