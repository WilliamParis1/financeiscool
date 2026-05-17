import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'
import AvatarPickerModal from '../components/AvatarPickerModal'

export default function Profile() {
  const { username } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [notFound, setNotFound] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)

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
    setAvatarUrl(profileData.avatar_url || null)

    const { data: cardData } = await supabase
      .from('user_cards')
      .select('*, cards(*)')
      .eq('user_id', profileData.id)
      .order('obtained_at', { ascending: false })

    setCards(cardData?.map(uc => ({ ...uc.cards, quantity: uc.quantity, user_card_id: uc.id })) || [])
    setLoading(false)
  }

  const isOwnProfile = user && profile && user.id === profile.id
  const filtered = filter === 'all' ? cards : cards.filter(c => c.rarity === filter)
  const legendaryCount = cards.filter(c => c.rarity === 'legendary').length
  const rareCount = cards.filter(c => c.rarity === 'rare').length

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>
  if (notFound) return <div className="text-center py-20 text-navy/50 text-xl">User not found</div>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Profile header */}
      <div className="bg-white rounded-2xl p-8 border border-navy/10 shadow-lg mb-8">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.username}
                className="w-20 h-20 rounded-full object-cover border-2 border-gold/40 shadow"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-navy to-navy-dark rounded-full flex items-center justify-center text-3xl font-bold text-gold">
                {profile.username[0].toUpperCase()}
              </div>
            )}
            {isOwnProfile && (
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-navy/20 rounded-full flex items-center justify-center shadow hover:border-gold transition-colors"
                title="Edit photo"
              >
                <svg className="w-3.5 h-3.5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-navy">{profile.username}</h1>
            <p className="text-navy/50 text-sm">
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            {isOwnProfile && (
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="mt-1.5 text-xs text-navy/40 hover:text-gold-dark font-semibold transition-colors"
              >
                Edit photo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-navy/10">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-navy">{cards.length}</p>
            <p className="text-navy/50 text-sm">Total Cards</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-blue-600">{rareCount}</p>
            <p className="text-navy/50 text-sm">Rare</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gold-dark">{legendaryCount}</p>
            <p className="text-navy/50 text-sm">Legendary</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'common', 'rare', 'legendary'].map(r => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
              filter === r ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-navy/50">No cards here yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(card => (
            <CardDisplay key={card.user_card_id} card={card} onClick={setSelectedCard} />
          ))}
        </div>
      )}

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}

      {showAvatarPicker && (
        <AvatarPickerModal
          cards={cards}
          onClose={() => setShowAvatarPicker(false)}
          onSaved={url => setAvatarUrl(url)}
        />
      )}
    </div>
  )
}
