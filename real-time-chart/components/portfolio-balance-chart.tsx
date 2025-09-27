"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

// Mock historical portfolio data
const generatePortfolioData = (period: string) => {
  const baseValue = 8033.51
  const dataPoints =
    period === "1D"
      ? 24
      : period === "1W"
        ? 7
        : period === "1M"
          ? 30
          : period === "3M"
            ? 90
            : period === "YTD"
              ? 180
              : period === "1Y"
                ? 365
                : 1000

  const data = []
  let currentValue = baseValue - (Math.random() * 1000 + 500) // Start lower

  for (let i = 0; i < dataPoints; i++) {
    // Simulate general upward trend with volatility
    const change = (Math.random() - 0.3) * 50 // Slight upward bias
    currentValue += change

    data.push({
      time: i,
      value: Math.max(currentValue, 1000), // Don't go below $1000
    })
  }

  // Ensure we end at the current value
  data[data.length - 1].value = baseValue

  return data
}

interface PortfolioBalanceChartProps {
  totalValue: number
  totalChange: number
  totalChangePercent: number
}

export function PortfolioBalanceChart({ totalValue, totalChange, totalChangePercent }: PortfolioBalanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("1D")
  const [chartData, setChartData] = useState(() => generatePortfolioData("1D"))

  const periods = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"]

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    setChartData(generatePortfolioData(period))
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
