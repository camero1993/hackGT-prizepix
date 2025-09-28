"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

// Data structure matching our Redis balance history
interface BalanceHistoryEntry {
  timestamp: number
  balance: number
}

// Transform Redis balance history to chart format
const transformBalanceHistory = (redisData: BalanceHistoryEntry[]) => {
  return redisData.map((entry, index) => ({
    time: index,
    value: entry.balance,
    timestamp: entry.timestamp
  }))
}

interface PortfolioBalanceChartProps {
  totalValue: number
  totalChange: number
  totalChangePercent: number
  balanceHistory?: BalanceHistoryEntry[]
}

export function PortfolioBalanceChart({ totalValue, totalChange, totalChangePercent, balanceHistory = [] }: PortfolioBalanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("1D")
  const [chartData, setChartData] = useState(() => {
    // Use real data if available, otherwise generate mock data
    return balanceHistory.length > 0 ? transformBalanceHistory(balanceHistory) : generateMockData("1D")
  })

  const periods = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"]

  // Generate mock data for periods not covered by Redis
  const generateMockData = (period: string) => {
    const dataPoints = period === "1D" ? 24 : period === "1W" ? 7 : period === "1M" ? 30 : 100
    const data = []
    let currentValue = totalValue - (Math.random() * 200 + 100)

    for (let i = 0; i < dataPoints; i++) {
      const change = (Math.random() - 0.3) * 20
      currentValue += change
      data.push({
        time: i,
        value: Math.max(currentValue, 100),
      })
    }
    data[data.length - 1].value = totalValue
    return data
  }

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    // For short periods, use Redis data if available
    if ((period === "1D" || period === "1W") && balanceHistory.length > 0) {
      setChartData(transformBalanceHistory(balanceHistory))
    } else {
      // For longer periods, generate mock data or fetch from MongoDB
      setChartData(generateMockData(period))
    }
  }

  const isPositive = totalChange >= 0

  return (
    <Card className="bg-card border-border mb-8">
      <CardContent className="p-6">
        {/* Portfolio Value Header */}
        <div className="mb-6">
          <div className="text-4xl font-bold text-foreground mb-2">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center text-lg font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? <TrendingUp className="w-5 h-5 mr-2" /> : <TrendingDown className="w-5 h-5 mr-2" />}$
            {Math.abs(totalChange).toFixed(2)} ({Math.abs(totalChangePercent).toFixed(2)}%) Today
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={false} />
              <YAxis hide />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "#22c55e" : "#ef4444" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Time Period Selector */}
        <div className="flex gap-2 justify-center">
          {periods.map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange(period)}
              className={`px-4 py-2 text-sm font-medium ${
                selectedPeriod === period
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {period}
            </Button>
          ))}
        </div>

        {/* Buying Power */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-foreground font-medium">Buying power</span>
            <span className="text-foreground font-semibold">
              ${(totalValue * 0.87).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
