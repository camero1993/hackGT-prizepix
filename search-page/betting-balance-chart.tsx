"use client"

import { useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"

const chartData = {
  "1D": [
    { time: "9:00", balance: 12450 },
    { time: "12:00", balance: 12680 },
    { time: "15:00", balance: 12520 },
    { time: "18:00", balance: 12890 },
    { time: "21:00", balance: 13120 },
  ],
  "1W": [
    { time: "Mon", balance: 11200 },
    { time: "Tue", balance: 11850 },
    { time: "Wed", balance: 12100 },
    { time: "Thu", balance: 12450 },
    { time: "Fri", balance: 12890 },
    { time: "Sat", balance: 13120 },
    { time: "Sun", balance: 13350 },
  ],
  "1M": [
    { time: "Week 1", balance: 10500 },
    { time: "Week 2", balance: 11200 },
    { time: "Week 3", balance: 12100 },
    { time: "Week 4", balance: 13350 },
  ],
  "1Y": [
    { time: "Q1", balance: 8500 },
    { time: "Q2", balance: 10200 },
    { time: "Q3", balance: 11800 },
    { time: "Q4", balance: 13350 },
  ],
}

export function BettingBalanceChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<keyof typeof chartData>("1W")
  const currentBalance = 13350
  const change = 1250
  const changePercent = 10.3

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Betting Balance</CardTitle>
            <CardDescription className="text-muted-foreground">
              Track your portfolio performance over time
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {(Object.keys(chartData) as Array<keyof typeof chartData>).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="h-8 px-3"
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">${currentBalance.toLocaleString()}</span>
          <span className="text-sm text-primary">
            +${change} (+{changePercent}%)
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            balance: {
              label: "Balance",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData[selectedPeriod]}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value) => [`$${value.toLocaleString()}`, "Balance"]}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--color-chart-1)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
