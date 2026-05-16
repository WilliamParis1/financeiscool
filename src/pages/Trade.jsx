import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import CardDisplay from '../components/CardDisplay'

export default function Trade() {
  const { user } = useAuth()
  const [tab, setTab] = useState('incoming')
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading] = useState(true)

  // New trade form
  const [myCards, setMyCards] = useState([])
  const [otherUsername, setOtherUsername] = useState('')
  const [otherProfile, setOtherProfile] = useState(null)
  const [otherCards, setOtherCards] = useState([])
  const [selectedMyCard, setSelectedMyCard] = useState(null)
  const [selectedTheirCard, setSelectedTheirCard] = useState(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [respondingTradeId, setRespondingTradeId] = useState('')
  const [tradeError, setTradeError] = useState('')
  const [tradeSuccess, setTradeSuccess] = useState('')

  useEffect(() => {
    loadTrades()
    loadMyCards()
  }, [user])

  async function loadTrades() {
    const [{ data: inc }, { data: out }] = await Promise.all([
      supabase.from('trades')
        .select('*, offered_card:cards!offered_card_id(*), requested_card:cards!requested_card_id(*), from_profile:profiles!from_user_id(username)')
        .eq('to_user_id', user.id)
        .eq('status', 'pending'),
      supabase.from('trades')
        .select('*, offered_card:cards!offered_card_id(*), requested_card:cards!requested_card_id(*), to_profile:profiles!to_user_id(username)')
        .eq('from_user_id', user.id)
        .in('status', ['pending', 'accepted', 'rejected']),
    ])
    setIncoming(inc || [])
    setOutgoing(out || [])
    setLoading(false)
  }

  async function loadMyCards() {
    const { data } = await supabase.from('user_cards').select('*, cards(*)').eq('user_id', user.id)
    setMyCards(data?.map(uc => ({ ...uc.cards, quantity: uc.quantity, user_card_id: uc.id })) || [])
  }

  async function searchUser() {
    const trimmed = otherUsername.trim()
    if (!trimmed) return
    setTradeError('')
    const { data } = await supabase.from('profiles').select('*').eq('username', trimmed).single()
    if (!data) { setTradeError('User not found'); setOtherProfile(null); setOtherCards([]); return }
    if (data.id === user.id) { setTradeError("You can't trade with yourself"); return }
    setOtherProfile(data)
    const { data: cards } = await supabase.from('user_cards').select('*, cards(*)').eq('user_id', data.id)
    setOtherCards(cards?.map(uc => ({ ...uc.cards, quantity: uc.quantity, user_card_id: uc.id })) || [])
  }

  async function sendTrade() {
    if (!selectedMyCard || !otherProfile) return
    setSending(true)
    setTradeError('')
    setTradeSuccess('')

    const { error } = await supabase.from('trades').insert({
      from_user_id: user.id,
      to_user_id: otherProfile.id,
      offered_card_id: selectedMyCard.id,
      requested_card_id: selectedTheirCard?.id || null,
      message: message || null,
      status: 'pending',
    })

    if (error) {
      setTradeError(error.message)
    } else {
      setTradeSuccess('Trade offer sent!')
      setSelectedMyCard(null)
      setSelectedTheirCard(null)
      setMessage('')
      setOtherUsername('')
      setOtherProfile(null)
      setOtherCards([])
      loadTrades()
    }
    setSending(false)
  }

  async function respondTrade(trade, status) {
    setRespondingTradeId(trade.id)
    setTradeError('')
    setTradeSuccess('')

    try {
      if (status === 'accepted') {
        const { error } = await supabase.rpc('accept_trade', { target_trade_id: trade.id })
        if (error) throw error
        setTradeSuccess('Trade accepted. Both cards were exchanged.')
      } else {
        const { error } = await supabase.from('trades').update({ status }).eq('id', trade.id)
        if (error) throw error
        setTradeSuccess('Trade rejected.')
      }
      await Promise.all([loadTrades(), loadMyCards()])
    } catch (err) {
      setTradeError(err.message)
    } finally {
      setRespondingTradeId('')
    }
  }

  async function cancelTrade(tradeId) {
    await supabase.from('trades').update({ status: 'cancelled' }).eq('id', tradeId)
    loadTrades()
  }

  const statusStyle = {
    pending:   'bg-amber-100 text-amber-700',
    accepted:  'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
    cancelled: 'bg-navy/10 text-navy/50',
  }

  const tabBtn = active =>
    `px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
      active ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy border border-navy/15'
    }`

  if (loading) return <div className="text-center py-20 text-navy/50 animate-pulse">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-navy mb-6">Trades</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'incoming', label: `Incoming (${incoming.length})` },
          { key: 'outgoing', label: `Sent (${outgoing.length})` },
          { key: 'new',      label: '+ New Trade' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={tabBtn(tab === key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Incoming */}
      {tab === 'incoming' && (
        <div className="space-y-4">
          {tradeError && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">{tradeError}</div>}
          {tradeSuccess && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 text-sm">{tradeSuccess}</div>}
          {incoming.length === 0 ? (
            <div className="text-center py-12 text-navy/50 bg-white rounded-2xl border border-navy/10 shadow-sm">
              No incoming trade offers
            </div>
          ) : incoming.map(trade => (
            <div key={trade.id} className="bg-white rounded-xl p-5 border border-navy/10 shadow-sm">
              <p className="text-sm text-navy/50 mb-4">
                From <span className="text-navy font-semibold">{trade.from_profile?.username}</span>
              </p>
              <div className="flex gap-6 items-center flex-wrap">
                <div>
                  <p className="text-xs text-navy/40 mb-2">They offer</p>
                  {trade.offered_card && <CardDisplay card={trade.offered_card} small />}
                </div>
                {trade.requested_card && (
                  <>
                    <div className="text-gold text-2xl">⇌</div>
                    <div>
                      <p className="text-xs text-navy/40 mb-2">They want</p>
                      <CardDisplay card={trade.requested_card} small />
                    </div>
                  </>
                )}
              </div>
              {trade.message && <p className="text-navy/60 text-sm mt-3 italic">"{trade.message}"</p>}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => respondTrade(trade, 'accepted')}
                  disabled={respondingTradeId === trade.id}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm transition-colors font-semibold"
                >
                  {respondingTradeId === trade.id ? 'Working...' : 'Accept'}
                </button>
                <button
                  onClick={() => respondTrade(trade, 'rejected')}
                  disabled={respondingTradeId === trade.id}
                  className="bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 px-5 py-2 rounded-lg text-sm transition-colors font-semibold"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outgoing */}
      {tab === 'outgoing' && (
        <div className="space-y-4">
          {outgoing.length === 0 ? (
            <div className="text-center py-12 text-navy/50 bg-white rounded-2xl border border-navy/10 shadow-sm">
              No sent trades
            </div>
          ) : outgoing.map(trade => (
            <div key={trade.id} className="bg-white rounded-xl p-5 border border-navy/10 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm text-navy/50">
                  To <span className="text-navy font-semibold">{trade.to_profile?.username}</span>
                </p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${statusStyle[trade.status]}`}>
                  {trade.status}
                </span>
              </div>
              <div className="flex gap-6 items-center flex-wrap">
                <div>
                  <p className="text-xs text-navy/40 mb-2">You offer</p>
                  {trade.offered_card && <CardDisplay card={trade.offered_card} small />}
                </div>
                {trade.requested_card && (
                  <>
                    <div className="text-gold text-2xl">⇌</div>
                    <div>
                      <p className="text-xs text-navy/40 mb-2">You want</p>
                      <CardDisplay card={trade.requested_card} small />
                    </div>
                  </>
                )}
              </div>
              {trade.status === 'pending' && (
                <button onClick={() => cancelTrade(trade.id)}
                  className="mt-4 bg-navy/10 hover:bg-navy/20 text-navy px-4 py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New trade */}
      {tab === 'new' && (
        <div className="bg-white rounded-2xl p-6 border border-navy/10 shadow-lg space-y-8">
          {tradeError && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">{tradeError}</div>}
          {tradeSuccess && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 text-sm">{tradeSuccess}</div>}

          <div>
            <h3 className="text-lg font-bold text-navy mb-3">1. Select a card to offer</h3>
            {myCards.length === 0 ? (
              <p className="text-navy/50">You have no cards to trade yet.</p>
            ) : (
              <div className="flex gap-3 flex-wrap max-h-72 overflow-y-auto pb-2">
                {myCards.map(card => (
                  <div key={card.user_card_id}
                    onClick={() => setSelectedMyCard(selectedMyCard?.id === card.id ? null : card)}
                    className={`cursor-pointer transition-all ${selectedMyCard?.id === card.id ? 'ring-2 ring-gold rounded-xl scale-105' : 'opacity-70 hover:opacity-100'}`}>
                    <CardDisplay card={card} small />
                  </div>
                ))}
              </div>
            )}
            {selectedMyCard && <p className="text-gold-dark text-sm mt-2 font-semibold">✓ Offering: {selectedMyCard.name}</p>}
          </div>

          <div>
            <h3 className="text-lg font-bold text-navy mb-3">2. Find a player</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter username..."
                value={otherUsername}
                onChange={e => setOtherUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
                className="flex-1 bg-mist border border-navy/15 rounded-lg px-4 py-2 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              <button onClick={searchUser}
                className="bg-navy hover:bg-navy-mid text-white px-5 py-2 rounded-lg transition-colors font-semibold">
                Search
              </button>
            </div>
          </div>

          {otherProfile && (
            <div>
              <h3 className="text-lg font-bold text-navy mb-3">
                3. Request a card from {otherProfile.username} <span className="text-navy/40 font-normal text-sm">(optional)</span>
              </h3>
              {otherCards.length === 0 ? (
                <p className="text-navy/50">This player has no cards.</p>
              ) : (
                <div className="flex gap-3 flex-wrap max-h-72 overflow-y-auto pb-2">
                  {otherCards.map(card => (
                    <div key={card.user_card_id}
                      onClick={() => setSelectedTheirCard(selectedTheirCard?.id === card.id ? null : card)}
                      className={`cursor-pointer transition-all ${selectedTheirCard?.id === card.id ? 'ring-2 ring-blue-500 rounded-xl scale-105' : 'opacity-70 hover:opacity-100'}`}>
                      <CardDisplay card={card} small />
                    </div>
                  ))}
                </div>
              )}
              {selectedTheirCard && <p className="text-blue-600 text-sm mt-2 font-semibold">✓ Requesting: {selectedTheirCard.name}</p>}
            </div>
          )}

          {otherProfile && (
            <div>
              <h3 className="text-lg font-bold text-navy mb-3">4. Message <span className="text-navy/40 font-normal text-sm">(optional)</span></h3>
              <input
                type="text"
                placeholder="Add a message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={200}
                className="w-full bg-mist border border-navy/15 rounded-lg px-4 py-2 text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
            </div>
          )}

          {otherProfile && selectedMyCard && (
            <button onClick={sendTrade} disabled={sending}
              className="w-full bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy-dark py-3 rounded-xl font-bold transition-colors">
              {sending ? 'Sending...' : 'Send Trade Offer'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
