import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'
import GlowButton from '../components/GlowButton'

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

const RARITY = {
  legendary: { text: '🌟 LEGENDARY!',   color: '#c9a24b', sparkles: 26 },
  rare:      { text: '💫 RARE CARD!',    color: '#2563eb', sparkles: 14 },
  common:    { text: '✦ Card obtained!', color: '#0a1f44', sparkles: 6  },
}

// Pre-computed sparkle vectors (radial burst)
function makeSparkles(n) {
  return Array.from({ length: n }).map((_, i) => {
    const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4
    const dist = 90 + Math.random() * 150
    return {
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist}px`,
      delay: `${Math.random() * 0.25}s`,
    }
  })
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
  const [flash, setFlash] = useState(false)

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

      // Build-up spin, then a flashy reveal
      setTimeout(() => {
        setFlash(true)
        setNewCard(card)
        setRevealing(false)
        setRevealed(true)
        setTodayClaim(card)
        setTimeout(() => setFlash(false), 600)
      }, 1400)
    } catch (err) {
      setError(err.message)
      setRevealing(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>

  const rarityCfg = RARITY[newCard?.rarity] || RARITY.common
  const sparkles = revealed ? makeSparkles(rarityCfg.sparkles) : []

  return (
    <div className="max-w-2xl mx-auto text-center">
      {flash && <div className="screen-flash" />}

      <h1 className="text-4xl font-extrabold text-navy mb-2">Daily Card Draw</h1>
      <p className="text-navy/50 mb-10">One free card every day — come back tomorrow for another!</p>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-6 text-sm">{error}</div>
      )}

      {todayClaim && !revealed ? (
        /* ---------- Already claimed ---------- */
        <div className="flex flex-col items-center gap-6">
          <p className="text-green-700 font-semibold bg-green-50 border border-green-200 px-4 py-2 rounded-full">
            ✓ You already claimed today's card!
          </p>
          <CardDisplay card={todayClaim} onClick={setSelectedCard} />
          <p className="text-navy/50 text-sm">
            Next card in: <span className="text-gold-dark font-mono font-bold">{timeUntilNext}</span>
          </p>
        </div>

      ) : !revealed ? (
        /* ---------- Idle / Drawing ---------- */
        <div className="flex flex-col items-center gap-10">
          <div className="relative w-56 h-72 flex items-center justify-center">
            {/* glow halo */}
            <div className="absolute inset-0 rounded-2xl blur-2xl bg-gold/30" />
            <div className={[
              'mystery-card relative w-52 h-72 rounded-2xl flex items-center justify-center',
              'bg-gradient-to-br from-navy via-navy-mid to-navy-dark',
              'border-2 border-gold/60 shadow-2xl',
              revealing ? 'draw-spin' : 'shine-sweep',
            ].join(' ')}>
              <div className="relative z-10 text-center">
                {revealing ? (
                  <div className="text-gold text-6xl animate-spin">✦</div>
                ) : (
                  <>
                    <div className="text-7xl mb-2 drop-shadow-lg">🎴</div>
                    <p className="text-gold-light text-sm font-semibold tracking-widest uppercase">
                      Mystery
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <GlowButton
            onClick={claimCard}
            disabled={revealing}
            className="px-14 py-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {revealing ? 'Drawing your card…' : "Claim Today's Card"}
          </GlowButton>
        </div>

      ) : (
        /* ---------- Reveal ---------- */
        <div className="flex flex-col items-center gap-6">
          <div
            className="relative flex items-center justify-center w-72 h-96"
            style={{ color: rarityCfg.color }}
          >
            {/* rays + shockwave behind the card */}
            <div className="ray-burst rounded-full" />
            <div className="shockwave" />
            <div className="shockwave" style={{ animationDelay: '0.12s' }} />

            {/* sparkle particles */}
            {sparkles.map((s, i) => (
              <span
                key={i}
                className="sparkle"
                style={{ '--dx': s.dx, '--dy': s.dy, animationDelay: s.delay }}
              />
            ))}

            <div className="reveal-card relative z-10">
              <CardDisplay card={newCard} onClick={setSelectedCard} />
            </div>
          </div>

          <p
            className="text-3xl font-extrabold tracking-wide"
            style={{ color: rarityCfg.color }}
          >
            {rarityCfg.text}
          </p>
          <p className="text-navy font-semibold text-lg">{newCard?.name}</p>
          <p className="text-navy/50 text-sm">
            Next card in: <span className="text-gold-dark font-mono font-bold">{timeUntilNext}</span>
          </p>
        </div>
      )}

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
