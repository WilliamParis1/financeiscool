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

  async function transferCard(fromUserId, toUserId, cardId) {
    const { data: fromCard } = await supabase.from('user_cards').select('*').eq('user_id', fromUserId).eq('card_id', cardId).single()
    if (fromCard) {
      if (fromCard.quantity > 1) {
        await supabase.from('user_cards').update({ quantity: fromCard.quantity - 1 }).eq('id', fromCard.id)
      } else {
        await supabase.from('user_cards').delete().eq('id', fromCard.id)
      }
    }
    const { data: toCard } = await supabase.from('user_cards').select('*').eq('user_id', toUserId).eq('card_id', cardId).single()
    if (toCard) {
      await supabase.from('user_cards').update({ quantity: toCard.quantity + 1 }).eq('id', toCard.id)
    } else {
      await supabase.from('user_cards').insert({ user_id: toUserId, card_id: cardId, quantity: 1 })
    }
  }

  async function respondTrade(trade, status) {
    await supabase.from('trades').update({ status }).eq('id', trade.id)
    if (status === 'accepted') {
      await transferCard(trade.from_user_id, user.id, trade.offered_card_id)
      if (trade.requested_card_id) {
        await transferCard(user.id, trade.from_user_id, trade.requested_card_id)
      }
    }
    loadTrades()
  }

  async function cancelTrade(tradeId) {
    await supabase.from('trades').update({ status: 'cancelled' }).eq('id', tradeId)
    loadTrades()
  }

  const statusStyle = {
    pending:   'bg-yellow-900 text-yellow-300',
    accepted:  'bg-green-900 text-green-300',
    rejected:  'bg-red-900 text-red-300',
    cancelled: 'bg-gray-800 text-gray-400',
  }

  if (loading) return <div className="text-center py-20 text-purple-400 animate-pulse">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-purple-300 mb-6">Trades</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'incoming', label: `Incoming (${incoming.length})` },
          { key: 'outgoing', label: `Sent (${outgoing.length})` },
          { key: 'new',      label: '+ New Trade' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === key ? 'bg-purple-600 text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white border border-purple-900/30'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Incoming */}
      {tab === 'incoming' && (
        <div className="space-y-4">
          {incoming.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-[#1a1a2e] rounded-2xl border border-purple-900/30">
              No incoming trade offers
            </div>
          ) : incoming.map(trade => (
            <div key={trade.id} className="bg-[#1a1a2e] rounded-xl p-5 border border-purple-900/30">
              <p className="text-sm text-gray-400 mb-4">
                From <span className="text-purple-300 font-medium">{trade.from_profile?.username}</span>
              </p>
              <div className="flex gap-6 items-center flex-wrap">
                <div>
                  <p className="text-xs text-gray-500 mb-2">They offer</p>
                  {trade.offered_card && <CardDisplay card={trade.offered_card} small />}
                </div>
                {trade.requested_card && (
                  <>
                    <div className="text-gray-500 text-2xl">⇌</div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">They want</p>
                      <CardDisplay card={trade.requested_card} small />
                    </div>
                  </>
                )}
              </div>
              {trade.message && <p className="text-gray-400 text-sm mt-3 italic">"{trade.message}"</p>}
              <div className="flex gap-3 mt-4">
                <button onClick={() => respondTrade(trade, 'accepted')}
                  className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm transition-colors font-medium">
                  Accept
                </button>
                <button onClick={() => respondTrade(trade, 'rejected')}
                  className="bg-red-900 hover:bg-red-800 text-white px-5 py-2 rounded-lg text-sm transition-colors">
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
            <div className="text-center py-12 text-gray-500 bg-[#1a1a2e] rounded-2xl border border-purple-900/30">
              No sent trades
            </div>
          ) : outgoing.map(trade => (
            <div key={trade.id} className="bg-[#1a1a2e] rounded-xl p-5 border border-purple-900/30">
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm text-gray-400">
                  To <span className="text-purple-300 font-medium">{trade.to_profile?.username}</span>
                </p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyle[trade.status]}`}>
                  {trade.status}
                </span>
              </div>
              <div className="flex gap-6 items-center flex-wrap">
                <div>
                  <p className="text-xs text-gray-500 mb-2">You offer</p>
                  {trade.offered_card && <CardDisplay card={trade.offered_card} small />}
                </div>
                {trade.requested_card && (
                  <>
                    <div className="text-gray-500 text-2xl">⇌</div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">You want</p>
                      <CardDisplay card={trade.requested_card} small />
                    </div>
                  </>
                )}
              </div>
              {trade.status === 'pending' && (
                <button onClick={() => cancelTrade(trade.id)}
                  className="mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New trade */}
      {tab === 'new' && (
        <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-purple-900/30 space-y-8">
          {tradeError && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{tradeError}</div>}
          {tradeSuccess && <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg p-3 text-sm">{tradeSuccess}</div>}

          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">1. Select a card to offer</h3>
            {myCards.length === 0 ? (
              <p className="text-gray-500">You have no cards to trade yet.</p>
            ) : (
              <div className="flex gap-3 flex-wrap max-h-72 overflow-y-auto pb-2">
                {myCards.map(card => (
                  <div key={card.user_card_id}
                    onClick={() => setSelectedMyCard(selectedMyCard?.id === card.id ? null : card)}
                    className={`cursor-pointer transition-all ${selectedMyCard?.id === card.id ? 'ring-2 ring-purple-400 rounded-xl scale-105' : 'opacity-70 hover:opacity-100'}`}>
                    <CardDisplay card={card} small />
                  </div>
                ))}
              </div>
            )}
            {selectedMyCard && <p className="text-purple-400 text-sm mt-2">✓ Offering: {selectedMyCard.name}</p>}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">2. Find a player</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter username..."
                value={otherUsername}
                onChange={e => setOtherUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
                className="flex-1 bg-[#0f0f1a] border border-purple-900/50 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
              />
              <button onClick={searchUser}
                className="bg-purple-700 hover:bg-purple-600 text-white px-5 py-2 rounded-lg transition-colors font-medium">
                Search
              </button>
            </div>
          </div>

          {otherProfile && (
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-3">
                3. Request a card from {otherProfile.username} <span className="text-gray-500 font-normal text-sm">(optional)</span>
              </h3>
              {otherCards.length === 0 ? (
                <p className="text-gray-500">This player has no cards.</p>
              ) : (
                <div className="flex gap-3 flex-wrap max-h-72 overflow-y-auto pb-2">
                  {otherCards.map(card => (
                    <div key={card.user_card_id}
                      onClick={() => setSelectedTheirCard(selectedTheirCard?.id === card.id ? null : card)}
                      className={`cursor-pointer transition-all ${selectedTheirCard?.id === card.id ? 'ring-2 ring-blue-400 rounded-xl scale-105' : 'opacity-70 hover:opacity-100'}`}>
                      <CardDisplay card={card} small />
                    </div>
                  ))}
                </div>
              )}
              {selectedTheirCard && <p className="text-blue-400 text-sm mt-2">✓ Requesting: {selectedTheirCard.name}</p>}
            </div>
          )}

          {otherProfile && (
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-3">4. Message <span className="text-gray-500 font-normal text-sm">(optional)</span></h3>
              <input
                type="text"
                placeholder="Add a message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={200}
                className="w-full bg-[#0f0f1a] border border-purple-900/50 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {otherProfile && selectedMyCard && (
            <button onClick={sendTrade} disabled={sending}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors">
              {sending ? 'Sending...' : 'Send Trade Offer'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
