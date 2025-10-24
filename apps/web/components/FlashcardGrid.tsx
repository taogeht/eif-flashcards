'use client'

import { useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

import type { UnitContent } from '@/lib/content'

interface FlashcardGridProps {
  unit: UnitContent
  audio: Record<string, string>
  images: Record<string, string>
}

export default function FlashcardGrid({ unit, audio, images }: FlashcardGridProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)

  const cards = useMemo(
    () =>
      unit.items.map((item) => ({
        ...item,
        imageUrl: images[item.imageKey],
        audioUrl: audio[item.audioKey]
      })),
    [unit.items, images, audio]
  )

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null

  const playAudio = (url?: string) => {
    if (!url || !audioRef.current) return
    audioRef.current.src = url
    audioRef.current.currentTime = 0
    audioRef.current.play().catch((error) => console.error('Unable to play audio', error))
  }

  const handleCardClick = (cardId: number) => {
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    setSelectedCardId(cardId)
    playAudio(card.audioUrl)
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedCardId(null)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <audio ref={audioRef} />

      <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="relative aspect-square overflow-hidden rounded-xl border-4 border-pink-300 bg-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
            onClick={() => handleCardClick(card.id)}
          >
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.text} className="absolute inset-0 h-full w-full object-contain p-2" />
            ) : (
              <span className="flex h-full w-full items-center justify-center p-2 text-sm text-slate-500">
                Missing image
              </span>
            )}
          </button>
        ))}
      </div>

      <Dialog open={Boolean(selectedCard)} onOpenChange={handleDialogChange}>
        <DialogContent className="h-auto w-full max-w-md bg-gradient-to-r from-pink-50 to-purple-50 p-6">
          <DialogTitle className="sr-only">{selectedCard ? `${unit.title} - ${selectedCard.text}` : ''}</DialogTitle>
          {selectedCard && (
            <button
              type="button"
              className="aspect-square w-full overflow-hidden rounded-xl border-4 border-purple-300 bg-white shadow-lg"
              onClick={() => playAudio(selectedCard.audioUrl)}
            >
              {selectedCard.imageUrl ? (
                <img src={selectedCard.imageUrl} alt={selectedCard.text} className="h-full w-full object-contain p-4" />
              ) : (
                <span className="flex h-full w-full items-center justify-center p-4 text-sm text-slate-500">
                  Missing image
                </span>
              )}
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
