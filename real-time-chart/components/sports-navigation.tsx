"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Search, User, Menu, X, TrendingUp, Activity, Target, Settings } from "lucide-react"
import Link from "next/link"

export function SportsNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-sports text-foreground">SPORTFOLIO</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Button variant="ghost" className="text-foreground hover:text-primary">
              Portfolio
            </Button>
            <Button variant="ghost" className="text-foreground hover:text-primary">
              Markets
            </Button>
            <Button variant="ghost" className="text-foreground hover:text-primary">
              Analytics
            </Button>
            <Button variant="ghost" className="text-foreground hover:text-primary">
              News
            </Button>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/player">
              <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
                <Search className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-2 h-2 p-0 bg-primary"></Badge>
            </Button>
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
              <User className="w-5 h-5" />
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-2">
              <Button variant="ghost" className="justify-start text-foreground hover:text-primary">
                <Activity className="w-4 h-4 mr-2" />
                Portfolio
              </Button>
              <Button variant="ghost" className="justify-start text-foreground hover:text-primary">
                <Target className="w-4 h-4 mr-2" />
                Markets
              </Button>
              <Button variant="ghost" className="justify-start text-foreground hover:text-primary">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button variant="ghost" className="justify-start text-foreground hover:text-primary">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
