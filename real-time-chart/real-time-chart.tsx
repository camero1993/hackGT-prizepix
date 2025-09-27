"use client"

import { useEffect, useState, useRef } from "react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock initial data
const initialData = Array.from({ length: 20 }, (_, i) => ({
  time: new Date(Date.now() - (19 - i) * 1000).toISOString(),
  price: 100 + Math.random() * 10,
  isNew: false,
}))

export default function RealTimeChart() {
  const [data, setData] = useState(initialData)
  const [darkMode, setDarkMode] = useState(true)
  const [isRunning, setIsRunning] = useState(true)
  const prevDataRef = useRef([...initialData])

  // Get the latest price and calculate change
  const latestPrice = data[data.length - 1]?.price || 0
  const previousPrice = data[data.length - 2]?.price || 0
  const priceChange = latestPrice - previousPrice
  const percentChange = (priceChange / previousPrice) * 100

  // Format the price and change
  const formattedPrice = latestPrice.toFixed(2)
  const formattedChange = priceChange.toFixed(2)
  const formattedPercent = percentChange.toFixed(2)

  // Determine if price is up or down
  const isPriceUp = priceChange >= 0

  useEffect(() => {
    if (!isRunning) return

    // Update data every second
    const interval = setInterval(() => {
      setData((currentData) => {
        // Store the current data for reference
        prevDataRef.current = [...currentData]

        // Generate a new price based on the previous price with some randomness
        const lastPrice = currentData[currentData.length - 1].price
        const newPrice = lastPrice + (Math.random() - 0.5) * 2 // Random walk

        // Create a new data point and mark it as new for animation
        const newDataPoint = {
          time: new Date().toISOString(),
          price: newPrice,
          isNew: true, // Flag to indicate this is the new point to animate
        }

        // Reset the isNew flag for all existing points
        const updatedData = currentData.map((point) => ({
          ...point,
          isNew: false,
        }))

        // Keep only the last 20 data points
        return [...updatedData.slice(1), newDataPoint]
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  // Format time for display
  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle("dark")
  }

  // Custom dot component that only animates new points
  const CustomDot = (props: any) => {
    const { cx, cy, payload, key, ...restProps } = props

    // Check if payload exists and has the isNew property
    if (!payload || !payload.isNew) return null

    return <circle key={key} cx={cx} cy={cy} r={6} fill="var(--color-price)" stroke="none" className="animate-pulse" />
  }

  // Custom active dot component
  const CustomActiveDot = (props: any) => {
    const { cx, cy, key, ...restProps } = props

    return (
      <circle key={key} cx={cx} cy={cy} r={6} fill="var(--color-price)" stroke="var(--background)" strokeWidth={2} />
    )
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="bg-background min-h-screen p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>BTC/USD Real-Time Chart</CardTitle>
              <CardDescription>Live price updates with 1-second intervals</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Live Updates</span>
                <Switch checked={isRunning} onCheckedChange={setIsRunning} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold">${formattedPrice}</div>
                <div className={`flex items-center ${isPriceUp ? "text-green-500" : "text-red-500"}`}>
                  {isPriceUp ? "▲" : "▼"} ${formattedChange} ({formattedPercent}%)
                </div>
              </div>
              <Tabs defaultValue="line">
                
              </Tabs>
            </div>

            <div className="h-[400px]">
              <Tabs defaultValue="line" className="h-full">
                <TabsContent value="line" className="h-full">
                  <ChartContainer
                    config={{
                      price: {
                        label: "Price",
                        color: isPriceUp ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-full"
                  >
                    <LineChart accessibilityLayer data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => `$${Number(value).toFixed(2)}`}
                            labelFormatter={formatTime}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="var(--color-price)"
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={<CustomActiveDot />}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ChartContainer>
                </TabsContent>
                <TabsContent value="area" className="h-full">
                  <ChartContainer
                    config={{
                      price: {
                        label: "Price",
                        color: isPriceUp ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))",
                      },
                    }}
                    className="h-full"
                  >
                    <AreaChart accessibilityLayer data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => `$${Number(value).toFixed(2)}`}
                            labelFormatter={formatTime}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="var(--color-price)"
                        fill="var(--color-price)"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={<CustomActiveDot />}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ChartContainer>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
