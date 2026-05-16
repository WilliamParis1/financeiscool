const RARITY_STYLES = {
  common: {
    border: 'border-navy/25',
    shadow: 'shadow-md',
    badge: 'bg-navy/10 text-navy',
    label: 'Common',
  },
  rare: {
    border: 'border-blue-500',
    shadow: 'shadow-[0_0_18px_rgba(37,99,235,0.45)]',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Rare',
  },
  legendary: {
    border: 'border-gold',
    shadow: '',
    badge: 'bg-gold/20 text-gold-dark',
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
        'relative bg-white rounded-xl border-2 overflow-hidden flex flex-col',
        style.border,
        style.shadow,
        isLegendary ? 'card-legendary' : '',
        onClick ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : '',
        small ? 'w-32' : 'w-48',
      ].join(' ')}
    >
      <div className={`relative overflow-hidden bg-mist ${small ? 'h-32' : 'h-48'}`}>
        <img
          src={card.image_url}
          alt={card.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className={`${small ? 'p-1.5' : 'p-2.5'}`}>
        <p className={`font-bold text-navy truncate ${small ? 'text-xs' : 'text-sm'} mb-1`}>
          {card.name}
        </p>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${style.badge}`}>
            {style.label}
          </span>
          {card.quantity > 1 && (
            <span className="text-xs text-navy/40">×{card.quantity}</span>
          )}
        </div>
      </div>
    </div>
  )
}
