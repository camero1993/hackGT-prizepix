/**
 * Main API instance with configured interceptors
 * This is the primary export for API usage throughout the application
 */

import { ApiService, LoggingInterceptor } from './services'

// Create the main API service instance
export const apiService = new ApiService()

// Add logging interceptor for development
if (process.env.NODE_ENV === 'development') {
  const loggingInterceptor = new LoggingInterceptor(true)
  apiService.addRequestInterceptor(loggingInterceptor)
  apiService.addResponseInterceptor(loggingInterceptor)
}

// Export the service for direct usage
export { ApiService } from './services'
export * from './types'