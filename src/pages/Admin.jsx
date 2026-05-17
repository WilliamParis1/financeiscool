import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CARD_POSTS_MISSING_MESSAGE, CARD_POSTS_TABLE, isMissingCardPostsTable } from '../lib/cardPostsSchema'
import {
  DEFAULT_CARD_TAGS,
  DEFAULT_TAG_COLOR,
  formatCardDate,
  normalizeCardDates,
  normalizeCardTags,
  normalizeTagColor,
  readableTextColor,
  withTagDetails,
} from '../lib/cardMetadata'
import CardDisplay from '../components/CardDisplay'
import CardModal from '../components/CardModal'

// Suggested default weight per rarity (game master can override per card)
const DEFAULT_WEIGHT = { common: 70, rare: 25, legendary: 5 }
const VALID_RARITIES = Object.keys(DEFAULT_WEIGHT)
const CARD_METADATA_MISSING_MESSAGE =
  'The live Supabase database is missing the card tags/dates migration. Run supabase/migrations/20260517090000_add_card_tags_and_dates.sql in the Supabase SQL Editor, then refresh this page.'
const CARD_TAGS_MISSING_MESSAGE =
  'The live Supabase database is missing the editable tags migration. Run supabase/migrations/20260517100000_create_card_tags.sql in the Supabase SQL Editor, then refresh this page.'

function isMissingCardMetadata(error) {
  if (!error) return false
  const message = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase()
  return (
    message.includes('tag_names') ||
    message.includes('card_dates') ||
    message.includes('card_tags') ||
    message.includes('admin_update_card_settings') ||
    message.includes('schema cache') ||
    message.includes('could not find the function')
  )
}

export default function Admin() {
  const [cards, setCards] = useState([])
  const [posts, setPosts] = useState([])
  const [dailyCardsList, setDailyCardsList] = useState([])
  const [editingDaily, setEditingDaily] = useState(null)
  const [dailySaving, setDailySaving] = useState(false)
  const [availableTags, setAvailableTags] = useState(DEFAULT_CARD_TAGS)
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
  const [tagNames, setTagNames] = useState([])
  const [cardDates, setCardDates] = useState([])
  const [newCardDate, setNewCardDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [postSetupError, setPostSetupError] = useState('')
  const [tagSetupError, setTagSetupError] = useState('')
  const [postSubmitting, setPostSubmitting] = useState(false)
  const [postCardId, setPostCardId] = useState('')
  const [postTitle, setPostTitle] = useState('')
  const [postSource, setPostSource] = useState('')
  const [postSummary, setPostSummary] = useState('')
  const [postExplanation, setPostExplanation] = useState('')
  const [postPublished, setPostPublished] = useState(true)
  const [savingCardId, setSavingCardId] = useState('')
  const [cardDateDrafts, setCardDateDrafts] = useState({})
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR)
  const [tagSubmitting, setTagSubmitting] = useState(false)
  const [editingTagName, setEditingTagName] = useState(null)
  const [editTagDraft, setEditTagDraft] = useState('')

  useEffect(() => {
    loadTags()
    loadPosts()
    loadDailyCardsList()
  }, [])

  useEffect(() => {
    loadCards()
  }, [availableTags])

  function handleRarityChange(value) {
    setRarity(value)
    if (!weightTouched) setWeight(DEFAULT_WEIGHT[value])
  }

  async function loadCards() {
    const { data } = await supabase.from('cards').select('*').order('created_at', { ascending: false })
    setCards(data?.map(card => withTagDetails(card, availableTags)) || [])
    setLoading(false)
  }

  async function loadTags() {
    const { data, error } = await supabase
      .from('card_tags')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      setAvailableTags(DEFAULT_CARD_TAGS)
      setTagSetupError(isMissingCardMetadata(error) ? CARD_TAGS_MISSING_MESSAGE : error.message)
      return
    }

    setTagSetupError('')
    setAvailableTags(data?.length ? data.map(tag => ({ ...tag, color: normalizeTagColor(tag.color) })) : DEFAULT_CARD_TAGS)
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .from(CARD_POSTS_TABLE)
      .select('*, cards(*)')
      .order('published_at', { ascending: false })
    if (isMissingCardPostsTable(error)) {
      setPostSetupError(CARD_POSTS_MISSING_MESSAGE)
      setPosts([])
      return
    }
    setPostSetupError('')
    setPosts(data || [])
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function toggleNewCardTag(tag) {
    setTagNames(current => (
      current.includes(tag.name)
        ? current.filter(t => t !== tag.name)
        : [...current, tag.name]
    ))
  }

  function addNewCardDate() {
    if (!newCardDate) return
    setCardDates(current => normalizeCardDates([...current, newCardDate]))
    setNewCardDate('')
  }

  function removeNewCardDate(date) {
    setCardDates(current => current.filter(d => d !== date))
  }

  function toggleCardTag(card, tag) {
    const currentTags = normalizeCardTags(card.tag_names, availableTags)
    const nextTags = currentTags.includes(tag.name)
      ? currentTags.filter(t => t !== tag.name)
      : [...currentTags, tag.name]
    updateCard(card, { tag_names: nextTags })
  }

  function addCardDate(card, date) {
    if (!date) return
    updateCard(card, { card_dates: normalizeCardDates([...(card.card_dates || []), date]) })
    setCardDateDrafts(current => ({ ...current, [card.id]: '' }))
  }

  function removeCardDate(card, date) {
    updateCard(card, { card_dates: normalizeCardDates(card.card_dates).filter(d => d !== date) })
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
        tag_names: normalizeCardTags(tagNames, availableTags),
        card_dates: normalizeCardDates(cardDates),
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
      setTagNames([])
      setCardDates([])
      setNewCardDate('')
      loadCards()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function updateCard(card, changes) {
    setSavingCardId(card.id)
    setError('')
    setSuccess('')

    try {
      const payload = {}
      if (changes.rarity !== undefined) payload.rarity = changes.rarity
      if (changes.rarity_weight !== undefined) payload.rarity_weight = changes.rarity_weight
      if (changes.tag_names !== undefined) payload.tag_names = normalizeCardTags(changes.tag_names, availableTags)
      if (changes.card_dates !== undefined) payload.card_dates = normalizeCardDates(changes.card_dates)

      const { data, error: updateError } = await supabase
        .from('cards')
        .update(payload)
        .eq('id', card.id)
        .select()
        .single()

      if (updateError) throw updateError
      const savedCard = withTagDetails(data, availableTags)

      setCards(cs => cs.map(c => c.id === card.id ? savedCard : c))
      setSelectedCard(current => current?.id === card.id ? savedCard : current)
      loadPosts()
      return savedCard
    } catch (err) {
      setError(`Could not save "${card.name}": ${isMissingCardMetadata(err) ? CARD_METADATA_MISSING_MESSAGE : err.message}`)
      loadCards()
      return null
    } finally {
      setSavingCardId('')
    }
  }

  async function updateWeight(card, newWeight) {
    const w = Number(newWeight)
    if (isNaN(w) || w < 0) return
    await updateCard(card, { rarity_weight: w })
  }

  async function updateRarity(card, newRarity) {
    if (!VALID_RARITIES.includes(newRarity)) return
    const savedCard = await updateCard(card, { rarity: newRarity })
    if (savedCard) {
      setSuccess(`"${card.name}" is now ${newRarity}. All inventory copies use this shared card rarity.`)
    }
  }

  async function addTag(e) {
    e.preventDefault()
    const trimmedName = newTagName.trim()
    if (!trimmedName) { setError('Please name the tag'); return }
    if (availableTags.some(tag => tag.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A tag with that name already exists')
      return
    }

    setTagSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const tag = { name: trimmedName, color: normalizeTagColor(newTagColor) }
      const { error: insertError } = await supabase.from('card_tags').insert(tag)
      if (insertError) throw insertError
      setAvailableTags(tags => [...tags, tag])
      setNewTagName('')
      setNewTagColor(DEFAULT_TAG_COLOR)
      setSuccess(`"${trimmedName}" tag created.`)
    } catch (err) {
      setError(isMissingCardMetadata(err) ? CARD_TAGS_MISSING_MESSAGE : err.message)
    } finally {
      setTagSubmitting(false)
    }
  }

  async function deleteTag(tag) {
    if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all cards that use it.`)) return
    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase.from('card_tags').delete().eq('name', tag.name)
    if (deleteError) { setError(deleteError.message); return }

    setAvailableTags(tags => tags.filter(t => t.name !== tag.name))
    setSuccess(`Tag "${tag.name}" deleted.`)
    loadCards()
  }

  async function renameTag(tag, newName) {
    const trimmed = newName.trim()
    setEditingTagName(null)
    if (!trimmed || trimmed === tag.name) return
    if (availableTags.some(t => t.name.toLowerCase() === trimmed.toLowerCase() && t.name !== tag.name)) {
      setError('A tag with that name already exists')
      return
    }
    setError('')
    setSuccess('')
    try {
      const { error: insertError } = await supabase.from('card_tags').insert({ name: trimmed, color: tag.color })
      if (insertError) throw insertError
      const { error: deleteError } = await supabase.from('card_tags').delete().eq('name', tag.name)
      if (deleteError) throw deleteError
      setAvailableTags(tags => tags.map(t => t.name === tag.name ? { ...t, name: trimmed } : t))
      setSuccess(`Tag renamed to "${trimmed}".`)
      loadCards()
    } catch (err) {
      setError(err.message)
      loadTags()
    }
  }

  async function updateTagColor(tag, color) {
    const nextColor = normalizeTagColor(color)
    setAvailableTags(tags => tags.map(t => t.name === tag.name ? { ...t, color: nextColor } : t))

    const { error: updateError } = await supabase
      .from('card_tags')
      .update({ color: nextColor })
      .eq('name', tag.name)

    if (updateError) {
      setError(isMissingCardMetadata(updateError) ? CARD_TAGS_MISSING_MESSAGE : updateError.message)
      loadTags()
    }
  }

  async function deleteCard(card) {
    if (!window.confirm(`Delete "${card.name}"? This removes it from all collections.`)) return
    await supabase.from(CARD_POSTS_TABLE).delete().eq('card_id', card.id)
    await supabase.from('user_cards').delete().eq('card_id', card.id)
    await supabase.from('daily_claims').delete().eq('card_id', card.id)
    await supabase.from('cards').delete().eq('id', card.id)
    loadCards()
    loadPosts()
  }

  async function loadDailyCardsList() {
    const { data } = await supabase
      .from('daily_cards')
      .select('*, cards(*)')
      .order('created_at', { ascending: false })
      .limit(60)
    setDailyCardsList(data || [])
  }

  async function saveDailyCard() {
    if (!editingDaily) return
    setDailySaving(true)
    setError('')
    const { error: err } = await supabase
      .from('daily_cards')
      .update({ news_summary: editingDaily.news_summary, mcq: editingDaily.mcq })
      .eq('id', editingDaily.id)
    setDailySaving(false)
    if (err) { setError(err.message); return }
    setDailyCardsList(list => list.map(d => d.id === editingDaily.id ? { ...d, ...editingDaily } : d))
    setEditingDaily(null)
    setSuccess('Daily card updated.')
  }

  async function toggleDailyHidden(daily) {
    const next = !daily.is_hidden
    setDailyCardsList(list => list.map(d => d.id === daily.id ? { ...d, is_hidden: next } : d))
    const { error: err } = await supabase.from('daily_cards').update({ is_hidden: next }).eq('id', daily.id)
    if (err) {
      setError(`Failed to update visibility: ${err.message}`)
      setDailyCardsList(list => list.map(d => d.id === daily.id ? { ...d, is_hidden: daily.is_hidden } : d))
    }
  }

  async function deleteDailyCard(daily) {
    if (!window.confirm(`Delete card "${daily.cards?.name}" (${daily.date})? This also removes the card from the collection.`)) return
    await supabase.from('daily_attempts').delete().eq('daily_card_id', daily.id)
    await supabase.from('daily_cards').delete().eq('id', daily.id)
    await supabase.from('cards').delete().eq('id', daily.card_id)
    setDailyCardsList(list => list.filter(d => d.id !== daily.id))
    setSuccess('Daily card deleted.')
  }

  function startEditDaily(daily) {
    setEditingDaily({
      id: daily.id,
      news_summary: daily.news_summary,
      mcq: JSON.parse(JSON.stringify(daily.mcq)),
    })
  }

  function updateEditMcq(qi, field, value) {
    setEditingDaily(prev => {
      const mcq = JSON.parse(JSON.stringify(prev.mcq))
      if (field === 'question') mcq[qi].question = value
      else if (field === 'answer0') mcq[qi].answers[0] = value
      else if (field === 'answer1') mcq[qi].answers[1] = value
      else if (field === 'correct') mcq[qi].correct = value
      return { ...prev, mcq }
    })
  }

  async function addPost(e) {
    e.preventDefault()
    if (!postCardId) { setError('Please choose the card this post is about'); return }
    if (!postExplanation.trim()) { setError('Please write the card explanation'); return }

    setPostSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { error: insertError } = await supabase.from(CARD_POSTS_TABLE).insert({
        card_id: postCardId,
        title: postTitle,
        news_source: postSource || null,
        market_summary: postSummary || null,
        explanation: postExplanation,
        is_published: postPublished,
        published_at: new Date().toISOString(),
      })
      if (isMissingCardPostsTable(insertError)) {
        setPostSetupError(CARD_POSTS_MISSING_MESSAGE)
        throw new Error(CARD_POSTS_MISSING_MESSAGE)
      }
      if (insertError) throw insertError

      setSuccess(`"${postTitle}" published to the homepage.`)
      setPostCardId('')
      setPostTitle('')
      setPostSource('')
      setPostSummary('')
      setPostExplanation('')
      setPostPublished(true)
      loadPosts()
    } catch (err) {
      setError(err.message)
    } finally {
      setPostSubmitting(false)
    }
  }

  async function updatePost(post, changes) {
    const next = { ...post, ...changes }
    setPosts(ps => ps.map(p => p.id === post.id ? next : p))
    await supabase.from(CARD_POSTS_TABLE).update(changes).eq('id', post.id)
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete "${post.title}" from the homepage journal?`)) return
    await supabase.from(CARD_POSTS_TABLE).delete().eq('id', post.id)
    loadPosts()
  }

  const totalWeight = cards.reduce((s, c) => s + Math.max(0, c.rarity_weight || 0), 0)
  const pct = w => totalWeight > 0 ? ((Math.max(0, w || 0) / totalWeight) * 100).toFixed(1) : '0.0'

  const inputClass = 'w-full bg-mist border border-navy/15 rounded-lg px-4 py-2.5 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30'

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-navy mb-1">Admin Panel</h1>
      <p className="text-navy/50 mb-6">{cards.length} cards in the database · {dailyCardsList.length} daily cards</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'add',    label: 'Add Card' },
          { key: 'cards',  label: `Manage Cards (${cards.length})` },
          { key: 'tags',   label: `Tags (${availableTags.length})` },
          { key: 'daily',  label: `Daily Cards (${dailyCardsList.length})` },
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
              <label className="block text-sm text-navy/60 mb-2 font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <label
                    key={tag.name}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold cursor-pointer transition-colors ${
                      tagNames.includes(tag.name)
                        ? 'border-transparent'
                        : 'bg-mist border-navy/15 text-navy/60 hover:border-gold/50'
                    }`}
                    style={tagNames.includes(tag.name) ? {
                      backgroundColor: tag.color,
                      color: readableTextColor(tag.color),
                    } : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={tagNames.includes(tag.name)}
                      onChange={() => toggleNewCardTag(tag)}
                      className="h-4 w-4 accent-gold"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-navy/60 mb-2 font-medium">Card Dates</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={newCardDate}
                  onChange={e => setNewCardDate(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addNewCardDate}
                  className="bg-navy hover:bg-navy-mid text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
                >
                  Add Date
                </button>
              </div>
              {cardDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {cardDates.map(date => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => removeNewCardDate(date)}
                      className="bg-white border border-navy/15 text-navy/70 hover:border-red-300 hover:text-red-700 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                    >
                      {formatCardDate(date)} x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-navy/60 mb-2 font-medium">Card Image (PNG) *</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange}
                className="w-full text-sm text-navy/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gold/20 file:text-gold-dark file:font-semibold hover:file:bg-gold/30 cursor-pointer" />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-3 w-36 aspect-[5/7] object-contain bg-mist rounded-xl border-2 border-gold/50" />
              )}
            </div>

            <button type="submit" disabled={submitting}
              className="bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy-dark py-3 px-8 rounded-xl font-bold transition-colors">
              {submitting ? 'Uploading...' : 'Add Card'}
            </button>
          </form>
        </div>
      )}

      {tab === 'tags' && (
        <div className="space-y-6">
          {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 text-sm">{success}</div>}
          {tagSetupError && <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-3 text-sm">{tagSetupError}</div>}

          <div className="bg-white rounded-2xl p-8 border border-navy/10 shadow-lg">
            <h2 className="text-xl font-bold text-navy mb-6">Create Tag</h2>
            <form onSubmit={addTag} className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-4 items-end">
              <div>
                <label className="block text-sm text-navy/60 mb-1 font-medium">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="Example: Derivatives"
                  maxLength={40}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-navy/60 mb-1 font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    className="h-11 w-14 rounded-lg border border-navy/15 bg-white cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    className="min-w-0 flex-1 bg-mist border border-navy/15 rounded-lg px-2 py-2.5 text-sm text-navy focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={tagSubmitting || Boolean(tagSetupError)}
                className="bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy-dark px-5 py-3 rounded-xl font-bold transition-colors"
              >
                {tagSubmitting ? 'Creating...' : 'Create Tag'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-navy/10 shadow-lg">
            <h2 className="text-xl font-bold text-navy mb-4">Existing Tags</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableTags.map(tag => (
                <div key={tag.name} className="flex items-center justify-between gap-3 border border-navy/10 rounded-lg p-3">
                  {editingTagName === tag.name ? (
                    <input
                      autoFocus
                      value={editTagDraft}
                      onChange={e => setEditTagDraft(e.target.value)}
                      onBlur={() => renameTag(tag, editTagDraft)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameTag(tag, editTagDraft)
                        if (e.key === 'Escape') setEditingTagName(null)
                      }}
                      className="px-3 py-1 rounded-full text-xs font-bold border-2 border-gold focus:outline-none"
                      style={{ backgroundColor: tag.color, color: readableTextColor(tag.color) }}
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingTagName(tag.name); setEditTagDraft(tag.name) }}
                      className="px-3 py-1 rounded-full text-xs font-bold hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: tag.color, color: readableTextColor(tag.color) }}
                      title="Click to rename"
                    >
                      {tag.name} ✏️
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tag.color}
                      onChange={e => updateTagColor(tag, e.target.value)}
                      className="h-9 w-12 rounded border border-navy/15 bg-white cursor-pointer"
                    />
                    <span className="text-xs font-mono text-navy/45 w-16">{tag.color}</span>
                    <button
                      onClick={() => deleteTag(tag)}
                      className="ml-1 w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center transition-colors"
                      title={`Delete "${tag.name}"`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="space-y-4">
          {error   && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 text-sm">{success}</div>}

          {dailyCardsList.length === 0 ? (
            <div className="text-center py-12 text-navy/50 bg-white rounded-2xl border border-navy/10 shadow-sm">
              No daily cards generated yet.
            </div>
          ) : dailyCardsList.map(daily => (
            <div key={daily.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${daily.is_hidden ? 'opacity-50 border-navy/10' : 'border-navy/10'}`}>

              {/* Card row */}
              <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-4 p-4 items-start">
                {daily.cards?.image_url ? (
                  <img src={daily.cards.image_url} alt={daily.cards?.name} className="w-16 aspect-[11/17] object-cover rounded-lg shadow-sm" />
                ) : (
                  <div className="w-16 aspect-[11/17] bg-mist rounded-lg border border-navy/10" />
                )}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-widest text-gold-dark">{daily.date}</span>
                    {daily.is_hidden && <span className="text-xs bg-navy/10 text-navy/50 px-2 py-0.5 rounded-full font-bold">Hidden</span>}
                  </div>
                  <h3 className="font-extrabold text-navy text-base">{daily.cards?.name || '—'}</h3>
                  <p className="text-sm text-navy/60 mt-1 line-clamp-2">{daily.news_summary}</p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => editingDaily?.id === daily.id ? setEditingDaily(null) : startEditDaily(daily)}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold border border-navy/15 text-navy hover:border-gold hover:text-gold-dark transition-colors"
                  >
                    {editingDaily?.id === daily.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    onClick={() => toggleDailyHidden(daily)}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold border border-navy/15 text-navy hover:border-navy hover:bg-navy hover:text-white transition-colors"
                  >
                    {daily.is_hidden ? 'Show' : 'Hide'}
                  </button>
                  <button
                    onClick={() => deleteDailyCard(daily)}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Inline editor */}
              {editingDaily?.id === daily.id && (
                <div className="border-t border-navy/10 p-6 bg-mist/40 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-navy/60 mb-1">News Summary</label>
                    <textarea
                      rows={4}
                      value={editingDaily.news_summary}
                      onChange={e => setEditingDaily(prev => ({ ...prev, news_summary: e.target.value }))}
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-navy/60 mb-3">MCQ Questions</label>
                    <div className="space-y-4">
                      {editingDaily.mcq.map((q, qi) => (
                        <div key={qi} className="bg-white border border-navy/10 rounded-xl p-4 space-y-3">
                          <div>
                            <label className="text-xs text-navy/40 font-bold uppercase tracking-wider">Question {qi + 1}</label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={e => updateEditMcq(qi, 'question', e.target.value)}
                              className={`${inputClass} mt-1`}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[0, 1].map(ai => (
                              <div key={ai} className={`flex gap-2 items-center p-2 rounded-lg border-2 transition-colors ${q.correct === ai ? 'border-green-400 bg-green-50' : 'border-navy/10'}`}>
                                <input
                                  type="text"
                                  value={q.answers[ai]}
                                  onChange={e => updateEditMcq(qi, `answer${ai}`, e.target.value)}
                                  className="flex-1 bg-transparent text-sm text-navy focus:outline-none"
                                  placeholder={`Answer ${ai === 0 ? 'A' : 'B'}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateEditMcq(qi, 'correct', ai)}
                                  className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap transition-colors ${q.correct === ai ? 'bg-green-500 text-white' : 'bg-navy/10 text-navy/40 hover:bg-green-100 hover:text-green-700'}`}
                                >
                                  {q.correct === ai ? '✓ Correct' : 'Set correct'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={saveDailyCard}
                      disabled={dailySaving}
                      className="bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy-dark px-6 py-2.5 rounded-xl font-bold transition-colors"
                    >
                      {dailySaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingDaily(null)}
                      className="px-6 py-2.5 rounded-xl font-bold border border-navy/15 text-navy hover:bg-navy/5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'cards' && (
        <div>
          {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-5 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 mb-5 text-sm">{success}</div>}

          {loading ? (
            <div className="text-center py-12 text-navy/50 animate-pulse">Loading...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-navy/50 bg-white rounded-2xl border border-navy/10 shadow-sm">
              No cards yet — add some above!
            </div>
          ) : (
            <>
              <p className="text-sm text-navy/50 mb-4">
                Edit a card's rarity and drop weight below. Rarity controls the visual style; drop weight controls odds.
                Total weight across all cards: {totalWeight}
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
                      <label className="block text-[11px] text-navy/40 mb-1">Rarity</label>
                      <select
                        value={card.rarity}
                        onChange={e => updateRarity(card, e.target.value)}
                        disabled={savingCardId === card.id}
                        className="w-full bg-mist border border-navy/15 rounded px-2 py-1 text-xs text-navy focus:outline-none focus:border-gold mb-2"
                      >
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="legendary">Legendary</option>
                      </select>

                      <label className="block text-[11px] text-navy/40 mb-1">Drop weight</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0"
                          value={card.rarity_weight ?? 0}
                          onChange={e => updateWeight(card, e.target.value)}
                          disabled={savingCardId === card.id}
                          className="w-16 bg-mist border border-navy/15 rounded px-2 py-1 text-sm text-navy focus:outline-none focus:border-gold"
                        />
                        <span className="text-xs text-gold-dark font-bold">{pct(card.rarity_weight)}%</span>
                      </div>

                      <label className="block text-[11px] text-navy/40 mt-3 mb-1">Tags</label>
                      <div className="flex flex-wrap gap-1">
                        {availableTags.map(tag => {
                          const checked = normalizeCardTags(card.tag_names, availableTags).includes(tag.name)
                          return (
                            <button
                              key={tag.name}
                              type="button"
                              onClick={() => toggleCardTag(card, tag)}
                              disabled={savingCardId === card.id}
                              className={`px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                checked
                                  ? 'border-transparent'
                                  : 'bg-mist border-navy/10 text-navy/45 hover:border-gold/50'
                              }`}
                              style={checked ? {
                                backgroundColor: tag.color,
                                color: readableTextColor(tag.color),
                              } : undefined}
                            >
                              {tag.name}
                            </button>
                          )
                        })}
                      </div>

                      <label className="block text-[11px] text-navy/40 mt-3 mb-1">Dates</label>
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={cardDateDrafts[card.id] || ''}
                          onChange={e => setCardDateDrafts(current => ({ ...current, [card.id]: e.target.value }))}
                          disabled={savingCardId === card.id}
                          className="min-w-0 flex-1 bg-mist border border-navy/15 rounded px-1.5 py-1 text-[11px] text-navy focus:outline-none focus:border-gold"
                        />
                        <button
                          type="button"
                          onClick={() => addCardDate(card, cardDateDrafts[card.id])}
                          disabled={savingCardId === card.id || !cardDateDrafts[card.id]}
                          className="bg-navy hover:bg-navy-mid disabled:opacity-40 text-white rounded px-2 text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                      {normalizeCardDates(card.card_dates).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {normalizeCardDates(card.card_dates).map(date => (
                            <button
                              key={date}
                              type="button"
                              onClick={() => removeCardDate(card, date)}
                              disabled={savingCardId === card.id}
                              className="bg-white border border-navy/10 text-navy/55 hover:border-red-300 hover:text-red-700 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors"
                            >
                              {formatCardDate(date)} x
                            </button>
                          ))}
                        </div>
                      )}
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
