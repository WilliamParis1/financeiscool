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
      supabase.from('profiles').select('id, username, avatar_url'),
    ])

    if (!userCards || !profiles) { setLoading(false); return }

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, { username: p.username, avatar_url: p.avatar_url }]))
    const userMap = {}

    userCards.forEach(uc => {
      const uid = uc.user_id
      const prof = profileMap[uid] || {}
      if (!userMap[uid]) userMap[uid] = { username: prof.username, avatar_url: prof.avatar_url, total: 0, common: 0, rare: 0, legendary: 0 }
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

  const MEDALS = ['text-gold-dark', 'text-navy/50', 'text-amber-700']

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold text-navy mb-2">Leaderboard</h1>
      <p className="text-navy/50 mb-6">Top collectors in Finance Trading Cards</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'total',     label: 'Most Cards'  },
          { key: 'legendary', label: '★ Legendary' },
          { key: 'rare',      label: '◆ Rare'      },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === key ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-navy/10 shadow-lg overflow-hidden">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-navy/50">No players yet — be the first!</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy/10 text-sm bg-mist">
                <th className="text-left p-4 text-navy/50 font-semibold w-10">#</th>
                <th className="text-left p-4 text-navy/50 font-semibold">Player</th>
                <th className="text-right p-4 text-navy/50 font-semibold">Total</th>
                <th className="text-right p-4 text-gold-dark font-semibold">★</th>
                <th className="text-right p-4 text-blue-600 font-semibold">◆</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((player, i) => (
                <tr key={player.username} className="border-b border-navy/5 hover:bg-mist transition-colors">
                  <td className={`p-4 font-bold ${MEDALS[i] || 'text-navy/40'}`}>{i + 1}</td>
                  <td className="p-4">
                    <Link to={`/profile/${player.username}`} className="flex items-center gap-2.5 hover:text-gold-dark transition-colors">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.username} className="w-7 h-7 rounded-full object-cover shrink-0 border border-navy/10" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-navy to-navy-dark flex items-center justify-center text-gold text-xs font-bold shrink-0">
                          {player.username[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-navy font-semibold">{player.username}</span>
                    </Link>
                  </td>
                  <td className="p-4 text-right text-navy">{player.total}</td>
                  <td className="p-4 text-right text-gold-dark font-semibold">{player.legendary}</td>
                  <td className="p-4 text-right text-blue-600">{player.rare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
