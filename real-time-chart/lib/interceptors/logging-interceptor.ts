/**
 * Logging interceptor for API requests and responses
 * Provides detailed logging for debugging and monitoring
 */

import { RequestInterceptor } from '../types'

export class LoggingInterceptor implements RequestInterceptor {
  private isEnabled: boolean

  constructor(isEnabled: boolean = process.env.NODE_ENV === 'development') {
    this.isEnabled = isEnabled
  }

  onRequest(config: any): any {
    if (!this.isEnabled) return config

    console.log(`🚀 API Request:`, {
      method: config.method || 'GET',
      url: config.url || 'unknown',
      headers: config.headers,
      body: config.body ? JSON.parse(config.body) : undefined,
      timestamp: new Date().toISOString()
    })

    return config
  }

  onResponse<T>(response: T): T {
    if (!this.isEnabled) return response

    console.log(`✅ API Response:`, {
      data: response,
      timestamp: new Date().toISOString()
    })

    return response
  }

  onError(error: any): any {
    if (!this.isEnabled) return error

    console.error(`❌ API Error:`, {
      error: error.error || error.message,
      code: error.code,
      details: error.details,
      timestamp: error.timestamp || new Date().toISOString()
    })

    return error
  }
}
