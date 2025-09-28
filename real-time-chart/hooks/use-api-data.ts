/**
 * Custom React hooks for API data fetching
 * Provides loading states, error handling, and data management for frontend components
 */

import { useState, useEffect, useCallback } from 'react'
import { apiService } from '../lib/api'
import { DemoState, BetHolding, BalanceHistoryEntry, TradeLogEntry, Analytics, Player } from '../lib/types'

/**
 * Hook for fetching demo state data
 * Used by main dashboard for portfolio totals
 */
export function useDemoState() {
  const [data, setData] = useState<DemoState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getDemoState()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch demo state'
      setError(errorMessage)
      
      // Auto-initialize demo if not initialized
      if (errorMessage.includes('not initialized')) {
        try {
          await apiService.initializeDemo(1000)
          const result = await apiService.getDemoState()
          setData(result)
          setError(null)
        } catch (initErr) {
          console.error('Failed to initialize demo:', initErr)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for fetching bet holdings data
 * Used by bet portfolio and charts components
 */
export function useBetHoldings() {
  const [data, setData] = useState<BetHolding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getBetHoldings({ limit: 50 })
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bet holdings'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for fetching balance history data
 * Used by portfolio balance chart
 */
export function useBalanceHistory() {
  const [data, setData] = useState<BalanceHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (limit: number = 100) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getBalanceHistory(limit)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance history'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for fetching trade logs data
 * Used for activity feed and recent trades
 */
export function useTradeLogs() {
  const [data, setData] = useState<TradeLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (limit: number = 50) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getTradeLogs(limit)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trade logs'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for fetching analytics data
 * Used for summary statistics
 */
export function useAnalytics() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.getAnalytics()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
