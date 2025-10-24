'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Confetti from 'react-confetti'
import { Shuffle, Trophy, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { UnitContent } from '@/lib/content'
import { usePracticeIdentity } from '@/contexts/PracticeContext'
import { endPracticeSession, startPracticeSession } from '@/lib/practice/sessions'
import { completeAssignmentSubmission, startAssignmentSubmission } from '@/lib/practice/assignments'

interface MemoryGameProps {
  unit: UnitContent
  audio: Record<string, string>
  images: Record<string, string>
}

type MemoryCard = {
  id: number
  pairId: number
  imageUrl?: string
  text: string
  isFlipped: boolean
  isMatched: boolean
}

export default function MemoryGame({ unit, audio, images }: MemoryGameProps) {
  const { studentId, classId, assignmentId } = usePracticeIdentity()
  const cardsSource = useMemo(
    () =>
      unit.items.map((item) => ({
        id: item.id,
        text: item.text,
        imageUrl: images[item.imageKey]
      })),
    [unit.items, images]
  )

  const MAX_PAIRS = 6
  const totalPairs = Math.min(cardsSource.length, MAX_PAIRS)

  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedIds, setFlippedIds] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const sessionRef = useRef<{ id: string | null; startedAt: number | null }>({
    id: null,
    startedAt: null
  })
  const roundsRef = useRef(0)

  const proudVoiceover = audio[`${unit.level}-voiceover-proud`]

  const shuffleArray = <T,>(array: T[]): T[] => {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const initializeGame = () => {
    if (totalPairs === 0) {
      setCards([])
      return
    }

    const sample = shuffleArray(cardsSource).slice(0, totalPairs)
    const pairs: MemoryCard[] = []

    sample.forEach((card) => {
      pairs.push(
        {
          id: card.id * 2 - 1,
          pairId: card.id,
          imageUrl: card.imageUrl,
          text: card.text,
          isFlipped: false,
          isMatched: false
        },
        {
          id: card.id * 2,
          pairId: card.id,
          imageUrl: card.imageUrl,
          text: card.text,
          isFlipped: false,
          isMatched: false
        }
      )
    })

    setCards(shuffleArray(pairs))
    setFlippedIds([])
    setMatches(0)
    setIsChecking(false)
  }

  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsSource, totalPairs])

  useEffect(() => {
    if (matches === totalPairs && totalPairs > 0) {
      roundsRef.current += 1
      if (proudVoiceover) {
        new Audio(proudVoiceover).play().catch((error) => console.error('Error playing completion voiceover', error))
      }
    }
  }, [matches, totalPairs, proudVoiceover])

  const finalizeSession = useCallback(async () => {
    const info = sessionRef.current
    if (!info.id) {
      return
    }

    sessionRef.current = { id: null, startedAt: null }
    const durationMs = info.startedAt != null ? Date.now() - info.startedAt : undefined

    await endPracticeSession({
      sessionId: info.id,
      durationMs,
      itemsCompleted: roundsRef.current,
      assignmentId: assignmentId ?? undefined
    })

    if (assignmentId && studentId) {
      await completeAssignmentSubmission({
        assignmentId,
        studentId,
        durationMs,
        metrics: {
          minutes: durationMs != null ? durationMs / 60000 : undefined,
          rounds: roundsRef.current
        }
      })
    }
  }, [assignmentId, studentId])

  const openSession = useCallback(async () => {
    if (sessionRef.current.id) {
      await finalizeSession()
    }

    if (totalPairs === 0) {
      sessionRef.current = { id: null, startedAt: null }
      roundsRef.current = 0
      return
    }

    roundsRef.current = 0
    const sessionId = await startPracticeSession({
      studentId,
      classId,
      assignmentId,
      level: unit.level,
      activity: 'memory_match'
    })

    sessionRef.current = { id: sessionId, startedAt: sessionId ? Date.now() : null }
    if (assignmentId && studentId) {
      await startAssignmentSubmission({ assignmentId, studentId })
    }
  }, [finalizeSession, studentId, classId, assignmentId, unit.level, totalPairs])

  useEffect(() => {
    void openSession()
    return () => {
      void finalizeSession()
    }
  }, [openSession, finalizeSession])

  const handleCardClick = (id: number) => {
    if (isChecking || flippedIds.includes(id)) return

    const card = cards.find((item) => item.id === id)
    if (!card || card.isMatched) return

    const nextFlipped = [...flippedIds, id]
    setFlippedIds(nextFlipped)

    if (nextFlipped.length === 2) {
      setIsChecking(true)
      const [firstId, secondId] = nextFlipped
      const firstCard = cards.find((item) => item.id === firstId)
      const secondCard = cards.find((item) => item.id === secondId)
      const isMatch = firstCard && secondCard && firstCard.pairId === secondCard.pairId

      setTimeout(() => {
        setCards((prev) =>
          prev.map((item) =>
            item.id === firstId || item.id === secondId ? { ...item, isMatched: Boolean(isMatch) } : item
          )
        )

        if (isMatch) {
          setMatches((prev) => prev + 1)
        }

        setFlippedIds([])
        setIsChecking(false)
      }, 700)
    }
  }

  if (totalPairs === 0) {
    return <p className="text-center text-slate-600">No cards available for this unit yet.</p>
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6 flex items-center justify-between rounded-xl bg-pink-100 p-4 shadow-lg">
        <div className="text-xl font-bold text-purple-600">
          Matches: <span className="text-green-500">{matches}</span> / {totalPairs}
        </div>
        <Button onClick={initializeGame} className="bg-purple-500 text-white hover:bg-purple-600">
          <Shuffle className="mr-2 h-4 w-4" />
          Play Again!
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const isFlipped = card.isMatched || flippedIds.includes(card.id)
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card.id)}
              className={`relative aspect-square transform rounded-xl shadow-lg transition-transform duration-200 ${
                card.isMatched ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-105'
              }`}
            >
              <div
                className={`absolute inset-0 rounded-xl border-4 border-purple-300 bg-white p-3 ${
                  isFlipped ? '' : 'rotate-y-180'
                } transition-all duration-300`}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.text} className="h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    Missing image
                  </span>
                )}
              </div>
              {!isFlipped && (
                <div className="absolute inset-0 rounded-xl border-4 border-purple-300 bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg" />
              )}
            </button>
          )
        })}
      </div>

      {matches === totalPairs && (
        <>
          <Confetti width={typeof window === 'undefined' ? 0 : window.innerWidth} height={typeof window === 'undefined' ? 0 : window.innerHeight} recycle={false} numberOfPieces={200} />
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
              <Trophy className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
              <h3 className="mb-4 text-3xl font-bold text-blue-600">Amazing Job! 🎉</h3>
              <p className="mb-6 text-lg text-purple-600">You&apos;re a Memory Master!</p>
              <div className="mb-6 flex justify-center gap-2">
                {[...Array(3)].map((_, index) => (
                  <Star key={index} className="h-10 w-10 text-yellow-400" fill="yellow" />
                ))}
              </div>
              <Button onClick={initializeGame} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600">
                Play Again!
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
