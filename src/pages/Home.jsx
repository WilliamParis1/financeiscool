import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="mb-10">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
          CardQuest
        </h1>
        <p className="text-xl text-gray-400 max-w-lg">
          Collect rare cards every day, build your collection, and trade with other players.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-16">
        {user ? (
          <Link
            to="/daily"
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl text-lg font-semibold transition-colors"
          >
            Claim Today's Card →
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl text-lg font-semibold transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="border border-purple-600 hover:bg-purple-900/30 text-purple-400 px-8 py-3 rounded-xl text-lg font-semibold transition-colors"
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
          <div key={title} className="bg-[#1a1a2e] rounded-xl p-6 border border-purple-900/30">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-semibold text-purple-300 mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
