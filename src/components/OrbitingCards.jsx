import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ORBIT_PARAMS = [
  { speed: 24, radius: 220, tilt: 12, twist:   0, phase:   0 },
  { speed: 17, radius: 240, tilt: 25, twist:  30, phase:  72 },
  { speed: 28, radius: 210, tilt: 30, twist: -20, phase: 144 },
  { speed: 20, radius: 230, tilt: 18, twist:  60, phase: 216 },
  { speed: 24, radius: 225, tilt: 22, twist: -45, phase: 288 },
]

const FOCAL  = 1400  // higher = subtler perspective distortion
const CARD_W = 220   // base card width in px
const CARD_H = Math.round(CARD_W * 17 / 11) // aspect ratio 11:17

function computePos({ radius, tilt, twist }, angleDeg) {
  const theta = (angleDeg * Math.PI) / 180
  const ti    = (tilt  * Math.PI) / 180
  const tw    = (twist * Math.PI) / 180
  const bx = radius * Math.cos(theta)
  const bz = radius * Math.sin(theta)
  const x1 =  bx
  const y1 = -bz * Math.sin(ti)
  const z1 =  bz * Math.cos(ti)
  return {
    x:  x1 * Math.cos(tw) + z1 * Math.sin(tw),
    y:  y1,
    z: -x1 * Math.sin(tw) + z1 * Math.cos(tw),
  }
}

// No +offset — cards render at their true size at z=0
function project({ x, y, z }) {
  const scale = FOCAL / (FOCAL + z)
  return { px: x * scale, py: y * scale, scale }
}

export default function OrbitingCards() {
  const [cards, setCards] = useState([])
  const cardRefs  = useRef([])
  const anglesRef = useRef(ORBIT_PARAMS.map(p => p.phase))
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
          const shuffled = [...data].sort(() => Math.random() - 0.5)
          setCards(shuffled.slice(0, 5))
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
        (a + ORBIT_PARAMS[i].speed * dt) % 360
      )

      anglesRef.current.forEach((angle, i) => {
        const el = cardRefs.current[i]
        if (!el) return
        const pos3d = computePos(ORBIT_PARAMS[i], angle)
        const { px, py, scale } = project(pos3d)
        const wobble = Math.sin((angle * Math.PI) / 180) * 10
        // Center card at (px, py) relative to the container centre
        const tx = px - CARD_W / 2
        const ty = py - CARD_H / 2
        el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
        el.style.zIndex     = String(Math.round(pos3d.z + 500))
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cards])

  // Initial positions for SSR / first paint
  const initPositions = ORBIT_PARAMS.map(p => {
    const pos3d = computePos(p, p.phase)
    const { px, py, scale } = project(pos3d)
    return { tx: px - CARD_W / 2, ty: py - CARD_H / 2, scale, z: pos3d.z }
  })

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        height: '580px',
        position: 'relative',
        margin: '0 auto',
      }}
    >
      {/* All cards and planet are positioned relative to the visual centre */}
      <div style={{ position: 'absolute', top: '50%', left: '50%' }}>

        {/* Planet */}
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, #2855a0, #0a1f44)',
          boxShadow: '0 0 30px rgba(201,162,75,0.65), 0 0 70px rgba(201,162,75,0.22), inset 0 -8px 20px rgba(0,0,0,0.45)',
          transform: 'translate(-50%, -50%)',
          zIndex: 250,
        }} />

        {/* Orbiting cards */}
        {cards.map((card, i) => {
          const { tx, ty, scale, z } = initPositions[i]
          return (
            <div
              key={card.id}
              ref={el => (cardRefs.current[i] = el)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                zIndex: Math.round(z + 500),
                transformOrigin: 'center center',
              }}
            >
              <img
                src={card.image_url}
                alt={card.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  boxShadow: '0 10px 36px rgba(0,0,0,0.55)',
                  border: '2px solid rgba(201,162,75,0.5)',
                  display: 'block',
                  filter: 'blur(1.5px)',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
