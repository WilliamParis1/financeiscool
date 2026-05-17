import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { getCroppedImg } from '../lib/cropImage'

export default function AvatarPickerModal({ cards, onClose, onSaved }) {
  const { user, updateProfile } = useAuth()
  const [step, setStep] = useState('pick')
  const [selectedCard, setSelectedCard] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function pickCard(card) {
    setSelectedCard(card)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setError(null)
    setStep('crop')
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const blob = await getCroppedImg(selectedCard.image_url, croppedAreaPixels)
      const path = `${user.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = `${publicUrl}?v=${Date.now()}`

      await updateProfile({ avatar_url: avatarUrl })
      onSaved(avatarUrl)
      onClose()
    } catch (err) {
      setError('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {step === 'pick' ? (
          <>
            <div className="p-6 border-b border-navy/10 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-extrabold text-navy">Choose a card as your photo</h2>
              <button onClick={onClose} className="text-navy/40 hover:text-navy text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto">
              {cards.length === 0 ? (
                <p className="text-center text-navy/50 py-12">You don't have any cards yet. Claim your first card to set a profile photo.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {cards.map(card => (
                    <button
                      key={card.user_card_id}
                      onClick={() => pickCard(card)}
                      className="rounded-xl overflow-hidden border-2 border-transparent hover:border-gold focus:border-gold transition-all focus:outline-none"
                      title={card.name}
                    >
                      <img src={card.image_url} alt={card.name} className="w-full aspect-[5/7] object-contain bg-mist" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="p-5 border-b border-navy/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('pick')} className="text-navy/50 hover:text-navy text-sm font-semibold transition-colors">
                  ← Back
                </button>
                <h2 className="text-lg font-extrabold text-navy">Crop your photo</h2>
              </div>
              <button onClick={onClose} className="text-navy/40 hover:text-navy text-2xl leading-none">&times;</button>
            </div>

            <div className="relative bg-gray-900" style={{ height: '340px' }}>
              <Cropper
                image={selectedCard.image_url}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-navy/10 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-navy/50 font-semibold w-10 shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="flex-1 accent-navy"
                />
              </div>
            </div>

            {error && (
              <p className="px-6 pt-2 text-sm text-red-500 shrink-0">{error}</p>
            )}

            <div className="p-5 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setStep('pick')}
                className="px-5 py-2.5 rounded-xl text-navy font-semibold border border-navy/20 hover:bg-navy/5 transition-colors"
              >
                Change card
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy/80 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save photo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
