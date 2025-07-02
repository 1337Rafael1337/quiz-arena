/**
 * Centralized error handling utilities
 */

export interface ApiError {
  message: string
  status?: number
  code?: string
}

export class AppError extends Error {
  public status: number
  public code?: string

  constructor(message: string, status: number = 500, code?: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

/**
 * Handle API responses and convert to standardized errors
 */
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten'
    let errorCode: string | undefined
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
      errorCode = errorData.code
    } catch {
      // If we can't parse JSON, use status text
      errorMessage = response.statusText || errorMessage
    }
    
    throw new AppError(errorMessage, response.status, errorCode)
  }
  
  return response.json()
}

/**
 * Handle network and other errors
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }
  
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch')) {
      return new AppError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.', 0, 'NETWORK_ERROR')
    }
    
    return new AppError(error.message, 500, 'UNKNOWN_ERROR')
  }
  
  return new AppError('Ein unbekannter Fehler ist aufgetreten', 500, 'UNKNOWN_ERROR')
}

/**
 * Show user-friendly error messages
 */
export function getErrorMessage(error: AppError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es später erneut.'
    case 'UNAUTHORIZED':
      return 'Sie sind nicht berechtigt, diese Aktion auszuführen. Bitte melden Sie sich erneut an.'
    case 'FORBIDDEN':
      return 'Zugriff verweigert. Sie haben nicht die erforderlichen Berechtigungen.'
    case 'NOT_FOUND':
      return 'Die angeforderte Ressource wurde nicht gefunden.'
    case 'VALIDATION_ERROR':
      return error.message // Use the specific validation message
    default:
      return error.message || 'Ein unerwarteter Fehler ist aufgetreten.'
  }
}

/**
 * Log errors for debugging
 */
export function logError(error: AppError, context?: string) {
  const errorInfo = {
    message: error.message,
    status: error.status,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }
  
  console.error('Application Error:', errorInfo)
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }
}

/**
 * Retry mechanism for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}