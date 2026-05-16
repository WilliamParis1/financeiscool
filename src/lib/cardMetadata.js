export const CARD_TAGS = [
  'News May 2026',
  'CFA Level 1',
  'Python',
  'French history',
]

export function normalizeCardTags(tags) {
  if (!Array.isArray(tags)) return []
  return tags.filter(tag => CARD_TAGS.includes(tag))
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
