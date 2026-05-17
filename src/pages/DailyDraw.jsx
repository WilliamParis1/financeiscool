import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import GlowButton from '../components/GlowButton'

export default function DailyDraw() {
  const { user } = useAuth()
  const [daily, setDaily] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState([null, null, null])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const TODAY = new Date().toISOString().split('T')[0]

  useEffect(() => { load() }, [user])

  async function load() {
    const [{ data: dailyData }, { data: attemptData }] = await Promise.all([
      supabase.from('daily_cards').select('*, cards(*)').eq('date', TODAY).single(),
      user
        ? supabase.from('daily_attempts').select('*').eq('user_id', user.id).eq('date', TODAY).single()
        : Promise.resolve({ data: null }),
    ])

    setDaily(dailyData || null)
    setAttempt(attemptData || null)
    if (attemptData) setResult({ score: attemptData.score, passed: attemptData.passed, answers: attemptData.answers })
    setLoading(false)
  }

  async function handleSubmit() {
    if (answers.some(a => a === null)) return
    setSubmitting(true)

    const mcq = daily.mcq
    const score = answers.reduce((s, a, i) => s + (a === mcq[i].correct ? 1 : 0), 0)
    const passed = score === 3

    await supabase.from('daily_attempts').insert({
      user_id: user.id,
      date: TODAY,
      answers,
      score,
      passed,
    })

    if (passed) {
      await supabase.from('user_cards').upsert(
        { user_id: user.id, card_id: daily.card_id, quantity: 1, obtained_at: new Date().toISOString() },
        { onConflict: 'user_id,card_id', ignoreDuplicates: true }
      )
    }

    setResult({ score, passed, answers })
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading today's card...</div>

  if (!daily) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-5xl mb-4">📅</p>
      <h2 className="text-2xl font-extrabold text-navy mb-2">No card today yet</h2>
      <p className="text-navy/50">Today's card is generated at 6am Paris time. Check back soon!</p>
    </div>
  )

  const card = daily.cards
  const mcq = daily.mcq
  const revealed = !!result

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-gold-dark font-black mb-1">Daily Card</p>
        <h1 className="text-3xl font-extrabold text-navy">{revealed ? card?.name : '???'}</h1>
        <p className="text-navy/50 text-sm mt-1">
          {new Date(TODAY + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">

        {/* Card visual */}
        <div className="flex flex-col items-center gap-4">
          <div className={`relative rounded-2xl overflow-hidden border-2 shadow-xl w-56 transition-all duration-700 ${
            revealed && result.passed ? 'border-gold' : 'border-navy/20'
          } ${revealed && !result.passed ? 'grayscale opacity-60' : ''}`}>
            {card?.image_url ? (
              <>
                <img
                  src={card.image_url}
                  alt={revealed ? card.name : 'Mystery card'}
                  className={`w-full aspect-[11/17] object-cover transition-all duration-700 ${!revealed ? 'blur-2xl scale-110' : ''}`}
                />
                {!revealed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl select-none">🃏</span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-[11/17] bg-mist flex items-center justify-center text-7xl">🃏</div>
            )}
          </div>

          {revealed && (
            <div className={`w-full text-center px-4 py-3 rounded-xl font-bold text-sm ${
              result.passed
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.passed
                ? `🎉 ${result.score}/3 — Added to your collection!`
                : `${result.score}/3 correct — Better luck tomorrow`}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5">

          {/* News summary */}
          <div className="bg-white rounded-2xl p-6 border border-navy/10 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-gold-dark font-black mb-3">Today's Story</p>
            <p className="text-navy/80 leading-relaxed text-sm">{daily.news_summary}</p>
          </div>

          {/* MCQ — hidden after attempt */}
          {!revealed ? (
            <div className="bg-white rounded-2xl p-6 border border-navy/10 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-dark font-black mb-5">
                Answer 3/3 correctly to unlock the card
              </p>

              <div className="space-y-6">
                {mcq.map((q, qi) => (
                  <div key={qi}>
                    <p className="font-bold text-navy text-sm mb-3">
                      <span className="text-gold-dark mr-2">{qi + 1}.</span>{q.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.answers.map((ans, ai) => (
                        <button
                          key={ai}
                          onClick={() => setAnswers(prev => { const n = [...prev]; n[qi] = ai; return n })}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold text-left border-2 transition-all ${
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

              <div className="mt-6 flex items-center gap-4">
                <GlowButton
                  onClick={handleSubmit}
                  disabled={answers.some(a => a === null) || submitting}
                  className="px-8 py-3 disabled:opacity-40"
                >
                  {submitting ? 'Checking...' : 'Submit Answers'}
                </GlowButton>
                {answers.some(a => a === null) && (
                  <p className="text-xs text-navy/40">Answer all 3 questions first</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-navy/10 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-dark font-black mb-5">Answers</p>
              <div className="space-y-5">
                {mcq.map((q, qi) => {
                  const userAns = result.answers?.[qi]
                  return (
                    <div key={qi}>
                      <p className="font-bold text-navy text-sm mb-2">
                        <span className="text-gold-dark mr-2">{qi + 1}.</span>{q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.answers.map((ans, ai) => (
                          <div
                            key={ai}
                            className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 ${
                              ai === q.correct
                                ? 'bg-green-50 border-green-400 text-green-800'
                                : userAns === ai && ai !== q.correct
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : 'bg-white border-navy/10 text-navy/40'
                            }`}
                          >
                            {ans}
                            {ai === q.correct && ' ✓'}
                            {userAns === ai && ai !== q.correct && ' ✗'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
