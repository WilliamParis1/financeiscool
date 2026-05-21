import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/explore',    icon: '/menu/explore.png',     label: 'Explore'      },
  { to: '/daily',      icon: '/menu/dailydraw.png',   label: 'Daily Draw'   },
  { to: '/collection', icon: '/menu/collection.png',  label: 'Collection'   },
  { to: '/leaderboard',icon: '/menu/leaderboard.png', label: 'Leaderboard'  },
  { to: '/trade',      icon: '/menu/trade.png',       label: 'Trades'       },
]

export default function Sidebar() {
  const { profile } = useAuth()

  return (
    <>
      {/* ── Desktop sidebar (left strip) ── */}
      <aside className="hidden md:flex flex-col items-center gap-4 fixed left-0 top-16 h-[calc(100vh-4rem)] w-16 bg-white border-r border-navy/10 py-6 z-30">
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
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-14 whitespace-nowrap bg-navy text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
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
               ${isActive
                 ? 'border-gold bg-gold/10'
                 : 'border-gold/40 hover:border-gold hover:shadow-[0_0_10px_rgba(201,162,75,0.45)]'}`
            }
          >
            <span className="text-gold font-extrabold text-xs">ADM</span>
            <span className="pointer-events-none absolute left-14 whitespace-nowrap bg-navy text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
              Admin
            </span>
          </NavLink>
        )}
      </aside>

      {/* ── Mobile bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-navy/10 flex justify-around items-center h-16 z-30 px-2">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all duration-200
               ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`
            }
          >
            <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 overflow-hidden transition-all duration-200`}
              style={{ borderColor: 'rgba(201,162,75,0.4)' }}>
              <img src={icon} alt={label} className="w-5 h-5 object-contain" />
            </div>
            <span className="text-[9px] font-semibold text-navy/60 leading-none">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
