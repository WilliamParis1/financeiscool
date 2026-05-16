import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-purple-400 text-xl animate-pulse">Loading...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !profile?.is_admin) return <Navigate to="/" replace />

  return children
}
