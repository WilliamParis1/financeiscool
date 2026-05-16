export const DEFAULT_CARD_TAGS = [
  { name: 'News May 2026', color: '#2563eb' },
  { name: 'CFA Level 1', color: '#c9a24b' },
  { name: 'Python', color: '#16a34a' },
  { name: 'French history', color: '#dc2626' },
]

export const DEFAULT_TAG_COLOR = '#c9a24b'

export function normalizeTagColor(color) {
  if (typeof color !== 'string') return DEFAULT_TAG_COLOR
  const trimmed = color.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : DEFAULT_TAG_COLOR
}

export function readableTextColor(backgroundColor) {
  const color = normalizeTagColor(backgroundColor).slice(1)
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#0a1f44' : '#ffffff'
}

export function normalizeCardTags(tags, availableTags = null) {
  if (!Array.isArray(tags)) return []
  const cleaned = tags
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(Boolean)
  const unique = [...new Set(cleaned)]

  if (!Array.isArray(availableTags)) return unique
  const allowed = new Set(availableTags.map(tag => tag.name))
  return unique.filter(tag => allowed.has(tag))
}

export function getTagDetails(tagNames, availableTags = []) {
  const tagByName = new Map(availableTags.map(tag => [tag.name, tag]))
  return normalizeCardTags(tagNames, availableTags.length > 0 ? availableTags : null).map(name => ({
    name,
    color: normalizeTagColor(tagByName.get(name)?.color),
  }))
}

export function withTagDetails(card, availableTags = []) {
  if (!card) return card
  return {
    ...card,
    tag_details: getTagDetails(card.tag_names, availableTags),
  }
}

export function normalizeCardDates(dates) {
  if (!Array.isArray(dates)) return []
  return [...new Set(dates.filter(Boolean))].sort()
}

export function formatCardDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}
