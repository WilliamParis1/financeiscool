import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GlowButton from '../components/GlowButton'

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

  const inputClass = 'w-full bg-mist border border-navy/15 rounded-lg px-4 py-2.5 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 transition-all'

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-2xl p-8 border border-navy/10 shadow-lg">
        <h1 className="text-2xl font-extrabold text-center mb-6 text-navy">Welcome Back</h1>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-navy/60 mb-1 font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-navy/60 mb-1 font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} />
          </div>
          <GlowButton type="submit" disabled={loading} className="py-2.5 mt-2 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </GlowButton>
        </form>

        <p className="text-center text-navy/50 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-gold-dark hover:text-gold font-semibold">Create one free</Link>
        </p>
      </div>
    </div>
  )
}
