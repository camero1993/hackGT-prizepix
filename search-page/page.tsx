import { Header } from "@/components/header"
import { BettingBalanceChart } from "@/components/betting-balance-chart"
import { SuggestedBets } from "@/components/suggested-bets"
import { PortfolioChart } from "@/components/portfolio-chart"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Betting Balance Chart */}
          <div className="w-full">
            <BettingBalanceChart />
          </div>

          {/* Suggested Bets and Portfolio */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <SuggestedBets />
            </div>
            <div className="lg:col-span-1">
              <PortfolioChart />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
