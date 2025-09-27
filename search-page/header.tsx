"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SportsTrade Pro</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Button variant="ghost" className="text-foreground hover:text-primary">
              Home
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              Players
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              Portfolio
            </Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-primary">
              Market Sentiment
            </Button>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </div>
    </header>
  )
}
