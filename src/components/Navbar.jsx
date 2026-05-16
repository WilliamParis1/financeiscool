import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="bg-[#1a1a2e] border-b border-purple-900/50 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold text-purple-400 tracking-wider hover:text-purple-300 transition-colors">
            ✦ CardQuest
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/daily" className="text-gray-300 hover:text-purple-400 transition-colors">Daily Draw</Link>
            <Link to="/collection" className="text-gray-300 hover:text-purple-400 transition-colors">Collection</Link>
            <Link to="/leaderboard" className="text-gray-300 hover:text-purple-400 transition-colors">Leaderboard</Link>
            <Link to="/trade" className="text-gray-300 hover:text-purple-400 transition-colors">Trades</Link>
            {profile?.is_admin && (
              <Link to="/admin" className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium">Admin</Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to={`/profile/${profile?.username}`}
                  className="text-purple-300 hover:text-purple-200 transition-colors font-medium"
                >
                  {profile?.username}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-purple-800 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300 hover:text-purple-400 transition-colors">Login</Link>
                <Link
                  to="/register"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg text-sm transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-gray-300 p-1" onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 flex flex-col gap-4 border-t border-purple-900/30">
            <Link to="/daily" className="text-gray-300 hover:text-purple-400" onClick={() => setMenuOpen(false)}>Daily Draw</Link>
            <Link to="/collection" className="text-gray-300 hover:text-purple-400" onClick={() => setMenuOpen(false)}>Collection</Link>
            <Link to="/leaderboard" className="text-gray-300 hover:text-purple-400" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            <Link to="/trade" className="text-gray-300 hover:text-purple-400" onClick={() => setMenuOpen(false)}>Trades</Link>
            {profile?.is_admin && (
              <Link to="/admin" className="text-yellow-400" onClick={() => setMenuOpen(false)}>Admin</Link>
            )}
            {user ? (
              <>
                <Link to={`/profile/${profile?.username}`} className="text-purple-300" onClick={() => setMenuOpen(false)}>
                  {profile?.username}
                </Link>
                <button onClick={handleSignOut} className="text-left text-red-400 hover:text-red-300">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-300" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="text-purple-400 font-medium" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
