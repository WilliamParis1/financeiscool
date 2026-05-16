import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'

export default function Collection() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)

  useEffect(() => { loadCollection() }, [user])

  async function loadCollection() {
    const { data } = await supabase
      .from('user_cards')
      .select('*, cards(*)')
      .eq('user_id', user.id)
      .order('obtained_at', { ascending: false })
    setCards(data?.map(uc => ({ ...uc.cards, quantity: uc.quantity, user_card_id: uc.id })) || [])
    setLoading(false)
  }

  const counts = { all: cards.length, common: 0, rare: 0, legendary: 0 }
  cards.forEach(c => { if (counts[c.rarity] !== undefined) counts[c.rarity]++ })

  const filtered = cards
    .filter(c => filter === 'all' || c.rarity === filter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading collection...</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">My Collection</h1>
          <p className="text-navy/50">{cards.length} cards collected</p>
        </div>
        <input
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-mist border border-navy/15 rounded-lg px-4 py-2 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 w-full md:w-64"
        />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all',       label: `All (${counts.all})`             },
          { key: 'common',    label: `Common (${counts.common})`        },
          { key: 'rare',      label: `Rare (${counts.rare})`            },
          { key: 'legendary', label: `Legendary (${counts.legendary})`  },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              filter === key
                ? 'bg-navy text-white'
                : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-navy/50">
          {cards.length === 0
            ? <><p className="text-xl mb-2 font-semibold text-navy">Your collection is empty</p><p>Go to Daily Draw to get your first card!</p></>
            : <p>No cards match your filter.</p>
          }
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(card => (
            <CardDisplay key={card.user_card_id} card={card} onClick={setSelectedCard} />
          ))}
        </div>
      )}

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
