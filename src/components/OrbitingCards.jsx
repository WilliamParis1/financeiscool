import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Each orbit has its own plane defined by tilt (around X) and twist (around Y)
const ORBIT_PARAMS = [
  { speed: 28, radius: 160, tilt: 20, twist:   0, phase:   0 },
  { speed: 20, radius: 175, tilt: 45, twist:  30, phase:  72 },
  { speed: 34, radius: 155, tilt: 60, twist: -20, phase: 144 },
  { speed: 24, radius: 170, tilt: 35, twist:  60, phase: 216 },
  { speed: 30, radius: 165, tilt: 55, twist: -45, phase: 288 },
]

function computePos({ radius, tilt, twist }, angleDeg) {
  const theta = (angleDeg * Math.PI) / 180
  const ti    = (tilt  * Math.PI) / 180
  const tw    = (twist * Math.PI) / 180
  // Start in XZ plane, tilt around X, then twist around Y
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
        const { x, y, z } = computePos(ORBIT_PARAMS[i], angle)
        // Slight Y-tilt as card travels around — gives a tumbling-in-space feel
        const wobble = Math.sin((angle * Math.PI) / 180) * 15
        el.style.transform = `translate3d(${x}px,${y}px,${z}px) translate(-50%,-50%) rotateY(${wobble}deg)`
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cards])

  return (
    <div
      style={{
        perspective: '700px',
        width: '100%',
        maxWidth: '480px',
        height: '360px',
        position: 'relative',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          transformStyle: 'preserve-3d',
          width: 0,
          height: 0,
        }}
      >
        {/* Planet */}
        <div
          style={{
            position: 'absolute',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #2855a0, #0a1f44)',
            boxShadow:
              '0 0 28px rgba(201,162,75,0.65), 0 0 60px rgba(201,162,75,0.22), inset 0 -8px 20px rgba(0,0,0,0.45)',
            transform: 'translate(-50%,-50%)',
          }}
        />

        {/* Orbiting cards */}
        {cards.map((card, i) => {
          const init = computePos(ORBIT_PARAMS[i], ORBIT_PARAMS[i].phase)
          return (
            <div
              key={card.id}
              ref={el => (cardRefs.current[i] = el)}
              style={{
                position: 'absolute',
                transform: `translate3d(${init.x}px,${init.y}px,${init.z}px) translate(-50%,-50%)`,
              }}
            >
              <img
                src={card.image_url}
                alt={card.name}
                style={{
                  width: '58px',
                  aspectRatio: '11/17',
                  objectFit: 'cover',
                  borderRadius: '7px',
                  boxShadow: '0 6px 22px rgba(0,0,0,0.5)',
                  border: '1.5px solid rgba(201,162,75,0.45)',
                  display: 'block',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
