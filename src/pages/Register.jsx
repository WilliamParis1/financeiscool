import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (username.length < 3) return setError('Username must be at least 3 characters')
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('Username can only contain letters, numbers, and underscores')
    if (password.length < 6) return setError('Password must be at least 6 characters')

    setLoading(true)
    try {
      await signUp(email, password, username)
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
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-300">Create Account</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="your_username"
              className="w-full bg-[#0f0f1a] border border-purple-900/50 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
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
              placeholder="At least 6 characters"
              className="w-full bg-[#0f0f1a] border border-purple-900/50 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-semibold transition-colors mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
