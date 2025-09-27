"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

const suggestedBets = [
  {
    id: 1,
    name: "Josh Allen",
    position: "QB",
    team: "BUF",
    opponent: "vs MIA",
    gameTime: "Sun 1:00 PM",
    projection: {
      metric: "Passing Yards",
      value: 285,
      line: 267.5,
      confidence: 78,
      trend: "up",
    },
    odds: "+110",
  },
  {
    id: 2,
    name: "Christian McCaffrey",
    position: "RB",
    team: "SF",
    opponent: "@ SEA",
    gameTime: "Sun 4:25 PM",
    projection: {
      metric: "Rushing Yards",
      value: 95,
      line: 82.5,
      confidence: 82,
      trend: "up",
    },
    odds: "+105",
  },
  {
    id: 3,
    name: "Tyreek Hill",
    position: "WR",
    team: "MIA",
    opponent: "@ BUF",
    gameTime: "Sun 1:00 PM",
    projection: {
      metric: "Receiving Yards",
      value: 78,
      line: 89.5,
      confidence: 71,
      trend: "down",
    },
    odds: "+115",
  },
]

export function SuggestedBets() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Suggested Bets</CardTitle>
        <CardDescription className="text-muted-foreground">
          AI-powered recommendations based on advanced analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {suggestedBets.map((bet) => (
            <div
              key={bet.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{bet.team}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{bet.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {bet.position}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {bet.opponent} • {bet.gameTime}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {bet.projection.metric}: {bet.projection.value} (Line: {bet.projection.line})
                    </span>
                    {bet.projection.trend === "up" ? (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">{bet.odds}</div>
                <div className="text-sm text-muted-foreground">{bet.projection.confidence}% confidence</div>
                <Button size="sm" className="mt-2">
                  Place Bet
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
