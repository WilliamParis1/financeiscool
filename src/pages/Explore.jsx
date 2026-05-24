import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { readableTextColor, normalizeTagColor } from '../lib/cardMetadata'
import powellemoteVideo from '../../Powellemote.mp4'

const RARITY_ORDER = { legendary: 0, rare: 1, common: 2 }
const NO_TAG_COLOR = '#94a3b8'
const REWARD_TAG = 'Fed Chair'

export default function Explore() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [ownedIds, setOwnedIds] = useState(new Set())
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [rarityFilter, setRarityFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [ownedFilter, setOwnedFilter] = useState('all')
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const tagMenuRef = useRef(null)

  useEffect(() => { load() }, [user])

  useEffect(() => {
    function handleClick(e) {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target)) {
        setTagMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  // Group filtered cards into tag sections
  const groups = (() => {
    if (tagFilter !== 'all') {
      return filtered.length > 0 ? [{ tagName: tagFilter, cards: filtered }] : []
    }
    const map = new Map()
    for (const tag of tags) map.set(tag.name, [])
    map.set('__none__', [])
    for (const card of filtered) {
      const firstTag = (card.tag_names || []).filter(Boolean)[0] || '__none__'
      if (!map.has(firstTag)) map.set(firstTag, [])
      map.get(firstTag).push(card)
    }
    return [...map.entries()]
      .filter(([, c]) => c.length > 0)
      .map(([tagName, c]) => ({ tagName: tagName === '__none__' ? null : tagName, cards: c }))
  })()

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>

  const selectedTagObj = tags.find(t => t.name === tagFilter)
  const selectedTagColor = selectedTagObj ? normalizeTagColor(selectedTagObj.color) : null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-navy">Explore</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">

        {/* Rarity chips */}
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

        {/* Tag dropdown */}
        {tags.length > 0 && (
          <div className="relative" ref={tagMenuRef}>
            <button
              onClick={() => setTagMenuOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors"
              style={selectedTagColor ? {
                backgroundColor: selectedTagColor,
                color: readableTextColor(selectedTagColor),
                borderColor: selectedTagColor,
              } : {
                backgroundColor: 'white',
                color: 'rgba(10,31,68,0.65)',
                borderColor: 'rgba(10,31,68,0.15)',
              }}
            >
              {tagFilter === 'all' ? 'All tags' : tagFilter}
              <svg
                className="w-3.5 h-3.5 opacity-70 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tagMenuOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                />
              </svg>
            </button>

            {tagMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-navy/10 py-1.5 min-w-[200px] max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setTagFilter('all'); setTagMenuOpen(false) }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-navy/5 transition-colors flex items-center gap-2"
                >
                  <span className="w-3 h-3 rounded-full bg-navy/20 flex-shrink-0" />
                  <span className={tagFilter === 'all' ? 'text-navy' : 'text-navy/55'}>All tags</span>
                  {tagFilter === 'all' && <span className="ml-auto text-navy text-xs">✓</span>}
                </button>
                {tags.map(tag => {
                  const color = normalizeTagColor(tag.color)
                  const isActive = tagFilter === tag.name
                  return (
                    <button
                      key={tag.name}
                      onClick={() => { setTagFilter(tag.name); setTagMenuOpen(false) }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-navy/5 transition-colors flex items-center gap-2"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className={isActive ? 'text-navy' : 'text-navy/55'}>{tag.name}</span>
                      {isActive && <span className="ml-auto text-navy text-xs">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Owned toggle */}
        {user && (
          <div className="flex gap-1 bg-navy/5 rounded-full p-1">
            {[
              { value: 'all',     label: 'All'     },
              { value: 'owned',   label: 'Owned'   },
              { value: 'unowned', label: 'Missing' },
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
      </div>

      {/* Tag category sections */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-navy/40">No cards match these filters.</div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ tagName, cards: groupCards }) => {
            const tagObj = tags.find(t => t.name === tagName)
            const tagColor = tagObj ? normalizeTagColor(tagObj.color) : NO_TAG_COLOR
            const isRewardTag = tagName === REWARD_TAG

            return (
              <div key={tagName || '__none__'}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tagColor }} />
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: tagColor }}>
                    {tagName || 'Other'}
                  </h2>
                </div>

                {/* Cards grid + video slot */}
                <div className="flex gap-5 items-start">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                    {groupCards.map(card => {
                      const owned = ownedIds.has(card.id)
                      const cardTags = (card.tag_names || []).filter(Boolean)
                      const bgColor = cardTags.length > 0
                        ? normalizeTagColor(tagColorMap[cardTags[0]])
                        : NO_TAG_COLOR
                      const textColor = readableTextColor(bgColor)

                      return (
                        <div
                          key={card.id}
                          className={`rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm ${!owned && user ? 'opacity-55' : ''}`}
                          style={{ backgroundColor: bgColor, minHeight: '90px' }}
                        >
                          <p
                            className="font-bold text-sm leading-snug text-center"
                            style={{ color: textColor }}
                          >
                            {card.name}
                          </p>
                          {owned && (
                            <span className="text-base leading-none" title="You own this card">✅</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Video slot */}
                  <div className="w-36 flex-shrink-0">
                    {isRewardTag ? (
                      <video
                        src={powellemoteVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full rounded-xl"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-xl border-2 border-dashed border-navy/10" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
