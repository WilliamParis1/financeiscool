import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import GlowButton from '../components/GlowButton'

const SPEECH_LINES = [
  'Collect a rare card every day',
  'Hello, I am John Pierpont Morgan',
  'Trade with other players',
  'Build your collection',
  'Make friends',
]

export default function Home() {
  const { user } = useAuth()
  const [speechIndex, setSpeechIndex] = useState(0)
  const [speechVisible, setSpeechVisible] = useState(true)
  const [dailyCards, setDailyCards] = useState([])
  const [dailyLoading, setDailyLoading] = useState(true)

  const TODAY = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeechVisible(false)
      setTimeout(() => {
        setSpeechIndex(i => (i + 1) % SPEECH_LINES.length)
        setSpeechVisible(true)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { loadDailyCards() }, [])

  async function loadDailyCards() {
    const { data } = await supabase
      .from('daily_cards')
      .select('*, cards(*)')
      .order('date', { ascending: false })
      .limit(7)
    setDailyCards(data || [])
    setDailyLoading(false)
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    })
  }

  const todayCard = dailyCards.find(d => d.date === TODAY)
  const pastCards = dailyCards.filter(d => d.date !== TODAY)

  return (
    <div className="px-4">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-navy">
            Finance <span className="text-gold">Trading Cards</span>
          </h1>
          <p className="text-xl text-navy/60 max-w-lg mx-auto">
            +3,000 aura for joining us, learn about finance and economics the fun way
          </p>
        </div>

        {/* JP Morgan animation */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="relative bg-white border-2 border-navy/20 rounded-2xl px-5 py-3 shadow-md max-w-xs text-center mb-3 transition-opacity duration-300"
            style={{ opacity: speechVisible ? 1 : 0 }}
          >
            <p className="text-navy font-semibold text-sm">{SPEECH_LINES[speechIndex]}</p>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] w-0 h-0"
              style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '10px solid white' }} />
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[12px] w-0 h-0"
              style={{ borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '11px solid rgb(15 23 42 / 0.2)' }} />
          </div>
          <video src="/jpmorgananimation.mp4" autoPlay loop muted playsInline className="h-56 w-auto rounded-2xl shadow-lg" />
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-16">
          {user ? (
            <Link to="/daily">
              <GlowButton className="px-8 py-3 text-lg">Claim Today's Card</GlowButton>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <GlowButton className="px-8 py-3 text-lg">Get Started Free</GlowButton>
              </Link>
              <Link to="/login" className="border-2 border-navy hover:bg-navy hover:text-white text-navy px-8 py-3 rounded-xl text-lg font-bold transition-colors">
                Login
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Daily cards feed */}
      {!dailyLoading && dailyCards.length > 0 && (
        <section className="max-w-4xl mx-auto pb-24 space-y-6">

          {/* Today's card — blurred mystery */}
          {todayCard && (
            <Link to="/daily" className="block group">
              <article className="bg-white border-2 border-gold/40 rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-[200px_1fr] hover:shadow-xl transition-shadow">
                <div className="bg-mist flex items-center justify-center p-6 relative min-h-[160px] border-b md:border-b-0 md:border-r border-navy/10">
                  {todayCard.cards?.image_url ? (
                    <>
                      <img
                        src={todayCard.cards.image_url}
                        alt="Today's mystery card"
                        className="w-32 aspect-[11/17] object-cover rounded-xl blur-xl scale-110"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-5xl">🃏</div>
                    </>
                  ) : (
                    <span className="text-5xl">🃏</span>
                  )}
                </div>
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-gold-dark">Today · {formatDate(todayCard.date)}</span>
                    <span className="text-xs bg-gold/20 text-gold-dark font-bold px-2 py-0.5 rounded-full">New</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-navy mb-2">???</h2>
                  <p className="text-navy/60 text-sm line-clamp-3">{todayCard.news_summary}</p>
                  <p className="mt-3 text-gold-dark font-bold text-sm group-hover:underline">Answer the MCQ to unlock →</p>
                </div>
              </article>
            </Link>
          )}

          {/* Past cards — fully visible, no MCQ */}
          {pastCards.map(daily => (
            <article key={daily.date} className="bg-white border border-navy/10 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[200px_1fr]">
              <div className="bg-mist flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-navy/10">
                {daily.cards?.image_url ? (
                  <img
                    src={daily.cards.image_url}
                    alt={daily.cards.name}
                    className="w-32 aspect-[11/17] object-cover rounded-xl shadow"
                  />
                ) : (
                  <div className="w-32 aspect-[11/17] bg-white border border-navy/10 rounded-xl flex items-center justify-center text-navy/40 text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-6">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-navy/40">{formatDate(daily.date)}</span>
                <h2 className="text-xl font-extrabold text-navy mt-1 mb-3">{daily.cards?.name || '—'}</h2>
                <p className="text-navy/65 text-sm leading-relaxed">{daily.news_summary}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
