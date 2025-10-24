'use client'

import { useEffect, useMemo, useState } from 'react'
import Confetti from 'react-confetti'
import { Shuffle, Star, Trophy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { UnitContent } from '@/lib/content'

interface MatchingGameProps {
  unit: UnitContent
  audio: Record<string, string>
  images: Record<string, string>
}

interface CardViewModel {
  id: number
  text: string
  imageUrl?: string
  audioUrl?: string
}

export default function MatchingGame({ unit, audio, images }: MatchingGameProps) {
  const cards = useMemo<CardViewModel[]>(
    () =>
      unit.items.map((item) => ({
        id: item.id,
        text: item.text,
        imageUrl: images[item.imageKey],
        audioUrl: audio[item.audioKey]
      })),
    [unit.items, audio, images]
  )

  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [shuffledImages, setShuffledImages] = useState<CardViewModel[]>([])
  const [shuffledWords, setShuffledWords] = useState<CardViewModel[]>([])
  const [matches, setMatches] = useState<Record<number, { matched: boolean; correct: boolean; imageUrl?: string }>>({})
  const [score, setScore] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)

  const successSounds = useMemo(
    () =>
      [1, 2, 3]
        .map((index) => audio[`${unit.level}-effect-success${index}`])
        .filter((value): value is string => Boolean(value)),
    [audio, unit.level]
  )
  const proudVoiceover = audio[`${unit.level}-voiceover-proud`]

  const numberOfCards = Math.min(cards.length, 6)
  const isGameComplete = score === numberOfCards && numberOfCards > 0

  const shuffleArray = <T,>(array: T[]): T[] => {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const resetGame = () => {
    const sample = shuffleArray(cards).slice(0, numberOfCards)
    setShuffledImages(shuffleArray(sample))
    setShuffledWords(shuffleArray(sample))
    setMatches({})
    setScore(0)
    setTotalAttempts(0)
    setSelectedImageId(null)
  }

  useEffect(() => {
    if (numberOfCards > 0) {
      resetGame()
    }
  }, [cards, numberOfCards])

  useEffect(() => {
    if (isGameComplete && proudVoiceover) {
      const audioEl = new Audio(proudVoiceover)
      audioEl.play().catch((error) => console.error('Error playing completion voiceover', error))
    }
  }, [isGameComplete, proudVoiceover])

  const handleSelection = (type: 'image' | 'word', id: number) => {
    if (type === 'image') {
      setSelectedImageId(id)
      const card = shuffledImages.find((item) => item.id === id)
      if (card?.audioUrl) {
        const audioEl = new Audio(card.audioUrl)
        audioEl.play().catch((error) => console.error('Error playing audio', error))
      }
      return
    }

    if (selectedImageId === null) return

    setTotalAttempts((prev) => prev + 1)

    const imageCard = shuffledImages.find((item) => item.id === selectedImageId)
    const wordCard = shuffledWords.find((item) => item.id === id)

    if (imageCard && wordCard && imageCard.id === wordCard.id) {
      if (successSounds.length > 0) {
        const sound = successSounds[Math.floor(Math.random() * successSounds.length)]
        new Audio(sound).play().catch((error) => console.error('Error playing success sound', error))
      }

      setTimeout(() => {
        setMatches((prev) => ({
          ...prev,
          [id]: { matched: true, correct: true, imageUrl: imageCard.imageUrl }
        }))
        setScore((prev) => prev + 1)
      }, 400)
    } else {
      setMatches((prev) => ({
        ...prev,
        [selectedImageId]: { matched: true, correct: false }
      }))
      setTimeout(() => {
        setMatches((prev) => {
          const next = { ...prev }
          delete next[selectedImageId]
          return next
        })
      }, 600)
    }

    setSelectedImageId(null)
  }

  const calculateStars = () => {
    if (numberOfCards === 0) return 0
    if (totalAttempts <= numberOfCards) return 3
    if (totalAttempts <= numberOfCards + 2) return 2
    return 1
  }

  if (numberOfCards === 0) {
    return <p className="text-center text-slate-600">No cards available for this unit yet.</p>
  }

  return (
    <div className="relative mx-auto max-w-4xl p-4">
      {isGameComplete && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} />}

      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl bg-blue-100 p-4 shadow-lg md:flex-row md:items-center">
        <div className="text-xl font-bold text-blue-600">
          Score: <span className="text-green-500">{score}</span> / {numberOfCards}
          <span className="ml-4 text-base text-blue-500">Attempts: {totalAttempts}</span>
        </div>
        <Button onClick={resetGame} className="bg-blue-500 text-white hover:bg-blue-600">
          <Shuffle className="mr-2 h-4 w-4" />
          Play Again
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          {shuffledImages.map((card) => {
            const match = matches[card.id]
            const isSelected = selectedImageId === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelection('image', card.id)}
                className={`h-32 w-32 rounded-xl border-4 bg-white p-2 shadow-md transition-transform duration-200 ${
                  match?.matched ? 'cursor-default opacity-50' : 'cursor-pointer hover:scale-105'
                } ${isSelected ? 'border-yellow-400 shadow-yellow-200' : 'border-blue-300'}`}
                disabled={Boolean(match?.matched)}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.text} className="h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-slate-500">Missing image</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {shuffledWords.map((card) => {
            const match = matches[card.id]
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelection('word', card.id)}
                className={`flex h-32 w-32 items-center justify-center rounded-xl border-4 p-4 text-center transition-all duration-200 ${
                  match?.matched
                    ? match.correct
                      ? 'border-green-500 bg-green-100'
                      : 'border-red-500 bg-red-100'
                    : 'border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100'
                }`}
                disabled={Boolean(match?.matched)}
              >
                {match?.matched && match.correct && match.imageUrl ? (
                  <img src={match.imageUrl} alt={card.text} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-medium text-slate-700">{card.text}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {isGameComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
            <h3 className="mb-4 text-3xl font-bold text-blue-600">Amazing Job! 🎉</h3>
            <p className="mb-6 text-lg text-purple-600">You&apos;re a Matching Master!</p>
            <div className="mb-6 flex justify-center gap-2">
              {Array.from({ length: calculateStars() }).map((_, index) => (
                <Star key={index} className="h-10 w-10 text-yellow-400" fill="yellow" />
              ))}
            </div>
            <Button onClick={resetGame} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600">
              Play Again!
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
