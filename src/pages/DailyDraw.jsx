import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'
import GlowButton from '../components/GlowButton'

const CLAIM_COOLDOWN_MS = 60 * 1000

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
  legendary: { text: '🌟 LEGENDARY!',   color: '#c9a24b' },
  rare:      { text: '💫 RARE CARD!',    color: '#2563eb' },
  common:    { text: '✦ Card obtained!', color: '#0a1f44' },
}

function formatRemaining(ms) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m ${s}s`
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function DailyDraw() {
  const { user } = useAuth()
  const [lastCard, setLastCard] = useState(null)
  const [lastClaimAt, setLastClaimAt] = useState(null)
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [newCard, setNewCard] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => { checkLastClaim() }, [user])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const cooldownEndsAt = lastClaimAt ? lastClaimAt + CLAIM_COOLDOWN_MS : 0
  const onCooldown = lastClaimAt != null && now < cooldownEndsAt
  const remainingMs = Math.max(0, cooldownEndsAt - now)

  async function checkLastClaim() {
    const { data } = await supabase
      .from('daily_claims')
      .select('claimed_at, cards(*)')
      .eq('user_id', user.id)
      .order('claimed_at', { ascending: false })
      .limit(1)
    const row = data?.[0]
    if (row) {
      setLastCard(row.cards)
      setLastClaimAt(new Date(row.claimed_at).getTime())
    }
    setLoading(false)
  }

  async function claimCard() {
    if (onCooldown) return
    setRevealing(true)
    setRevealed(false)
    setError('')

    try {
      const { data: cards } = await supabase.from('cards').select('*')
      if (!cards || cards.length === 0) {
        throw new Error('No cards available yet. Ask an admin to add some!')
      }

      const card = pickWeightedCard(cards)

      const { error: claimError } = await supabase.from('daily_claims').insert({
        user_id: user.id,
        card_id: card.id,
        claimed_at: new Date().toISOString(),
      })
      if (claimError) throw new Error(claimError.message)

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
        setFlash(true)
        setNewCard(card)
        setRevealing(false)
        setRevealed(true)
        setLastCard(card)
        setLastClaimAt(Date.now())
        setTimeout(() => setFlash(false), 600)
      }, 1400)
    } catch (err) {
      setError(err.message)
      setRevealing(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>

  const rarityCfg = RARITY[newCard?.rarity] || RARITY.common

  return (
    <div className="max-w-2xl mx-auto text-center">
      {flash && <div className="screen-flash" />}

      <h1 className="text-4xl font-extrabold text-navy mb-2">Daily Card Draw</h1>
      <p className="text-navy/50 mb-3">Draw a card and grow your collection.</p>

      {onCooldown && (
        <p className="text-sm text-navy/60 mb-8">
          Next card in:{' '}
          <span className="text-gold-dark font-mono font-bold text-base">
            {formatRemaining(remainingMs)}
          </span>
        </p>
      )}
      {!onCooldown && <div className="mb-8" />}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-6 text-sm">{error}</div>
      )}

      {revealing ? (
        <div className="flex flex-col items-center gap-10">
          <div className="relative w-56 h-72 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl blur-2xl bg-gold/30" />
            <div className="mystery-card draw-spin relative w-52 h-72 rounded-2xl flex items-center justify-center bg-gradient-to-br from-navy via-navy-mid to-navy-dark border-2 border-gold/60 shadow-2xl">
              <div className="relative z-10 text-gold text-6xl animate-spin">✦</div>
            </div>
          </div>
          <p className="text-navy/50 font-semibold">Drawing your card…</p>
        </div>

      ) : revealed && newCard ? (
        <div className="flex flex-col items-center gap-6">
          <div className="reveal-card">
            <CardDisplay card={newCard} onClick={setSelectedCard} />
          </div>
          <p className="text-3xl font-extrabold tracking-wide" style={{ color: rarityCfg.color }}>
            {rarityCfg.text}
          </p>
          <p className="text-navy font-semibold text-lg">{newCard?.name}</p>
          {!onCooldown && (
            <GlowButton onClick={claimCard} className="px-14 py-4 text-lg">Draw Again</GlowButton>
          )}
        </div>

      ) : onCooldown ? (
        <div className="flex flex-col items-center gap-6">
          <p className="text-green-700 font-semibold bg-green-50 border border-green-200 px-4 py-2 rounded-full">
            ✓ Card claimed!
          </p>
          {lastCard && <CardDisplay card={lastCard} onClick={setSelectedCard} />}
        </div>

      ) : (
        <div className="flex flex-col items-center gap-10">
          <div className="relative w-56 h-72 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl blur-2xl bg-gold/30" />
            <div className="mystery-card shine-sweep relative w-52 h-72 rounded-2xl flex items-center justify-center bg-gradient-to-br from-navy via-navy-mid to-navy-dark border-2 border-gold/60 shadow-2xl">
              <div className="relative z-10 text-center">
                <div className="text-7xl mb-2 drop-shadow-lg">🎴</div>
                <p className="text-gold-light text-sm font-semibold tracking-widest uppercase">Mystery</p>
              </div>
            </div>
          </div>
          <GlowButton onClick={claimCard} className="px-14 py-4 text-lg">
            {lastClaimAt ? 'Draw Again' : "Claim Today's Card"}
          </GlowButton>
        </div>
      )}

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
