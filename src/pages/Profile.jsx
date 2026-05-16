import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'

export default function Profile() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { loadProfile() }, [username])

  async function loadProfile() {
    setLoading(true)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!profileData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setProfile(profileData)

    const { data: cardData } = await supabase
      .from('user_cards')
      .select('*, cards(*)')
      .eq('user_id', profileData.id)
      .order('obtained_at', { ascending: false })

    setCards(cardData?.map(uc => ({ ...uc.cards, quantity: uc.quantity, user_card_id: uc.id })) || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? cards : cards.filter(c => c.rarity === filter)
  const legendaryCount = cards.filter(c => c.rarity === 'legendary').length
  const rareCount = cards.filter(c => c.rarity === 'rare').length

  if (loading) return <div className="text-center py-20 text-purple-400 animate-pulse">Loading...</div>
  if (notFound) return <div className="text-center py-20 text-gray-500 text-xl">User not found</div>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Profile header */}
      <div className="bg-[#1a1a2e] rounded-2xl p-8 border border-purple-900/30 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-700 to-purple-900 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0">
            {profile.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{profile.username}</h1>
            <p className="text-gray-500 text-sm">
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-purple-900/20">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{cards.length}</p>
            <p className="text-gray-500 text-sm">Total Cards</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{rareCount}</p>
            <p className="text-gray-500 text-sm">Rare</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{legendaryCount}</p>
            <p className="text-gray-500 text-sm">Legendary</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'common', 'rare', 'legendary'].map(r => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === r ? 'bg-purple-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-purple-900/30'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No cards here yet.</div>
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
