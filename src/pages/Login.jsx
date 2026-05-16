import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/daily')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-[#1a1a2e] rounded-2xl p-8 border border-purple-900/30">
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-300">Welcome Back</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#0f0f1a] border border-purple-900/50 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#0f0f1a] border border-purple-900/50 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition-colors mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300">Create one free</Link>
        </p>
      </div>
    </div>
  )
}
