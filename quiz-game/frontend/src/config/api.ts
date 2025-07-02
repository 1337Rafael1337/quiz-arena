/**
 * API Configuration
 */

// Get API base URL from environment or use default
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SETUP_STATUS: `${API_BASE_URL}/api/auth/setup-status`,
    SETUP_ADMIN: `${API_BASE_URL}/api/auth/setup-admin`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
  },
  
  // Admin
  ADMIN: {
    STATS: `${API_BASE_URL}/api/admin/stats`,
    QUESTIONS: `${API_BASE_URL}/api/admin/questions`,
    CATEGORIES: `${API_BASE_URL}/api/admin/categories`,
    GAMES: `${API_BASE_URL}/api/admin/games`,
    USERS: `${API_BASE_URL}/api/admin/users`,
    IMPORT_CSV: `${API_BASE_URL}/api/admin/import-csv`,
  },
  
  // Public
  HEALTH: `${API_BASE_URL}/api/health`,
  GAMES_PUBLIC: `${API_BASE_URL}/api/games/public`,
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
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }
  
  try {
    const response = await fetch(url, config)
    return response
  } catch (error) {
    console.error('API Request failed:', error)
    throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.')
  }
}