import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Container size
const W = 700
const H = 560
const CX = W / 2
const CY = H / 2

// Single shared orbit — all cards same shape, same speed, evenly spaced
const RX    = 250          // horizontal radius before tilt
const RY    = 95           // vertical radius before tilt
const SPEED = 20           // deg/s — identical for all cards
const TILT  = -30          // degrees — 30° from horizontal (top-right → bottom-left)
const TILT_RAD = TILT * Math.PI / 180

// 5 cards evenly spaced at 72° apart
const PHASES = [0, 72, 144, 216, 288]

// Base card size (-10% from previous 200px)
const BASE_W = 180
const BASE_H = Math.round(BASE_W * 17 / 11)

export default function OrbitingCards() {
  const [cards, setCards] = useState([])
  const cardRefs  = useRef([])
  const anglesRef = useRef([...PHASES])
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

      anglesRef.current = anglesRef.current.map(a => (a + SPEED * dt) % 360)

      anglesRef.current.forEach((angleDeg, i) => {
        const el = cardRefs.current[i]
        if (!el) return

        const a   = (angleDeg * Math.PI) / 180
        const bx  = RX * Math.cos(a)
        const by  = RY * Math.sin(a)

        // Rotate the ellipse to be diagonal (top-right → bottom-left)
        const ox  = bx * Math.cos(TILT_RAD) - by * Math.sin(TILT_RAD)
        const oy  = bx * Math.sin(TILT_RAD) + by * Math.cos(TILT_RAD)

        // Depth based on pre-tilt y (bottom = front, top = back)
        const depth = (by + RY) / (2 * RY)          // 0 = back, 1 = front
        const scale = 0.75 + depth * 0.45            // 0.75 → 1.2

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
        const a0    = (PHASES[i] * Math.PI) / 180
        const bx0   = RX * Math.cos(a0)
        const by0   = RY * Math.sin(a0)
        const ox0   = bx0 * Math.cos(TILT_RAD) - by0 * Math.sin(TILT_RAD)
        const oy0   = bx0 * Math.sin(TILT_RAD) + by0 * Math.cos(TILT_RAD)
        const d0    = (by0 + RY) / (2 * RY)
        const s0    = 0.75 + d0 * 0.45
        const cw0   = Math.round(BASE_W * s0)
        const ch0   = Math.round(BASE_H * s0)

        return (
          <div
            key={card.id}
            ref={el => (cardRefs.current[i] = el)}
            style={{
              position: 'absolute',
              left:    `${Math.round(CX + ox0 - cw0 / 2)}px`,
              top:     `${Math.round(CY + oy0 - ch0 / 2)}px`,
              width:   `${cw0}px`,
              height:  `${ch0}px`,
              zIndex:  Math.round(d0 * 100),
              opacity: 0.7 + d0 * 0.3,
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
                filter: 'blur(2px)',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
