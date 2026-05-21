import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ORBIT_PARAMS = [
  { speed: 22, radius: 280, tilt: 15, twist:   0, phase:   0 },
  { speed: 16, radius: 300, tilt: 36, twist:  30, phase:  72 },
  { speed: 26, radius: 270, tilt: 48, twist: -20, phase: 144 },
  { speed: 18, radius: 290, tilt: 26, twist:  60, phase: 216 },
  { speed: 22, radius: 285, tilt: 42, twist: -45, phase: 288 },
]

const FOCAL  = 900   // perspective focal length — higher = less distortion
const CARD_W = 180   // base card width in px

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

// Manual perspective projection — no CSS preserve-3d needed
function project({ x, y, z }) {
  const scale = FOCAL / (FOCAL + z + 300)
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

      // Compute all positions then sort back-to-front for z-index
      const positions = anglesRef.current.map((angle, i) => {
        const pos3d = computePos(ORBIT_PARAMS[i], angle)
        const { px, py, scale } = project(pos3d)
        const wobble = Math.sin((angle * Math.PI) / 180) * 12
        return { i, px, py, scale, z: pos3d.z, wobble }
      })

      positions.forEach(({ i, px, py, scale, z, wobble }) => {
        const el = cardRefs.current[i]
        if (!el) return
        el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) scale(${scale}) rotateY(${wobble}deg)`
        el.style.zIndex    = String(Math.round(z + 500))
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cards])

  const initPositions = ORBIT_PARAMS.map((p, i) => {
    const pos3d = computePos(p, p.phase)
    const { px, py, scale } = project(pos3d)
    return { px, py, scale, z: pos3d.z }
  })

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '760px',
        height: '640px',
        position: 'relative',
        margin: '0 auto',
      }}
    >
      {/* Centre anchor */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>

        {/* Planet */}
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 32%, #2855a0, #0a1f44)',
          boxShadow: '0 0 30px rgba(201,162,75,0.65), 0 0 70px rgba(201,162,75,0.22), inset 0 -8px 20px rgba(0,0,0,0.45)',
          transform: 'translate(-50%,-50%)',
          zIndex: 250,
        }} />

        {/* Orbiting cards */}
        {cards.map((card, i) => {
          const { px, py, scale, z } = initPositions[i]
          return (
            <div
              key={card.id}
              ref={el => (cardRefs.current[i] = el)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) scale(${scale})`,
                zIndex: Math.round(z + 500),
              }}
            >
              <img
                src={card.image_url}
                alt={card.name}
                style={{
                  width: `${CARD_W}px`,
                  aspectRatio: '11/17',
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
