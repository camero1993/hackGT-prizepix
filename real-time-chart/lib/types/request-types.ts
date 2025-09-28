/**
 * Request configuration types for API service
 */

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

export interface RequestInterceptor {
  onRequest?: (config: RequestOptions) => RequestOptions | Promise<RequestOptions>
  onResponse?: <T>(response: T) => T | Promise<T>
  onError?: (error: any) => any | Promise<any>
}

export interface ApiConfig {
  baseUrl: string
  timeout: number
  retryConfig: RetryConfig
  defaultHeaders: Record<string, string>
}
