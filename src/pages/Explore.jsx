import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { readableTextColor, normalizeTagColor } from '../lib/cardMetadata'

const RARITY_STYLES = {
  common:    { border: 'border-navy/25',  badge: 'bg-navy/10 text-navy',       label: 'Common'    },
  rare:      { border: 'border-blue-500', badge: 'bg-blue-100 text-blue-700',  label: 'Rare'      },
  legendary: { border: 'border-gold',     badge: 'bg-gold/20 text-gold-dark',  label: 'Legendary' },
}

const RARITY_ORDER = { legendary: 0, rare: 1, common: 2 }

export default function Explore() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [ownedIds, setOwnedIds] = useState(new Set())
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [rarityFilter, setRarityFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [ownedFilter, setOwnedFilter] = useState('all') // 'all' | 'owned' | 'unowned'

  useEffect(() => { load() }, [user])

  async function load() {
    const queries = [
      supabase.from('cards').select('id, name, rarity, tag_names'),
      supabase.from('card_tags').select('name, color').order('name'),
    ]
    if (user) queries.push(supabase.from('user_cards').select('card_id').eq('user_id', user.id))

    const [{ data: cardData }, { data: tagData }, userCardsResult] = await Promise.all(queries)

    const sorted = (cardData || []).sort((a, b) => {
      const rd = (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3)
      return rd !== 0 ? rd : a.name.localeCompare(b.name)
    })

    setCards(sorted)
    setTags(tagData || [])
    if (userCardsResult?.data) {
      setOwnedIds(new Set(userCardsResult.data.map(uc => uc.card_id)))
    }
    setLoading(false)
  }

  const tagColorMap = Object.fromEntries(tags.map(t => [t.name, t.color]))

  const filtered = cards.filter(card => {
    if (rarityFilter !== 'all' && card.rarity !== rarityFilter) return false
    if (tagFilter !== 'all' && !(card.tag_names || []).includes(tagFilter)) return false
    if (ownedFilter === 'owned' && !ownedIds.has(card.id)) return false
    if (ownedFilter === 'unowned' && ownedIds.has(card.id)) return false
    return true
  })

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy mb-1">Explore</h1>
        <p className="text-navy/50">{cards.length} cards in the collection</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">

        {/* Rarity */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'common', 'rare', 'legendary'].map(r => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                rarityFilter === r ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
              }`}
            >
              {r === 'all' ? 'All rarities' : r}
            </button>
          ))}
        </div>

        {/* Owned toggle — only shown when logged in */}
        {user && (
          <div className="flex gap-1 bg-navy/5 rounded-full p-1">
            {[
              { value: 'all',     label: 'All'        },
              { value: 'owned',   label: '✅ Owned'   },
              { value: 'unowned', label: '☐ Missing'  },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setOwnedFilter(value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  ownedFilter === value ? 'bg-white text-navy shadow-sm' : 'text-navy/50 hover:text-navy'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTagFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                tagFilter === 'all' ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
              }`}
            >
              All tags
            </button>
            {tags.map(tag => {
              const color = normalizeTagColor(tag.color)
              const isActive = tagFilter === tag.name
              return (
                <button
                  key={tag.name}
                  onClick={() => setTagFilter(tag.name)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all border-2"
                  style={isActive
                    ? { backgroundColor: color, color: readableTextColor(color), borderColor: color }
                    : { backgroundColor: 'white', color: '#0a1f44', borderColor: `${color}60` }
                  }
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-sm text-navy/40 mb-4">
        {filtered.length} {filtered.length === 1 ? 'card' : 'cards'}
        {rarityFilter !== 'all' || tagFilter !== 'all' || ownedFilter !== 'all' ? ' matching filters' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-navy/40">No cards match these filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(card => {
            const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common
            const owned = ownedIds.has(card.id)
            const cardTags = (card.tag_names || []).filter(Boolean)

            return (
              <div
                key={card.id}
                className={`relative bg-white rounded-xl border-2 p-4 flex flex-col gap-3 ${style.border} ${
                  card.rarity === 'rare' ? 'shadow-[0_0_12px_rgba(37,99,235,0.3)]' : 'shadow-sm'
                } ${!owned && user ? 'opacity-60' : ''}`}
              >
                {owned && (
                  <span className="absolute top-3 right-3 text-lg leading-none" title="You own this card">✅</span>
                )}

                <p className="font-bold text-navy text-base leading-snug text-center pr-6">{card.name}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                  {cardTags.map(tagName => {
                    const color = normalizeTagColor(tagColorMap[tagName])
                    return (
                      <span
                        key={tagName}
                        className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: color, color: readableTextColor(color) }}
                      >
                        {tagName}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
