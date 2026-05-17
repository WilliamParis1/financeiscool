import { useEffect, useRef, useState } from 'react'
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
  const [todayAttempt, setTodayAttempt] = useState(null)
  const [attemptLoaded, setAttemptLoaded] = useState(false)
  const [answers, setAnswers] = useState([null, null, null])
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  const TODAY = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const audio = new Audio('/auramusic.mp3')
    audioRef.current = audio
    audio.addEventListener('ended', () => setPlaying(false))
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  function toggleAudio() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play()
    setPlaying(true)
  }

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

  // Reload when user changes so attempt state is fresh
  useEffect(() => { loadData() }, [user])

  async function loadData() {
    setDailyLoading(true)
    setAttemptLoaded(false)

    const { data } = await supabase
      .from('daily_cards')
      .select('*, cards(*)')
      .neq('is_hidden', true)
      .order('created_at', { ascending: false })
      .limit(50)

    const all = data || []
    const todayAll = all.filter(d => d.date === TODAY)
    const seen = new Set([TODAY])
    const pastOne = all.filter(d => {
      if (seen.has(d.date)) return false
      seen.add(d.date)
      return true
    }).slice(0, 6)

    setDailyCards([...todayAll, ...pastOne])
    setDailyLoading(false)

    // Load attempt for the specific latest card (not just by date)
    const latestToday = todayAll[0]
    if (user && latestToday?.id) {
      const { data: attemptData } = await supabase
        .from('daily_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('daily_card_id', latestToday.id)
        .maybeSingle()
      setTodayAttempt(attemptData || null)
    } else {
      setTodayAttempt(null)
    }
    setAttemptLoaded(true)
  }

  async function handleSubmit(daily) {
    if (answers.some(a => a === null)) return
    setSubmitting(true)

    const mcq = daily.mcq
    const score = answers.reduce((s, a, i) => s + (a === mcq[i].correct ? 1 : 0), 0)
    const passed = score === 3

    await supabase.from('daily_attempts').upsert({
      user_id: user.id,
      date: TODAY,
      daily_card_id: daily.id,
      answers,
      score,
      passed,
    }, { onConflict: 'user_id,daily_card_id' })

    if (passed) {
      await supabase.from('user_cards').upsert(
        { user_id: user.id, card_id: daily.card_id, quantity: 1, obtained_at: new Date().toISOString() },
        { onConflict: 'user_id,card_id', ignoreDuplicates: true }
      )
    }

    setTodayAttempt({ score, passed, answers })
    setSubmitting(false)
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    })
  }

  const todayCards = dailyCards.filter(d => d.date === TODAY)
  const todayCard = todayCards[0] || null
  const extraTodayCards = todayCards.slice(1)
  const pastCards = dailyCards.filter(d => d.date !== TODAY)
  const revealed = !!todayAttempt

  return (
    <div className="px-4">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-navy">
            Finance <span className="text-gold">Trading Cards</span>
          </h1>
          <div className="flex justify-center mb-4">
            <button
              onClick={toggleAudio}
              className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all duration-300 ${
                playing
                  ? 'bg-gold text-navy-dark shadow-lg'
                  : 'bg-white border-2 border-gold/60 text-gold-dark hover:border-gold hover:shadow-lg hover:shadow-gold/30'
              }`}
              style={playing ? { boxShadow: '0 0 20px rgba(201,162,75,0.5), 0 0 40px rgba(201,162,75,0.2)' } : undefined}
            >
              <span className="text-lg">{playing ? '▐▐' : '▶'}</span>
              {playing && (
                <span className="absolute inset-0 rounded-full animate-ping bg-gold/20 pointer-events-none" />
              )}
            </button>
          </div>
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

          {/* Today's latest card — full MCQ treatment */}
          {todayCard && (
            <article className="bg-white border-2 border-gold/40 rounded-2xl shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">

                {/* Card image */}
                <div className={`bg-mist flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-navy/10 transition-all duration-700 ${revealed && !todayAttempt.passed ? 'grayscale opacity-60' : ''}`}>
                  {todayCard.cards?.image_url ? (
                    <img
                      src={todayCard.cards.image_url}
                      alt={todayCard.cards?.name}
                      className={`w-32 aspect-[11/17] object-cover rounded-xl shadow transition-all duration-700 ${!revealed ? 'blur scale-105' : ''}`}
                    />
                  ) : (
                    <div className="w-32 aspect-[11/17] bg-white border border-navy/10 rounded-xl" />
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-gold-dark">Today · {formatDate(todayCard.date)}</span>
                      {!revealed && <span className="text-xs bg-gold/20 text-gold-dark font-bold px-2 py-0.5 rounded-full">New</span>}
                      {revealed && todayAttempt.passed && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">🎉 {todayAttempt.score}/3 — Unlocked!</span>}
                      {revealed && !todayAttempt.passed && <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">{todayAttempt.score}/3 — Better luck tomorrow</span>}
                    </div>
                    <h2 className="text-xl font-extrabold text-navy">{todayCard.cards?.name || '—'}</h2>
                  </div>

                  <p className="text-navy/70 text-sm leading-relaxed">{todayCard.news_summary}</p>

                  {/* MCQ — only if not yet attempted and user is logged in */}
                  {attemptLoaded && !revealed && user && (
                    <div className="border-t border-navy/10 pt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gold-dark font-black mb-4">
                        Answer 3/3 correctly to unlock the card
                      </p>
                      <div className="space-y-4">
                        {todayCard.mcq.map((q, qi) => (
                          <div key={qi}>
                            <p className="font-bold text-navy text-sm mb-2">
                              <span className="text-gold-dark mr-2">{qi + 1}.</span>{q.question}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.answers.map((ans, ai) => (
                                <button
                                  key={ai}
                                  onClick={() => setAnswers(prev => { const n = [...prev]; n[qi] = ai; return n })}
                                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-left border-2 transition-all ${
                                    answers[qi] === ai
                                      ? 'bg-navy text-white border-navy'
                                      : 'bg-white text-navy border-navy/15 hover:border-navy/40'
                                  }`}
                                >
                                  {ans}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <GlowButton
                          onClick={() => handleSubmit(todayCard)}
                          disabled={answers.some(a => a === null) || submitting}
                          className="px-6 py-2.5 text-sm disabled:opacity-40"
                        >
                          {submitting ? 'Checking...' : 'Submit Answers'}
                        </GlowButton>
                        {answers.some(a => a === null) && (
                          <p className="text-xs text-navy/40">Answer all 3 questions first</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Not logged in */}
                  {!user && (
                    <div className="border-t border-navy/10 pt-4">
                      <Link to="/login" className="text-gold-dark font-bold text-sm hover:underline">
                        Login to unlock today's card →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </article>
          )}

          {/* Earlier cards from today (force-generated) */}
          {extraTodayCards.map(daily => (
            <article key={daily.id} className="bg-white border border-navy/10 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[200px_1fr]">
              <div className="bg-mist flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-navy/10">
                {daily.cards?.image_url ? (
                  <img src={daily.cards.image_url} alt={daily.cards.name} className="w-32 aspect-[11/17] object-cover rounded-xl shadow" />
                ) : (
                  <div className="w-32 aspect-[11/17] bg-white border border-navy/10 rounded-xl" />
                )}
              </div>
              <div className="p-6 flex flex-col justify-center">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-navy/40">Today (earlier) · {formatDate(daily.date)}</span>
                <h2 className="text-xl font-extrabold text-navy mt-1 mb-3">{daily.cards?.name || '—'}</h2>
                <p className={`text-navy/65 text-sm leading-relaxed ${!expanded[daily.id] ? 'line-clamp-3' : ''}`}>{daily.news_summary}</p>
                {!expanded[daily.id] && (
                  <button onClick={() => setExpanded(e => ({ ...e, [daily.id]: true }))} className="mt-1 text-gold-dark text-sm font-bold hover:underline text-left">Read more...</button>
                )}
              </div>
            </article>
          ))}

          {/* Past cards */}
          {pastCards.map(daily => (
            <article key={daily.id} className="bg-white border border-navy/10 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[200px_1fr]">
              <div className="bg-mist flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-navy/10">
                {daily.cards?.image_url ? (
                  <img src={daily.cards.image_url} alt={daily.cards.name} className="w-32 aspect-[11/17] object-cover rounded-xl shadow" />
                ) : (
                  <div className="w-32 aspect-[11/17] bg-white border border-navy/10 rounded-xl flex items-center justify-center text-navy/40 text-sm">No image</div>
                )}
              </div>
              <div className="p-6 flex flex-col justify-center">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-navy/40">{formatDate(daily.date)}</span>
                <h2 className="text-xl font-extrabold text-navy mt-1 mb-3">{daily.cards?.name || '—'}</h2>
                <p className={`text-navy/65 text-sm leading-relaxed ${!expanded[daily.id] ? 'line-clamp-3' : ''}`}>{daily.news_summary}</p>
                {!expanded[daily.id] && (
                  <button onClick={() => setExpanded(e => ({ ...e, [daily.id]: true }))} className="mt-1 text-gold-dark text-sm font-bold hover:underline text-left">Read more...</button>
                )}
              </div>
            </article>
          ))}

        </section>
      )}
    </div>
  )
}
