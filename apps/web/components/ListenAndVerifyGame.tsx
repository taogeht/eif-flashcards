'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Shuffle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { UnitContent } from '@/lib/content'
import { usePracticeIdentity } from '@/contexts/PracticeContext'
import { endPracticeSession, startPracticeSession } from '@/lib/practice/sessions'
import { completeAssignmentSubmission, startAssignmentSubmission } from '@/lib/practice/assignments'

interface ListenAndVerifyGameProps {
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

const positiveMessages = [
  '🎉 Wonderful job!',
  '⭐ Excellent!',
  '🌟 Amazing work!',
  '🎯 Perfect!',
  '🏆 Great job!',
  '✨ Fantastic!'
]

const negativeMessages = [
  '😢 Try again!',
  '🎯 Almost there!',
  '💪 Keep practicing!',
  '📚 Let\'s learn together!',
  '🌱 You\'ll get it next time!',
  '✨ Don\'t give up!'
]

const sanitizeMessageKey = (message: string) =>
  message
    .replace(/[🎉⭐🌟🎯🏆✨😢💪📚🌱’']/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[!?]/g, '')

export default function ListenAndVerifyGame({ unit, audio, images }: ListenAndVerifyGameProps) {
  const { studentId, classId, assignmentId } = usePracticeIdentity()
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

  const [currentAudioCard, setCurrentAudioCard] = useState<CardViewModel | null>(null)
  const [displayedCard, setDisplayedCard] = useState<CardViewModel | null>(null)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const feedbackAudioRef = useRef<HTMLAudioElement>(null)
  const sessionRef = useRef<{ id: string | null; startedAt: number | null }>({
    id: null,
    startedAt: null
  })
  const attemptsRef = useRef<{ total: number; correct: number }>({ total: 0, correct: 0 })

  const yesImage = images[`${unit.level}-image-bearcheck`]
  const noImage = images[`${unit.level}-image-bearx`]

  const playAudio = (url?: string) => {
    if (!url || !audioRef.current) return
    audioRef.current.src = url
    audioRef.current.currentTime = 0
    audioRef.current.play().catch((error) => console.error('Unable to play audio', error))
  }

  const playFeedback = (message: string, isCorrect: boolean) => {
    const key = `${unit.level}-voiceover-${sanitizeMessageKey(message)}`
    const url = audio[key]
    if (!url || !feedbackAudioRef.current) return
    feedbackAudioRef.current.src = url
    feedbackAudioRef.current.currentTime = 0
    feedbackAudioRef.current.play().catch((error) => console.error('Failed to play feedback audio', error))
    setFeedbackMessage(message)
    setShowFeedback(isCorrect ? 'correct' : 'incorrect')
    setTimeout(() => setShowFeedback(null), 2500)
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const generateQuestion = useCallback(() => {
    if (cards.length === 0) return
    setIsLoading(true)
    setShowFeedback(null)

    const shuffled = shuffleArray(cards)
    const audioCard = shuffled[0]
    let cardToShow = audioCard

    if (cards.length > 1) {
      const showDifferent = Math.random() < 0.5
      if (showDifferent) {
        const alternatives = shuffleArray(cards.filter((card) => card.id !== audioCard.id))
        cardToShow = alternatives[0] ?? audioCard
      }
    }

    setCurrentAudioCard(audioCard)
    setDisplayedCard(cardToShow)
    setIsLoading(false)
    playAudio(audioCard.audioUrl)
  }, [cards])

  useEffect(() => {
    generateQuestion()
  }, [generateQuestion])

  const handleAnswer = (isYes: boolean) => {
    if (!currentAudioCard || !displayedCard || isLoading || showFeedback) return

    const isMatch = currentAudioCard.id === displayedCard.id
    const isCorrect = (isYes && isMatch) || (!isYes && !isMatch)

    setTotalQuestions((prev) => prev + 1)
    if (isCorrect) {
      setScore((prev) => prev + 1)
    }

    attemptsRef.current = {
      total: attemptsRef.current.total + 1,
      correct: attemptsRef.current.correct + (isCorrect ? 1 : 0)
    }

    const pool = isCorrect ? positiveMessages : negativeMessages
    const message = pool[Math.floor(Math.random() * pool.length)]
    playFeedback(message, isCorrect)

    setTimeout(() => {
      generateQuestion()
    }, 1500)
  }

  const finalizeSession = useCallback(async () => {
    const info = sessionRef.current
    if (!info.id) {
      return
    }
    sessionRef.current = { id: null, startedAt: null }
    const durationMs = info.startedAt != null ? Date.now() - info.startedAt : undefined
    const { total, correct } = attemptsRef.current
    const accuracyValue = total > 0 ? correct / total : undefined

    await endPracticeSession({
      sessionId: info.id,
      durationMs,
      itemsCompleted: total,
      accuracy: accuracyValue,
      assignmentId: assignmentId ?? undefined
    })

    if (assignmentId && studentId) {
      await completeAssignmentSubmission({
        assignmentId,
        studentId,
        durationMs,
        accuracy: accuracyValue,
        metrics: {
          minutes: durationMs != null ? durationMs / 60000 : undefined,
          cards: total
        }
      })
    }
  }, [assignmentId, studentId])

  const openSession = useCallback(async () => {
    if (sessionRef.current.id) {
      await finalizeSession()
    }
    if (cards.length === 0) {
      sessionRef.current = { id: null, startedAt: null }
      attemptsRef.current = { total: 0, correct: 0 }
      return
    }
    attemptsRef.current = { total: 0, correct: 0 }
    const sessionId = await startPracticeSession({
      studentId,
      classId,
      assignmentId,
      level: unit.level,
      activity: 'touch_listen'
    })
    sessionRef.current = { id: sessionId, startedAt: sessionId ? Date.now() : null }
    if (assignmentId && studentId) {
      await startAssignmentSubmission({ assignmentId, studentId })
    }
  }, [finalizeSession, studentId, classId, assignmentId, unit.level, cards.length])

  useEffect(() => {
    void openSession()
    return () => {
      void finalizeSession()
    }
  }, [openSession, finalizeSession])

  const resetGame = () => {
    setScore(0)
    setTotalQuestions(0)
    attemptsRef.current = { total: 0, correct: 0 }
    generateQuestion()
  }

  if (!displayedCard || cards.length === 0) {
    return <p className="text-center text-slate-600">No cards available for this unit yet.</p>
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between rounded-xl bg-blue-100 p-4 shadow-lg">
        <div className="text-xl font-bold text-blue-600">
          Score: <span className="text-green-500">{score}</span> / {totalQuestions}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => playAudio(currentAudioCard?.audioUrl)} disabled={isLoading} className="bg-purple-500 text-white hover:bg-purple-600">
            <Play className="mr-2 h-4 w-4" />
            Hear Again
          </Button>
          <Button onClick={resetGame} disabled={isLoading} className="bg-blue-500 text-white hover:bg-blue-600">
            <Shuffle className="mr-2 h-4 w-4" />
            New Game
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative aspect-square w-64 overflow-hidden rounded-xl border-4 border-blue-300 bg-white shadow-lg">
          {displayedCard.imageUrl ? (
            <img src={displayedCard.imageUrl} alt={displayedCard.text} className="h-full w-full object-contain p-4" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-slate-500">Missing image</span>
          )}
        </div>

        <div className="flex gap-12">
          <Button
            onClick={() => handleAnswer(true)}
            disabled={isLoading || Boolean(showFeedback)}
            className="flex h-32 w-32 items-center justify-center rounded-full bg-transparent p-0 hover:bg-transparent"
          >
            {yesImage ? (
              <img src={yesImage} alt="Yes" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-sm text-slate-600">Yes</span>
            )}
          </Button>
          <Button
            onClick={() => handleAnswer(false)}
            disabled={isLoading || Boolean(showFeedback)}
            className="flex h-32 w-32 items-center justify-center rounded-full bg-transparent p-0 hover:bg-transparent"
          >
            {noImage ? (
              <img src={noImage} alt="No" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-sm text-slate-600">No</span>
            )}
          </Button>
        </div>
      </div>

      <audio ref={audioRef} />
      <audio ref={feedbackAudioRef} />

      {showFeedback && feedbackMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`rounded-2xl p-8 text-4xl font-bold text-white shadow-2xl transition-all duration-300 ${
              showFeedback === 'correct' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {feedbackMessage}
          </div>
        </div>
      )}
    </div>
  )
}
