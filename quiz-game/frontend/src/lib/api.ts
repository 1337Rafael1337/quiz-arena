export const API_URL = import.meta.env.VITE_API_URL || ''

type FetchOptions = {
  method?: string
  body?: any
  headers?: Record<string, string>
  isFormData?: boolean
}

export async function apiFetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, isFormData = false } = options

  const fetchHeaders: Record<string, string> = { ...headers }

  if (!isFormData && method !== 'GET') {
    fetchHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: fetchHeaders,
    credentials: 'include', // send httpOnly auth cookie automatically
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Ein Fehler ist aufgetreten')
  }

  return data
}
