import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Container size
const W = 700
const H = 560
const CX = W / 2   // orbit centre x
const CY = H / 2   // orbit centre y

// Elliptical orbit params per card (rx=horizontal radius, ry=vertical radius)
const ORBITS = [
  { rx: 240, ry: 80,  speed: 22, phase:   0 },
  { rx: 260, ry: 100, speed: 16, phase:  72 },
  { rx: 230, ry: 90,  speed: 28, phase: 144 },
  { rx: 250, ry: 70,  speed: 20, phase: 216 },
  { rx: 245, ry: 95,  speed: 24, phase: 288 },
]

// Base card size — will scale with y position for depth illusion
const BASE_W = 200
const BASE_H = Math.round(BASE_W * 17 / 11)

export default function OrbitingCards() {
  const [cards, setCards] = useState([])
  const cardRefs  = useRef([])
  const anglesRef = useRef(ORBITS.map(o => o.phase))
  const rafRef    = useRef()
  const lastTsRef = useRef(null)

  useEffect(() => {
    supabase
      .from('cards')
      .select('id, image_url, name')
      .not('image_url', 'is', null)
      .limit(100)
      .then(({ data }) => {
        if (data && data.length >= 5) {
          setCards([...data].sort(() => Math.random() - 0.5).slice(0, 5))
        }
      })
  }, [])

  useEffect(() => {
    if (cards.length < 5) return

    function tick(ts) {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = ts

      anglesRef.current = anglesRef.current.map((a, i) =>
        (a + ORBITS[i].speed * dt) % 360
      )

      anglesRef.current.forEach((angleDeg, i) => {
        const el = cardRefs.current[i]
        if (!el) return
        const a = (angleDeg * Math.PI) / 180
        const { rx, ry } = ORBITS[i]

        const ox = rx * Math.cos(a)          // position on orbit
        const oy = ry * Math.sin(a)

        // Cards at the bottom of the orbit (oy > 0) are "in front" → bigger
        const depth = (oy + ry) / (2 * ry)  // 0 = back, 1 = front
        const scale = 0.75 + depth * 0.5    // 0.75 (back) → 1.25 (front)

        const cw = Math.round(BASE_W * scale)
        const ch = Math.round(BASE_H * scale)

        el.style.left    = `${Math.round(CX + ox - cw / 2)}px`
        el.style.top     = `${Math.round(CY + oy - ch / 2)}px`
        el.style.width   = `${cw}px`
        el.style.height  = `${ch}px`
        el.style.zIndex  = String(Math.round(depth * 100))
        el.style.opacity = String(0.7 + depth * 0.3)
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cards])

  return (
    <div style={{ width: `${W}px`, maxWidth: '100%', height: `${H}px`, position: 'relative', margin: '0 auto' }}>

      {/* Planet */}
      <div style={{
        position: 'absolute',
        left: `${CX - 44}px`,
        top:  `${CY - 44}px`,
        width: '88px',
        height: '88px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, #2855a0, #0a1f44)',
        boxShadow: '0 0 30px rgba(201,162,75,0.65), 0 0 70px rgba(201,162,75,0.22), inset 0 -8px 20px rgba(0,0,0,0.45)',
        zIndex: 50,
      }} />

      {/* Cards */}
      {cards.map((card, i) => {
        // Initial position for first paint
        const a0 = (ORBITS[i].phase * Math.PI) / 180
        const { rx, ry } = ORBITS[i]
        const ox0 = rx * Math.cos(a0)
        const oy0 = ry * Math.sin(a0)
        const depth0 = (oy0 + ry) / (2 * ry)
        const scale0 = 0.75 + depth0 * 0.5
        const cw0 = Math.round(BASE_W * scale0)
        const ch0 = Math.round(BASE_H * scale0)

        return (
          <div
            key={card.id}
            ref={el => (cardRefs.current[i] = el)}
            style={{
              position: 'absolute',
              left: `${Math.round(CX + ox0 - cw0 / 2)}px`,
              top:  `${Math.round(CY + oy0 - ch0 / 2)}px`,
              width:  `${cw0}px`,
              height: `${ch0}px`,
              zIndex: Math.round(depth0 * 100),
              opacity: 0.7 + depth0 * 0.3,
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              border: '2px solid rgba(201,162,75,0.5)',
            }}
          >
            <img
              src={card.image_url}
              alt={card.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                filter: 'blur(1.5px)',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
