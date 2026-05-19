import { formatCardDate, getTagDetails, normalizeCardDates, readableTextColor } from '../lib/cardMetadata'

const RARITY_STYLES = {
  common:    { border: 'border-navy/25', badge: 'bg-navy/10 text-navy',     label: 'Common',    glow: '' },
  rare:      { border: 'border-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Rare',      glow: 'shadow-[0_0_35px_rgba(37,99,235,0.35)]' },
  legendary: { border: 'border-gold',     badge: 'bg-gold/20 text-gold-dark', label: 'Legendary', glow: 'shadow-[0_0_45px_rgba(201,162,75,0.5)]' },
}

export default function CardModal({ card, onClose, actions, imageOnly = false }) {
  if (!card) return null
  const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common
  const tags = card.tag_details || getTagDetails(card.tag_names)
  const dates = normalizeCardDates(card.card_dates)

  return (
    <div
      className="fixed inset-0 bg-navy/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl border-2 ${style.border} ${style.glow} max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full aspect-[5/7] bg-mist">
          <img src={card.image_url} alt={card.name} className="w-full h-full object-contain" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center text-navy text-sm transition-colors shadow"
          >
            x
          </button>
        </div>

        {!imageOnly && (
          <div className="p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold text-navy">{card.name}</h2>
              <span className={`text-sm px-3 py-1 rounded-full font-semibold ${style.badge}`}>
                {style.label}
              </span>
            </div>
            {card.description && (
              <p className="text-navy/60 text-sm leading-relaxed">{card.description}</p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map(tag => (
                  <span
                    key={tag.name}
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: tag.color, color: readableTextColor(tag.color) }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            {dates.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-navy/40 font-bold mb-2">Dates</p>
                <div className="flex flex-wrap gap-2">
                  {dates.map(date => (
                    <span key={date} className="bg-mist text-navy/70 border border-navy/10 px-3 py-1 rounded-full text-xs font-semibold">
                      {formatCardDate(date)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {card.quantity > 1 && (
              <p className="text-navy/40 text-sm mt-2">You own {card.quantity} copies</p>
            )}
            {actions && <div className="mt-4">{actions}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
