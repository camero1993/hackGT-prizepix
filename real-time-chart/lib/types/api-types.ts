/**
 * Base API types and interfaces
 * Based on FRONTEND_API_DOCUMENTATION.md
 */

export interface ApiError {
  error: string
  details?: any
  code?: string
  timestamp?: string
}

export interface PaginationParams {
  limit?: number
  offset?: number
  page?: number
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

export interface QueryParams {
  limit?: number
  status?: string
  startDate?: string
  endDate?: string
}
