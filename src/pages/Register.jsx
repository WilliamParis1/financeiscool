import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GlowButton from '../components/GlowButton'

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

  const inputClass = 'w-full bg-mist border border-navy/15 rounded-lg px-4 py-2.5 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 transition-all'

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-2xl p-8 border border-navy/10 shadow-lg">
        <h1 className="text-2xl font-extrabold text-center mb-6 text-navy">Create Account</h1>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-navy/60 mb-1 font-medium">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
              placeholder="your_username" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-navy/60 mb-1 font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-navy/60 mb-1 font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="At least 6 characters" className={inputClass} />
          </div>
          <GlowButton type="submit" disabled={loading} className="py-2.5 mt-2 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </GlowButton>
        </form>

        <p className="text-center text-navy/50 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-gold-dark hover:text-gold font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
