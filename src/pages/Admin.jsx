import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'

// Suggested default weight per rarity (game master can override per card)
const DEFAULT_WEIGHT = { common: 70, rare: 25, legendary: 5 }

export default function Admin() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('add')
  const [selectedCard, setSelectedCard] = useState(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rarity, setRarity] = useState('common')
  const [weight, setWeight] = useState(70)
  const [weightTouched, setWeightTouched] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadCards() }, [])

  // Keep weight in sync with rarity until the game master edits it manually
  function handleRarityChange(value) {
    setRarity(value)
    if (!weightTouched) setWeight(DEFAULT_WEIGHT[value])
  }

  async function loadCards() {
    const { data } = await supabase.from('cards').select('*').order('created_at', { ascending: false })
    setCards(data || [])
    setLoading(false)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function addCard(e) {
    e.preventDefault()
    if (!imageFile) { setError('Please select an image'); return }
    if (weight <= 0) { setError('Drop weight must be greater than 0'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const ext = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('card-images').upload(fileName, imageFile)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('card-images').getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('cards').insert({
        name,
        description: description || null,
        image_url: urlData.publicUrl,
        rarity,
        rarity_weight: Number(weight),
      })
      if (insertError) throw insertError

      setSuccess(`"${name}" added successfully!`)
      setName('')
      setDescription('')
      setRarity('common')
      setWeight(DEFAULT_WEIGHT.common)
      setWeightTouched(false)
      setImageFile(null)
      setImagePreview('')
      loadCards()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateWeight(card, newWeight) {
    const w = Number(newWeight)
    if (isNaN(w) || w < 0) return
    setCards(cs => cs.map(c => c.id === card.id ? { ...c, rarity_weight: w } : c))
    await supabase.from('cards').update({ rarity_weight: w }).eq('id', card.id)
  }

  async function deleteCard(card) {
    if (!window.confirm(`Delete "${card.name}"? This removes it from all collections.`)) return
    await supabase.from('user_cards').delete().eq('card_id', card.id)
    await supabase.from('daily_claims').delete().eq('card_id', card.id)
    await supabase.from('cards').delete().eq('id', card.id)
    loadCards()
  }

  // Total weight across all cards, used to show real drop probability
  const totalWeight = cards.reduce((s, c) => s + Math.max(0, c.rarity_weight || 0), 0)
  const pct = w => totalWeight > 0 ? ((Math.max(0, w || 0) / totalWeight) * 100).toFixed(1) : '0.0'

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-400 mb-1">Admin Panel</h1>
      <p className="text-gray-500 mb-6">{cards.length} cards in the database</p>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'add',   label: 'Add Card' },
          { key: 'cards', label: `Manage Cards (${cards.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === key ? 'bg-yellow-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-yellow-900/30'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div className="bg-[#1a1a2e] rounded-2xl p-8 border border-yellow-900/30">
          <h2 className="text-xl font-semibold text-gray-200 mb-6">Add New Card</h2>

          {error   && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 mb-5 text-sm">{error}</div>}
          {success && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg p-3 mb-5 text-sm">{success}</div>}

          <form onSubmit={addCard} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Card Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full bg-[#0f0f1a] border border-yellow-900/40 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rarity (visual style) *</label>
                <select value={rarity} onChange={e => handleRarityChange(e.target.value)}
                  className="w-full bg-[#0f0f1a] border border-yellow-900/40 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-yellow-500">
                  <option value="common">Common (grey border)</option>
                  <option value="rare">Rare (blue glow)</option>
                  <option value="legendary">Legendary (gold glow)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Drop Weight *</label>
              <input type="number" min="1" value={weight}
                onChange={e => { setWeight(e.target.value); setWeightTouched(true) }} required
                className="w-full md:w-48 bg-[#0f0f1a] border border-yellow-900/40 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-yellow-500" />
              <p className="text-xs text-gray-500 mt-1.5">
                Higher = drawn more often. A card with weight 70 is 14× more likely than one with weight 5.
                {totalWeight > 0 && (
                  <span className="text-yellow-500"> &nbsp;Estimated drop chance: {pct(weight)}%</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Optional flavour text..."
                className="w-full bg-[#0f0f1a] border border-yellow-900/40 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-yellow-500 resize-none" />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Card Image (PNG) *</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange}
                className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-900/40 file:text-yellow-300 hover:file:bg-yellow-900/60 cursor-pointer" />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-3 w-36 h-36 object-cover rounded-xl border-2 border-yellow-700/50" />
              )}
            </div>

            <button type="submit" disabled={submitting}
              className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white py-3 px-8 rounded-xl font-semibold transition-colors">
              {submitting ? 'Uploading...' : 'Add Card'}
            </button>
          </form>
        </div>
      )}

      {tab === 'cards' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-yellow-400 animate-pulse">Loading...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-[#1a1a2e] rounded-2xl border border-yellow-900/30">
              No cards yet — add some above!
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Edit a card's drop weight below — the drop chance updates live. Total weight across all cards: {totalWeight}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {cards.map(card => (
                  <div key={card.id} className="relative group">
                    <CardDisplay card={card} onClick={setSelectedCard} />
                    <button
                      onClick={() => deleteCard(card)}
                      className="absolute top-2 right-2 bg-red-900/80 hover:bg-red-700 text-white w-7 h-7 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                    >
                      ✕
                    </button>
                    <div className="mt-2 bg-[#1a1a2e] border border-yellow-900/30 rounded-lg p-2">
                      <label className="block text-[11px] text-gray-500 mb-1">Drop weight</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0"
                          value={card.rarity_weight ?? 0}
                          onChange={e => updateWeight(card, e.target.value)}
                          className="w-16 bg-[#0f0f1a] border border-yellow-900/40 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-yellow-500"
                        />
                        <span className="text-xs text-yellow-500 font-medium">{pct(card.rarity_weight)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
