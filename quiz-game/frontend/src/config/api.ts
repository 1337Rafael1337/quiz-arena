/**
 * API Configuration
 */

// Get API base URL from environment or use default
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SETUP_STATUS: `/api/auth/setup-status`,
    SETUP_ADMIN: `/api/auth/setup-admin`,
    LOGIN: `/api/auth/login`,
    REGISTER: `/api/auth/register`,
  },
  
  // Admin
  ADMIN: {
    STATS: `/api/admin/stats`,
    QUESTIONS: `/api/admin/questions`,
    CATEGORIES: `/api/admin/categories`,
    GAMES: `/api/admin/games`,
    USERS: `/api/admin/users`,
    IMPORT_CSV: `/api/admin/import-csv`,
  },
  
  // User
  USER: {
    STATS: `/api/user/stats`,
    QUESTIONS: `/api/user/questions`,
    CATEGORIES: `/api/user/categories`,
    GAMES: `/api/user/games`,
  },
  
  // Public
  HEALTH: `/api/health`,
  GAMES_PUBLIC: `/api/games/public`,
} as const

/**
 * Helper function to build API URLs
 */
export function buildApiUrl(endpoint: string, params?: Record<string, string | number>): string {
  let url = `${API_BASE_URL}${endpoint}`
  
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value))
    })
    url += `?${searchParams.toString()}`
  }
  
  return url
}

/**
 * Get authorization headers
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Common fetch wrapper with error handling
 */
export async function apiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  }
  
  // Build full URL if it's a relative path
  const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }
  
  try {
    const response = await fetch(fullUrl, config)
    return response
  } catch (error) {
    console.error('API Request failed:', error)
    throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.')
  }
}

/**
 * Handle API response with proper error handling
 */
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.error || errorMessage
    } catch {
      // If not JSON, use the text as error message
      errorMessage = errorText || errorMessage
    }
    
    throw new Error(errorMessage)
  }
  
  return response.json()
}