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

  const totalWeight = cards.reduce((s, c) => s + Math.max(0, c.rarity_weight || 0), 0)
  const pct = w => totalWeight > 0 ? ((Math.max(0, w || 0) / totalWeight) * 100).toFixed(1) : '0.0'

  const inputClass = 'w-full bg-mist border border-navy/15 rounded-lg px-4 py-2.5 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30'

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-navy mb-1">Admin Panel</h1>
      <p className="text-navy/50 mb-6">{cards.length} cards in the database</p>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'add',   label: 'Add Card' },
          { key: 'cards', label: `Manage Cards (${cards.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === key ? 'bg-gold text-navy-dark' : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'add' && (
        <div className="bg-white rounded-2xl p-8 border border-navy/10 shadow-lg">
          <h2 className="text-xl font-bold text-navy mb-6">Add New Card</h2>

          {error   && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-5 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 mb-5 text-sm">{success}</div>}

          <form onSubmit={addCard} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-navy/60 mb-1 font-medium">Card Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-navy/60 mb-1 font-medium">Rarity (visual style) *</label>
                <select value={rarity} onChange={e => handleRarityChange(e.target.value)} className={inputClass}>
                  <option value="common">Common (grey border)</option>
                  <option value="rare">Rare (blue glow)</option>
                  <option value="legendary">Legendary (gold glow)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-navy/60 mb-1 font-medium">Drop Weight *</label>
              <input type="number" min="1" value={weight}
                onChange={e => { setWeight(e.target.value); setWeightTouched(true) }} required
                className={inputClass.replace('w-full', 'w-full md:w-48')} />
              <p className="text-xs text-navy/50 mt-1.5">
                Higher = drawn more often. A card with weight 70 is 14× more likely than one with weight 5.
                {totalWeight > 0 && (
                  <span className="text-gold-dark font-semibold"> &nbsp;Estimated drop chance: {pct(weight)}%</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm text-navy/60 mb-1 font-medium">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Optional flavour text..."
                className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="block text-sm text-navy/60 mb-2 font-medium">Card Image (PNG) *</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange}
                className="w-full text-sm text-navy/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gold/20 file:text-gold-dark file:font-semibold hover:file:bg-gold/30 cursor-pointer" />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-3 w-36 h-36 object-cover rounded-xl border-2 border-gold/50" />
              )}
            </div>

            <button type="submit" disabled={submitting}
              className="bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy-dark py-3 px-8 rounded-xl font-bold transition-colors">
              {submitting ? 'Uploading...' : 'Add Card'}
            </button>
          </form>
        </div>
      )}

      {tab === 'cards' && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-navy/50 animate-pulse">Loading...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-navy/50 bg-white rounded-2xl border border-navy/10 shadow-sm">
              No cards yet — add some above!
            </div>
          ) : (
            <>
              <p className="text-sm text-navy/50 mb-4">
                Edit a card's drop weight below — the drop chance updates live. Total weight across all cards: {totalWeight}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {cards.map(card => (
                  <div key={card.id} className="relative group">
                    <CardDisplay card={card} onClick={setSelectedCard} />
                    <button
                      onClick={() => deleteCard(card)}
                      className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white w-7 h-7 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                    >
                      ✕
                    </button>
                    <div className="mt-2 bg-white border border-navy/10 rounded-lg p-2 shadow-sm">
                      <label className="block text-[11px] text-navy/40 mb-1">Drop weight</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0"
                          value={card.rarity_weight ?? 0}
                          onChange={e => updateWeight(card, e.target.value)}
                          className="w-16 bg-mist border border-navy/15 rounded px-2 py-1 text-sm text-navy focus:outline-none focus:border-gold"
                        />
                        <span className="text-xs text-gold-dark font-bold">{pct(card.rarity_weight)}%</span>
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
