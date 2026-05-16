import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GlowButton from '../components/GlowButton'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-navy">
          Finance is Cool <span className="text-gold">Cards</span>
        </h1>
        <p className="text-xl text-navy/60 max-w-lg mx-auto">
          Collect a rare card every day, build your collection, and trade with other players.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-16">
        {user ? (
          <Link to="/daily">
            <GlowButton className="px-8 py-3 text-lg">Claim Today's Card →</GlowButton>
          </Link>
        ) : (
          <>
            <Link to="/register">
              <GlowButton className="px-8 py-3 text-lg">Get Started Free</GlowButton>
            </Link>
            <Link
              to="/login"
              className="border-2 border-navy hover:bg-navy hover:text-white text-navy px-8 py-3 rounded-xl text-lg font-bold transition-colors"
            >
              Login
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        {[
          { icon: '🎴', title: 'Daily Cards', desc: 'Claim one free card every day. Common, Rare, or Legendary?' },
          { icon: '✨', title: 'Build Collections', desc: 'Grow your collection and show it off on your public profile.' },
          { icon: '🔄', title: 'Trade & Gift', desc: 'Trade cards with friends or gift duplicates to complete your set.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl p-6 border border-navy/10 shadow-sm hover:shadow-md hover:border-gold/40 transition-all">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-bold text-navy mb-2">{title}</h3>
            <p className="text-navy/60 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
