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

  const linkClass = 'text-navy/70 hover:text-gold transition-colors font-medium'

  return (
    <nav className="bg-white border-b border-navy/10 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
            <span className="text-gold">◆</span>
            <span className="text-navy">Finance is Cool</span>
            <span className="text-gold">Cards</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/daily" className={linkClass}>Daily Draw</Link>
            <Link to="/collection" className={linkClass}>Collection</Link>
            <Link to="/leaderboard" className={linkClass}>Leaderboard</Link>
            <Link to="/trade" className={linkClass}>Trades</Link>
            {profile?.is_admin && (
              <Link to="/admin" className="text-gold hover:text-gold-dark transition-colors font-semibold">Admin</Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to={`/profile/${profile?.username}`}
                  className="text-navy hover:text-gold transition-colors font-semibold"
                >
                  {profile?.username}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-navy hover:bg-navy-mid text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass}>Login</Link>
                <Link
                  to="/register"
                  className="bg-gold hover:bg-gold-dark text-navy-dark px-4 py-1.5 rounded-lg text-sm transition-colors font-bold"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-navy p-1" onClick={() => setMenuOpen(!menuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 flex flex-col gap-4 border-t border-navy/10">
            <Link to="/daily" className={linkClass} onClick={() => setMenuOpen(false)}>Daily Draw</Link>
            <Link to="/collection" className={linkClass} onClick={() => setMenuOpen(false)}>Collection</Link>
            <Link to="/leaderboard" className={linkClass} onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            <Link to="/trade" className={linkClass} onClick={() => setMenuOpen(false)}>Trades</Link>
            {profile?.is_admin && (
              <Link to="/admin" className="text-gold font-semibold" onClick={() => setMenuOpen(false)}>Admin</Link>
            )}
            {user ? (
              <>
                <Link to={`/profile/${profile?.username}`} className="text-navy font-semibold" onClick={() => setMenuOpen(false)}>
                  {profile?.username}
                </Link>
                <button onClick={handleSignOut} className="text-left text-red-600 hover:text-red-700">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="text-gold font-bold" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
