import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useRef, useEffect } from 'react'

const NAV_ITEMS = [
  { to: '/explore',     icon: '/menu/explore.png',     label: 'Explore'     },
  { to: '/daily',       icon: '/menu/dailydraw.png',   label: 'Daily Draw'  },
  { to: '/collection',  icon: '/menu/collection.png',  label: 'Collection'  },
  { to: '/leaderboard', icon: '/menu/leaderboard.png', label: 'Leaderboard' },
  { to: '/trade',       icon: '/menu/trade.png',       label: 'Trades'      },
]

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
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

  const linkClass = 'text-navy/70 hover:text-gold border border-navy/15 hover:border-gold/50 rounded-lg px-3 py-1.5 font-medium transition-all duration-200 hover:shadow-[0_0_10px_rgba(201,162,75,0.35)]'

  return (
    <nav className="bg-white border-b border-navy/10 sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/">
            <img src="/logo19052026.png" alt="Finance Trading Cards" className="h-10 w-auto" />
          </Link>

          {/* Center icon nav */}
          <div className="hidden md:flex items-center gap-2">
            {NAV_ITEMS.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  `group relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 overflow-hidden
                   ${isActive
                     ? 'border-gold shadow-[0_0_12px_rgba(201,162,75,0.6)]'
                     : 'border-navy/15 hover:border-gold/60 hover:shadow-[0_0_10px_rgba(201,162,75,0.35)]'}`
                }
              >
                <img src={icon} alt={label} className="w-6 h-6 object-contain" />
                <span className="pointer-events-none absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-navy text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  {label}
                </span>
              </NavLink>
            ))}
            {profile?.is_admin && (
              <NavLink
                to="/admin"
                title="Admin"
                className={({ isActive }) =>
                  `group relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                   ${isActive ? 'border-gold bg-gold/10' : 'border-gold/40 hover:border-gold hover:shadow-[0_0_10px_rgba(201,162,75,0.45)]'}`
                }
              >
                <span className="text-gold font-extrabold text-xs">ADM</span>
                <span className="pointer-events-none absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-navy text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                  Admin
                </span>
              </NavLink>
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

        </div>
      </div>
    </nav>
  )
}
