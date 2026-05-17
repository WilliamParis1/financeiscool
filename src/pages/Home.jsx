import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { CARD_POSTS_TABLE, isMissingCardPostsTable } from '../lib/cardPostsSchema'
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
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [speechIndex, setSpeechIndex] = useState(0)
  const [speechVisible, setSpeechVisible] = useState(true)

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

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    const { data, error } = await supabase
      .from(CARD_POSTS_TABLE)
      .select('*, cards(*)')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(6)

    if (isMissingCardPostsTable(error)) {
      setPosts([])
      setPostsLoading(false)
      return
    }

    setPosts(data || [])
    setPostsLoading(false)
  }

  function formatDate(date) {
    if (!date) return ''
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <div className="px-4">
      <section className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-navy">
            Finance <span className="text-gold">Trading Cards</span>
          </h1>
          <p className="text-xl text-navy/60 max-w-lg mx-auto">
            +3,000 aura for joining us, learn about finance and economics the fun way
          </p>
        </div>

        {/* JP Morgan animation with speech bubble */}
        <div className="flex flex-col items-center mb-10">
          {/* Speech bubble */}
          <div
            className="relative bg-white border-2 border-navy/20 rounded-2xl px-5 py-3 shadow-md max-w-xs text-center mb-3 transition-opacity duration-300"
            style={{ opacity: speechVisible ? 1 : 0 }}
          >
            <p className="text-navy font-semibold text-sm">{SPEECH_LINES[speechIndex]}</p>
            {/* Bubble tail */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] w-0 h-0"
              style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '10px solid white' }} />
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-[12px] w-0 h-0"
              style={{ borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '11px solid rgb(15 23 42 / 0.2)' }} />
          </div>

          <video
            src="/jpmorgananimation.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-56 w-auto rounded-2xl shadow-lg"
          />
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
              <Link
                to="/login"
                className="border-2 border-navy hover:bg-navy hover:text-white text-navy px-8 py-3 rounded-xl text-lg font-bold transition-colors"
              >
                Login
              </Link>
            </>
          )}
        </div>

      </section>

      <section className="max-w-6xl mx-auto pb-20">
        {postsLoading ? (
          <div className="bg-white border border-navy/10 rounded-2xl p-10 text-center text-navy/50 shadow-sm">
            Loading latest card stories...
          </div>
        ) : posts.length > 0 && (
          <div className="space-y-6">
            {posts.map(post => (
              <article key={post.id} className="bg-white border border-navy/10 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr]">
                <div className="bg-mist p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-navy/10">
                  {post.cards ? (
                    <div className="w-52">
                      <div className="rounded-2xl border-2 border-gold/50 bg-white shadow-lg overflow-hidden">
                        <img src={post.cards.image_url} alt={post.cards.name} className="w-full aspect-[5/7] object-contain bg-mist" />
                        <div className="p-3">
                          <p className="font-extrabold text-navy truncate">{post.cards.name}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-gold-dark font-bold mt-1">{post.cards.rarity}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-52 aspect-square bg-white border border-navy/10 rounded-2xl flex items-center justify-center text-navy/40 text-sm">
                      Card unavailable
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-8 text-left">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {post.published_at && <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">{formatDate(post.published_at)}</span>}
                    {post.news_source && <span className="text-xs text-navy/40">{post.news_source}</span>}
                  </div>
                  <h3 className="text-2xl font-extrabold text-navy mb-3">{post.title}</h3>
                  {post.market_summary && (
                    <p className="text-navy/70 font-semibold mb-4">{post.market_summary}</p>
                  )}
                  <p className="text-navy/65 whitespace-pre-line leading-relaxed">{post.explanation}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
