/**
 * Base API service class with common functionality
 * Provides retry logic, error handling, and request/response interceptors
 */

import { ApiError, RequestOptions, RetryConfig, RequestInterceptor } from '../types'

export abstract class BaseApiService {
  protected baseUrl: string
  protected defaultHeaders: Record<string, string>
  protected retryConfig: RetryConfig
  protected timeout: number
  protected requestInterceptors: RequestInterceptor[] = []
  protected responseInterceptors: RequestInterceptor[] = []

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    }
    this.timeout = 10000 // 10 seconds
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: RequestInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  /**
   * Process request through interceptors
   */
  protected async processRequest(config: RequestOptions): Promise<RequestOptions> {
    let processedConfig = { ...config }
    
    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onRequest) {
        processedConfig = await interceptor.onRequest(processedConfig)
      }
    }
    
    return processedConfig
  }

  /**
   * Process response through interceptors
   */
  protected async processResponse<T>(response: T): Promise<T> {
    let processedResponse = response
    
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        processedResponse = await interceptor.onResponse(processedResponse)
      }
    }
    
    return processedResponse
  }

  /**
   * Main request method with retry logic and error handling
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const config = await this.processRequest({
      method: 'GET',
      headers: { ...this.defaultHeaders },
      timeout: this.timeout,
      ...options,
    })

    const url = `${this.baseUrl}${endpoint}`
    
    return this.withRetry(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.timeout)

      try {
        const response = await fetch(url, {
          method: config.method,
          headers: config.headers,
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ 
            error: `HTTP ${response.status}: ${response.statusText}` 
          }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        return await this.processResponse<T>(data)
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    }, this.retryConfig)
  }

  /**
   * Retry logic with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === config.maxRetries) {
          throw this.classifyError(lastError)
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        )
        
        await this.delay(delay)
      }
    }
    
    throw this.classifyError(lastError!)
  }

  /**
   * Classify and format errors
   */
  private classifyError(error: any): ApiError {
    if (error.name === 'AbortError') {
      return {
        error: 'Request timeout',
        code: 'TIMEOUT',
        timestamp: new Date().toISOString()
      }
    }
    
    if (error.message?.includes('HTTP 5')) {
      return {
        error: 'Server error',
        code: 'SERVER_ERROR',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    }
    
    if (error.message?.includes('HTTP 4')) {
      return {
        error: error.message,
        code: 'CLIENT_ERROR',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      error: error.message || 'Unknown error',
      code: 'UNKNOWN',
      details: error,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
