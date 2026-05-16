import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('total')

  useEffect(() => { loadLeaderboard() }, [])

  async function loadLeaderboard() {
    const [{ data: userCards }, { data: profiles }] = await Promise.all([
      supabase.from('user_cards').select('user_id, quantity, cards!inner(rarity)'),
      supabase.from('profiles').select('id, username'),
    ])

    if (!userCards || !profiles) { setLoading(false); return }

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.username]))
    const userMap = {}

    userCards.forEach(uc => {
      const uid = uc.user_id
      if (!userMap[uid]) userMap[uid] = { username: profileMap[uid], total: 0, common: 0, rare: 0, legendary: 0 }
      const qty = uc.quantity || 1
      userMap[uid].total += qty
      const r = uc.cards?.rarity
      if (r) userMap[uid][r] += qty
    })

    setPlayers(Object.values(userMap).filter(u => u.username))
    setLoading(false)
  }

  const sorted = [...players]
    .sort((a, b) => tab === 'legendary' ? b.legendary - a.legendary : tab === 'rare' ? b.rare - a.rare : b.total - a.total)
    .slice(0, 50)

  const MEDALS = ['text-amber-400', 'text-gray-300', 'text-amber-700']

  if (loading) return <div className="text-center py-20 text-purple-400 animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-purple-300 mb-2">Leaderboard</h1>
      <p className="text-gray-500 mb-6">Top collectors in CardQuest</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'total',     label: 'Most Cards'  },
          { key: 'legendary', label: '★ Legendary' },
          { key: 'rare',      label: '◆ Rare'      },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === key ? 'bg-purple-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-purple-900/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a2e] rounded-2xl border border-purple-900/30 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No players yet — be the first!</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-900/30 text-sm">
                <th className="text-left p-4 text-gray-500 font-medium w-10">#</th>
                <th className="text-left p-4 text-gray-500 font-medium">Player</th>
                <th className="text-right p-4 text-gray-500 font-medium">Total</th>
                <th className="text-right p-4 text-amber-500 font-medium">★</th>
                <th className="text-right p-4 text-blue-500 font-medium">◆</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, i) => (
                <tr key={player.username} className="border-b border-purple-900/20 hover:bg-purple-900/10 transition-colors">
                  <td className={`p-4 font-bold ${MEDALS[i] || 'text-gray-500'}`}>{i + 1}</td>
                  <td className="p-4">
                    <Link to={`/profile/${player.username}`} className="text-gray-200 hover:text-purple-400 transition-colors font-medium">
                      {player.username}
                    </Link>
                  </td>
                  <td className="p-4 text-right text-gray-300">{player.total}</td>
                  <td className="p-4 text-right text-amber-400 font-medium">{player.legendary}</td>
                  <td className="p-4 text-right text-blue-400">{player.rare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
