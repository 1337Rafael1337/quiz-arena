import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const userStr = localStorage.getItem('adminUser')

  if (!userStr) {
    return <Navigate to="/admin/login" replace />
  }

  try {
    const user = JSON.parse(userStr)
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />
    }
  } catch {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
