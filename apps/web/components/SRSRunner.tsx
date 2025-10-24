'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, Repeat } from 'lucide-react'

import { Button } from '@/components/ui/button'
import ListenShadow from '@/components/ListenShadow'
import type { UnitContent } from '@/lib/content'
import { usePracticeIdentity } from '@/contexts/PracticeContext'
import { endPracticeSession, startPracticeSession } from '@/lib/practice/sessions'
import { completeAssignmentSubmission, startAssignmentSubmission } from '@/lib/practice/assignments'

interface SRSRunnerProps {
  unit: UnitContent
  audio: Record<string, string>
  images: Record<string, string>
  onProgressUpdate?: (progress: ProgressPayload) => void
}

interface CardViewModel {
  id: number
  text: string
  imageUrl?: string
  audioUrl?: string
}

export interface ProgressPayload {
  completed: number
  total: number
  mastered: number
  startedAt: number
  elapsedMs: number
  sessionComplete?: boolean
}

const FLASHCARDS_ACTIVITY = 'flashcards' as const

export default function SRSRunner({ unit, audio, images, onProgressUpdate }: SRSRunnerProps) {
  const todayCount = Math.min(10, unit.items.length)
  const { studentId, classId, assignmentId } = usePracticeIdentity()
  const sessionRef = useRef<{ id: string | null; startedAt: number | null }>({
    id: null,
    startedAt: null
  })
  const completedCountRef = useRef(0)

  const createSeededRandom = (seedString: string) => {
    let seed = 0
    for (let i = 0; i < seedString.length; i += 1) {
      seed = (seed << 5) - seed + seedString.charCodeAt(i)
      seed |= 0
    }
    return () => {
      seed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed)
      return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296
    }
  }

  const seededShuffle = <T,>(input: readonly T[], random: () => number): T[] => {
    const array = [...input]
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const baseCards = useMemo<CardViewModel[]>(() => {
    const random = createSeededRandom(`${unit.level}-${unit.slug}`)
    const shuffled = seededShuffle(unit.items, random).slice(0, todayCount)
    return shuffled.map((item) => ({
      id: item.id,
      text: item.text,
      imageUrl: images[item.imageKey],
      audioUrl: audio[item.audioKey]
    }))
  }, [unit.items, images, audio, todayCount])

  const [queue, setQueue] = useState<CardViewModel[]>(() => [...baseCards])
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set())
  const [masteredCount, setMasteredCount] = useState(0)
  const [startedAt, setStartedAt] = useState<number>(Date.now())
  const [sessionComplete, setSessionComplete] = useState(false)
  const lastProgressRef = useRef<{ completed: number; mastered: number; done: boolean } | null>(null)

  useEffect(() => {
    setQueue([...baseCards])
    setCompletedIds(new Set())
    setMasteredCount(0)
    setSessionComplete(false)
    setStartedAt(Date.now())
    lastProgressRef.current = null
  }, [baseCards])

  useEffect(() => {
    completedCountRef.current = completedIds.size
  }, [completedIds])

  const finalizeSession = useCallback(
    async ({
      durationMs,
      itemsCompleted,
      accuracy
    }: {
      durationMs?: number
      itemsCompleted?: number
      accuracy?: number
    } = {}) => {
      const info = sessionRef.current
      if (!info.id) {
        return
      }

      sessionRef.current = { id: null, startedAt: null }

      const computedDurationMs =
        typeof durationMs === 'number' && Number.isFinite(durationMs)
          ? durationMs
          : info.startedAt != null
            ? Date.now() - info.startedAt
            : undefined

      await endPracticeSession({
        sessionId: info.id,
        durationMs: computedDurationMs,
        itemsCompleted,
        accuracy,
        assignmentId: assignmentId ?? undefined
      })

      if (assignmentId && studentId) {
        await completeAssignmentSubmission({
          assignmentId,
          studentId,
          durationMs: computedDurationMs,
          accuracy,
          metrics: {
            minutes: computedDurationMs != null ? computedDurationMs / 60000 : undefined,
            cards: typeof itemsCompleted === 'number' ? itemsCompleted : undefined
          }
        })
      }
    },
    [assignmentId, studentId]
  )

  const startRemoteSession = useCallback(async () => {
    if (todayCount === 0) {
      await finalizeSession({
        itemsCompleted: completedCountRef.current
      })
      return
    }

    const previous = sessionRef.current
    if (previous.id) {
      await finalizeSession({
        durationMs: previous.startedAt != null ? Date.now() - previous.startedAt : undefined,
        itemsCompleted: completedCountRef.current
      })
    }

    const sessionId = await startPracticeSession({
      studentId,
      classId,
      assignmentId,
      level: unit.level,
      activity: FLASHCARDS_ACTIVITY
    })

    sessionRef.current = {
      id: sessionId,
      startedAt: sessionId ? Date.now() : null
    }
    if (assignmentId && studentId) {
      await startAssignmentSubmission({ assignmentId, studentId })
    }
  }, [todayCount, finalizeSession, studentId, classId, assignmentId, unit.level])

  useEffect(() => {
    void startRemoteSession()
  }, [startRemoteSession])

  useEffect(() => {
    return () => {
      const info = sessionRef.current
      if (!info.id) {
        return
      }
      void finalizeSession({
        durationMs: info.startedAt != null ? Date.now() - info.startedAt : undefined,
        itemsCompleted: completedCountRef.current
      })
    }
  }, [finalizeSession])

  const currentCard = queue[0]

  const emitProgress = useCallback(
    (completedSize: number, mastered: number, done: boolean = false) => {
      const last = lastProgressRef.current
      if (last && last.completed === completedSize && last.mastered === mastered && last.done === done) {
        return
      }
      lastProgressRef.current = { completed: completedSize, mastered, done }
      const elapsed = Date.now() - startedAt
      onProgressUpdate?.({
        completed: completedSize,
        total: todayCount,
        mastered,
        startedAt,
        elapsedMs: elapsed,
        sessionComplete: done
      })
    },
    [onProgressUpdate, todayCount, startedAt]
  )

  const handleNext = () => {
    if (!currentCard) return

    setMasteredCount((prev) => prev + 1)
    setQueue((prev) => prev.slice(1))
    setCompletedIds((prev) => {
      const next = new Set(prev)
      next.add(currentCard.id)
      return next
    })
  }

  const handleAgain = () => {
    if (!currentCard) return
    setQueue((prev) => {
      const [, ...rest] = prev
      return [...rest, currentCard]
    })
  }

  useEffect(() => {
    const completedSize = completedIds.size

    if (currentCard == null && completedSize >= todayCount && queue.length === 0) {
      if (!sessionComplete) {
        setSessionComplete(true)
        emitProgress(completedSize, masteredCount, true)
      }
      return
    }

    emitProgress(completedSize, masteredCount, false)
  }, [completedIds, queue, masteredCount, emitProgress, sessionComplete, todayCount, currentCard])

  useEffect(() => {
    if (!sessionComplete) {
      return
    }
    const info = sessionRef.current
    void finalizeSession({
      durationMs: info.startedAt != null ? Date.now() - info.startedAt : undefined,
      itemsCompleted: todayCount,
      accuracy: todayCount > 0 ? masteredCount / todayCount : undefined
    })
  }, [sessionComplete, finalizeSession, masteredCount, todayCount])

  if (todayCount === 0) {
    return <p className="text-slate-600">No cards available for this unit yet.</p>
  }

  const handleRestart = () => {
    void startRemoteSession()
    setQueue([...baseCards])
    setCompletedIds(new Set())
    setMasteredCount(0)
    setSessionComplete(false)
    setStartedAt(Date.now())
    lastProgressRef.current = null
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <BadgeCheck className="h-16 w-16 text-emerald-500" />
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Today&apos;s 10 complete!</h3>
          <p className="text-slate-600">Great work. Review any cards you marked &ldquo;Again&rdquo; for extra practice.</p>
        </div>
        <Button onClick={handleRestart} className="bg-indigo-500 text-white hover:bg-indigo-600">
          Restart session
        </Button>
      </div>
    )
  }

  if (!currentCard) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Today&apos;s 10</p>
          <h2 className="text-2xl font-bold text-slate-900">{unit.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>
            Card {Math.min(completedIds.size + 1, todayCount)} of {todayCount}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-inner">
            {currentCard.imageUrl ? (
              <img src={currentCard.imageUrl} alt={currentCard.text} className="h-full w-full object-contain p-8" />
            ) : (
              <span className="text-slate-500">Image coming soon</span>
            )}
          </div>
          <p className="mt-4 text-center text-xl font-semibold text-slate-900">{currentCard.text}</p>
        </div>

        <div className="flex-1 space-y-4">
          <ListenShadow audioUrl={currentCard.audioUrl} />

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-800">
            <p className="font-semibold">Tips</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-indigo-700/90">
              <li>Play the prompt and shadow it out loud.</li>
              <li>Use “Again” if you want to review this card later.</li>
              <li>“Next” marks the card as mastered for today.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAgain}
              variant="outline"
              className="flex-1 border-2 border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50"
            >
              <Repeat className="mr-2 h-4 w-4" />
              Again
            </Button>
            <Button onClick={handleNext} className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
