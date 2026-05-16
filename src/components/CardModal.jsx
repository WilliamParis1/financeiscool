const RARITY_STYLES = {
  common:    { border: 'border-gray-500',  badge: 'bg-gray-700 text-gray-200',  label: 'Common',    glow: '' },
  rare:      { border: 'border-blue-500',  badge: 'bg-blue-900 text-blue-200',  label: 'Rare',      glow: 'shadow-[0_0_35px_rgba(59,130,246,0.4)]' },
  legendary: { border: 'border-amber-400', badge: 'bg-amber-900 text-amber-200', label: 'Legendary', glow: 'shadow-[0_0_45px_rgba(245,158,11,0.5)]' },
}

export default function CardModal({ card, onClose, actions }) {
  if (!card) return null
  const style = RARITY_STYLES[card.rarity] || RARITY_STYLES.common

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#1a1a2e] rounded-2xl border-2 ${style.border} ${style.glow} max-w-sm w-full overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-72 bg-[#0f0f1a]">
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 rounded-full w-8 h-8 flex items-center justify-center text-white text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-100">{card.name}</h2>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${style.badge}`}>
              {style.label}
            </span>
          </div>
          {card.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{card.description}</p>
          )}
          {card.quantity > 1 && (
            <p className="text-gray-600 text-sm mt-2">You own {card.quantity} copies</p>
          )}
          {actions && <div className="mt-4">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
