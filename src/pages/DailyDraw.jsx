import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'

// Picks a card using each card's own drop weight (set by the game master in
// the admin panel). A higher weight = more likely to be drawn.
function pickWeightedCard(cards) {
  const total = cards.reduce((sum, c) => sum + Math.max(0, c.rarity_weight || 0), 0)
  if (total <= 0) return cards[Math.floor(Math.random() * cards.length)]
  let roll = Math.random() * total
  for (const c of cards) {
    roll -= Math.max(0, c.rarity_weight || 0)
    if (roll <= 0) return c
  }
  return cards[cards.length - 1]
}

const REVEAL_MSG = {
  legendary: { text: '🌟 LEGENDARY!', color: 'text-amber-400' },
  rare:      { text: '💫 Rare card!',  color: 'text-blue-400'  },
  common:    { text: '✦ Card obtained!', color: 'text-gray-300' },
}

export default function DailyDraw() {
  const { user } = useAuth()
  const [todayClaim, setTodayClaim] = useState(null)
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [newCard, setNewCard] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeUntilNext, setTimeUntilNext] = useState('')

  useEffect(() => { checkTodayClaim() }, [user])

  useEffect(() => {
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [])

  function updateCountdown() {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const diff = tomorrow - now
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    setTimeUntilNext(`${h}h ${m}m ${s}s`)
  }

  async function checkTodayClaim() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('daily_claims')
      .select('*, cards(*)')
      .eq('user_id', user.id)
      .eq('claimed_at', today)
      .single()
    if (data) setTodayClaim(data.cards)
    setLoading(false)
  }

  async function claimCard() {
    setRevealing(true)
    setError('')

    try {
      const { data: cards } = await supabase.from('cards').select('*')

      if (!cards || cards.length === 0) {
        throw new Error('No cards available yet. Ask an admin to add some!')
      }

      const card = pickWeightedCard(cards)
      const today = new Date().toISOString().split('T')[0]

      const { error: claimError } = await supabase.from('daily_claims').insert({
        user_id: user.id,
        card_id: card.id,
        claimed_at: today,
      })

      if (claimError) {
        if (claimError.code === '23505') throw new Error('You already claimed your card today!')
        throw new Error(claimError.message)
      }

      const { data: existing } = await supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', card.id)
        .single()

      if (existing) {
        await supabase.from('user_cards').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('user_cards').insert({ user_id: user.id, card_id: card.id, quantity: 1 })
      }

      setTimeout(() => {
        setNewCard(card)
        setRevealing(false)
        setRevealed(true)
        setTodayClaim(card)
      }, 1200)
    } catch (err) {
      setError(err.message)
      setRevealing(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-purple-400 animate-pulse">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold text-purple-300 mb-2">Daily Card Draw</h1>
      <p className="text-gray-500 mb-8">One free card every day — come back tomorrow for another!</p>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 mb-6 text-sm">{error}</div>
      )}

      {todayClaim && !revealed ? (
        <div className="flex flex-col items-center gap-6">
          <p className="text-green-400 font-semibold">You already claimed today's card!</p>
          <CardDisplay card={todayClaim} onClick={setSelectedCard} />
          <p className="text-gray-500 text-sm">
            Next card in: <span className="text-purple-400 font-mono">{timeUntilNext}</span>
          </p>
        </div>

      ) : !revealed ? (
        <div className="flex flex-col items-center gap-8">
          <div className={[
            'w-48 h-64 bg-[#1a1a2e] border-2 border-purple-700 rounded-xl',
            'flex items-center justify-center',
            'shadow-[0_0_25px_rgba(139,92,246,0.35)]',
            revealing ? 'animate-pulse' : '',
          ].join(' ')}>
            {revealing ? (
              <div className="text-purple-400 text-5xl animate-spin">✦</div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-3">🎴</div>
                <p className="text-purple-400 text-sm">Mystery card awaits</p>
              </div>
            )}
          </div>
          <button
            onClick={claimCard}
            disabled={revealing}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-12 py-3 rounded-xl text-lg font-semibold transition-colors"
          >
            {revealing ? 'Drawing your card...' : 'Claim Your Card'}
          </button>
        </div>

      ) : (
        <div className="flex flex-col items-center gap-6">
          <p className={`text-2xl font-bold ${REVEAL_MSG[newCard?.rarity]?.color || 'text-gray-300'}`}>
            {REVEAL_MSG[newCard?.rarity]?.text || '✦ Card obtained!'}
          </p>
          <CardDisplay card={newCard} onClick={setSelectedCard} />
          <p className="text-gray-500 text-sm">
            Next card in: <span className="text-purple-400 font-mono">{timeUntilNext}</span>
          </p>
        </div>
      )}

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
