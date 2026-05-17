import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const dropdownRef = useRef(null)

  async function handleSignOut() {
    await signOut()
    setAvatarOpen(false)
    navigate('/')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const linkClass = 'text-navy/70 hover:text-gold transition-colors font-medium'

  return (
    <nav className="bg-white border-b border-navy/10 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/">
            <img src="/logo.png" alt="Finance Trading Cards" className="h-10 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={linkClass}>Home</Link>
            <Link to="/explore" className={linkClass}>💰 Explore</Link>
            <Link to="/daily" className={linkClass}>🎴 Daily Draw</Link>
            <Link to="/collection" className={linkClass}>👜 Collection</Link>
            <Link to="/leaderboard" className={linkClass}>🏆 Leaderboard</Link>
            <Link to="/trade" className={linkClass}>🔄 Trades</Link>
            {profile?.is_admin && (
              <Link to="/admin" className="text-gold hover:text-gold-dark transition-colors font-semibold">Admin</Link>
            )}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* ID label */}
                <span className="text-navy/50 text-sm font-medium">
                  ID: <span className="text-navy font-bold">{profile?.username}</span>
                </span>

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setAvatarOpen(o => !o)}
                    className="w-9 h-9 rounded-full ring-2 ring-gold/30 hover:ring-gold/60 transition-all overflow-hidden shrink-0"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-navy hover:bg-navy-mid flex items-center justify-center">
                        <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                      </div>
                    )}
                  </button>

                  {avatarOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-navy/10 rounded-xl shadow-lg py-1 z-50">
                      <Link
                        to={`/profile/${profile?.username}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-navy hover:bg-mist transition-colors"
                        onClick={() => setAvatarOpen(false)}
                      >
                        <svg className="w-4 h-4 text-navy/50" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                        My Profile
                      </Link>
                      <div className="border-t border-navy/8 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
            <Link to="/" className={linkClass} onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/explore" className={linkClass} onClick={() => setMenuOpen(false)}>💰 Explore</Link>
            <Link to="/daily" className={linkClass} onClick={() => setMenuOpen(false)}>🎴 Daily Draw</Link>
            <Link to="/collection" className={linkClass} onClick={() => setMenuOpen(false)}>👜 Collection</Link>
            <Link to="/leaderboard" className={linkClass} onClick={() => setMenuOpen(false)}>🏆 Leaderboard</Link>
            <Link to="/trade" className={linkClass} onClick={() => setMenuOpen(false)}>🔄 Trades</Link>
            {profile?.is_admin && (
              <Link to="/admin" className="text-gold font-semibold" onClick={() => setMenuOpen(false)}>Admin</Link>
            )}
            {user ? (
              <>
                <div className="text-navy/50 text-sm">
                  ID: <span className="text-navy font-bold">{profile?.username}</span>
                </div>
                <Link to={`/profile/${profile?.username}`} className="text-navy font-semibold" onClick={() => setMenuOpen(false)}>
                  My Profile
                </Link>
                <button onClick={handleSignOut} className="text-left text-red-600 hover:text-red-700 text-sm">Sign Out</button>
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
