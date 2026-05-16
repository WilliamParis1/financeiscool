const RARITY_STYLES = {
  common: {
    border: 'border-gray-500',
    shadow: 'shadow-[0_0_12px_rgba(156,163,175,0.25)]',
    badge: 'bg-gray-700 text-gray-300',
    label: 'Common',
  },
  rare: {
    border: 'border-blue-500',
    shadow: 'shadow-[0_0_18px_rgba(59,130,246,0.45)]',
    badge: 'bg-blue-900 text-blue-300',
    label: 'Rare',
  },
  legendary: {
    border: 'border-amber-400',
    shadow: '',
    badge: 'bg-amber-900 text-amber-300',
    label: 'Legendary',
  },
}

export default function CardDisplay({ card, onClick, small = false }) {
  const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common
  const isLegendary = card.rarity === 'legendary'

  return (
    <div
      onClick={() => onClick?.(card)}
      className={[
        'relative bg-[#1a1a2e] rounded-xl border-2 overflow-hidden flex flex-col',
        style.border,
        style.shadow,
        isLegendary ? 'card-legendary' : '',
        onClick ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : '',
        small ? 'w-32' : 'w-48',
      ].join(' ')}
    >
      <div className={`relative overflow-hidden bg-[#0f0f1a] ${small ? 'h-32' : 'h-48'}`}>
        <img
          src={card.image_url}
          alt={card.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className={`${small ? 'p-1.5' : 'p-2.5'}`}>
        <p className={`font-semibold text-gray-100 truncate ${small ? 'text-xs' : 'text-sm'} mb-1`}>
          {card.name}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.badge}`}>
            {style.label}
          </span>
          {card.quantity > 1 && (
            <span className="text-xs text-gray-500">×{card.quantity}</span>
          )}
        </div>
      </div>
    </div>
  )
}
