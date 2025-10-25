'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Shuffle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { UnitContent } from '@/lib/content'
import { usePracticeIdentity } from '@/contexts/PracticeContext'
import { endPracticeSession, startPracticeSession } from '@/lib/practice/sessions'
import { completeAssignmentSubmission, startAssignmentSubmission } from '@/lib/practice/assignments'

interface TouchGameProps {
  unit: UnitContent
  audio: Record<string, string>
  images: Record<string, string>
}

interface CardOption {
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

export default function TouchGame({ unit, audio, images }: TouchGameProps) {
  const { studentId, classId, assignmentId } = usePracticeIdentity()
  const cards = useMemo<CardOption[]>(
    () =>
      unit.items.map((item) => ({
        id: item.id,
        text: item.text,
        imageUrl: images[item.imageKey],
        audioUrl: audio[item.audioKey]
      })),
    [unit.items, audio, images]
  )

  const [difficulty, setDifficulty] = useState(2)
  const [currentCard, setCurrentCard] = useState<CardOption | null>(null)
  const [options, setOptions] = useState<CardOption[]>([])
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const feedbackRef = useRef<HTMLAudioElement>(null)
  const sessionRef = useRef<{ id: string | null; startedAt: number | null }>({
    id: null,
    startedAt: null
  })
  const attemptsRef = useRef<{ total: number; correct: number }>({ total: 0, correct: 0 })

  const yesImage = images[`${unit.level}-image-bearcheck`]
  const noImage = images[`${unit.level}-image-bearx`]

  const playAudio = async (url?: string) => {
    if (!url || !audioRef.current) return
    const element = audioRef.current
    try {
      element.pause()
      const needsSrcUpdate = !element.src || !element.src.endsWith(url)
      if (needsSrcUpdate) {
        element.src = url
      }
      element.currentTime = 0
      await element.play()
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        console.error('Error playing audio', error)
      }
    }
  }

  const playFeedback = async (message: string, isCorrect: boolean) => {
    const key = `${unit.level}-voiceover-${sanitizeMessageKey(message)}`
    const url = audio[key]
    if (!url || !feedbackRef.current) return
    try {
      feedbackRef.current.pause()
      const needsSrcUpdate = !feedbackRef.current.src || !feedbackRef.current.src.endsWith(url)
      if (needsSrcUpdate) {
        feedbackRef.current.src = url
      }
      feedbackRef.current.currentTime = 0
      await feedbackRef.current.play()
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        console.error('Error playing feedback audio', error)
      }
    }
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

  const generateQuestion = () => {
    if (cards.length === 0) return
    setIsLoading(true)

    const available = shuffleArray(cards)
    const question = available[0]
    const pool = available.slice(1)

    const optionCount = Math.min(difficulty, cards.length)
    const wrongOptions = shuffleArray(pool).slice(0, optionCount - 1)
    const newOptions = shuffleArray([question, ...wrongOptions])

    setCurrentCard(question)
    setOptions(newOptions)
    setIsLoading(false)

    void playAudio(question.audioUrl)
  }

  useEffect(() => {
    generateQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, cards])

  const handleAnswer = (selectedId: number) => {
    if (!currentCard || isLoading || showFeedback) return

    const isCorrect = selectedId === currentCard.id
    setTotalQuestions((prev) => prev + 1)
    if (isCorrect) {
      setScore((prev) => prev + 1)
    }

    attemptsRef.current = {
      total: attemptsRef.current.total + 1,
      correct: attemptsRef.current.correct + (isCorrect ? 1 : 0)
    }

    const messagePool = isCorrect ? positiveMessages : negativeMessages
    const message = messagePool[Math.floor(Math.random() * messagePool.length)]
    void playFeedback(message, isCorrect)

    setTimeout(generateQuestion, 1500)
  }

  const resetGame = () => {
    setScore(0)
    setTotalQuestions(0)
    attemptsRef.current = { total: 0, correct: 0 }
    generateQuestion()
  }

  const hearAgain = () => void playAudio(currentCard?.audioUrl)

  if (cards.length === 0) {
    return <p className="text-center text-slate-600">No cards available for this unit yet.</p>
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

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-blue-100 p-4 shadow-lg md:flex-row md:items-center md:justify-between">
        <div className="text-xl font-bold text-blue-600">
          Score: <span className="text-green-500">{score}</span> / {totalQuestions}
        </div>
        <div className="flex items-center gap-2">
          {[2, 3, 4]
            .filter((value) => cards.length >= value)
            .map((value) => (
              <Button
                key={value}
                onClick={() => setDifficulty(value)}
                className={value === difficulty ? 'bg-blue-600 text-white' : 'bg-blue-300 text-white'}
              >
                Level {value - 1}
              </Button>
            ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={hearAgain} disabled={isLoading} className="bg-purple-500 text-white hover:bg-purple-600">
            Hear Again
          </Button>
          <Button onClick={resetGame} disabled={isLoading} className="bg-blue-500 text-white hover:bg-blue-600">
            <Shuffle className="mr-2 h-4 w-4" />
            New Game
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col items-center gap-8">
          <div className="relative flex aspect-square w-64 items-center justify-center overflow-hidden rounded-xl border-4 border-blue-300 bg-white shadow-lg">
            {currentCard?.imageUrl ? (
              <img src={currentCard.imageUrl} alt={currentCard.text} className="h-full w-full object-contain p-4" />
            ) : (
              <span className="text-slate-500">Missing image</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleAnswer(option.id)}
              disabled={isLoading || Boolean(showFeedback)}
              className="flex aspect-square items-center justify-center overflow-hidden rounded-full border-4 border-transparent bg-white shadow-lg transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed"
            >
              {option.imageUrl ? (
                <img src={option.imageUrl} alt={option.text} className="h-full w-full object-contain p-4" />
              ) : (
                <span className="text-sm text-slate-600">{option.text}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <audio ref={audioRef} />
      <audio ref={feedbackRef} />

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

      <div className="mt-8 flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="mb-2 text-sm font-semibold text-slate-600">Yes</p>
          {yesImage ? (
            <img src={yesImage} alt="Yes choice" className="h-24 w-24 object-contain" />
          ) : (
            <span className="text-xs text-slate-500">Missing image</span>
          )}
        </div>
        <div className="text-center">
          <p className="mb-2 text-sm font-semibold text-slate-600">No</p>
          {noImage ? (
            <img src={noImage} alt="No choice" className="h-24 w-24 object-contain" />
          ) : (
            <span className="text-xs text-slate-500">Missing image</span>
          )}
        </div>
      </div>
    </div>
  )
}
