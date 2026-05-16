import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * A button whose gold glow grows the closer the mouse gets, and which
 * subtly leans toward the cursor (magnetic effect). Pure mouse-proximity
 * driven — great for a hero call-to-action.
 */
export default function GlowButton({ children, className = '', radius = 340, ...props }) {
  const ref = useRef(null)
  const [glow, setGlow] = useState(0)   // 0 (far) -> 1 (hovering)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    const intensity = Math.max(0, 1 - dist / radius)
    setGlow(intensity)
    // gentle magnetic pull toward the cursor
    setTilt({ x: (dx / r.width) * intensity * 14, y: (dy / r.height) * intensity * 14 })
  }, [radius])

  useEffect(() => {
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [onMove])

  const style = {
    boxShadow: `0 0 ${8 + glow * 28}px ${glow * 10}px rgba(201,162,75,${0.15 + glow * 0.7}),
                0 6px 20px rgba(10,31,68,0.25)`,
    transform: `translate(${tilt.x}px, ${tilt.y}px) scale(${1 + glow * 0.06})`,
    transition: 'box-shadow 120ms ease-out, transform 120ms ease-out',
  }

  return (
    <button
      ref={ref}
      style={style}
      className={`relative overflow-hidden bg-gold text-navy-dark font-bold rounded-xl ${className}`}
      {...props}
    >
      {/* travelling sheen that follows the glow intensity */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120px circle at center, rgba(255,255,255,${glow * 0.55}), transparent 60%)`,
        }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}
