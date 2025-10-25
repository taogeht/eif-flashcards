'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Brain, Puzzle, FlashlightIcon as FlashCard, Hand, Volume2 as VolumeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import FlashcardGrid from '@/components/FlashcardGrid'
import MatchingGame from '@/components/MatchingGame'
import MemoryGame from '@/components/MemoryGame'
import TouchGame from '@/components/TouchGame'
import ListenAndVerifyGame from '@/components/ListenAndVerifyGame'
import { usePracticeIdentity } from '@/contexts/PracticeContext'
import { startAssignmentSubmission } from '@/lib/practice/assignments'
import type { LevelCode } from '@/config/types'
import type { UnitContent } from '@/lib/content'

const activities = [
  {
    id: 'flashcards',
    title: 'Flashcard Review',
    description: 'Review flashcards related to the song',
    icon: <FlashCard className="h-8 w-8" />
  },
  {
    id: 'memory',
    title: 'Memory Game',
    description: 'Match pairs of cards to test your memory',
    icon: <Brain className="h-8 w-8" />
  },
  {
    id: 'matching',
    title: 'Matching Game',
    description: 'Connect related images or words',
    icon: <Puzzle className="h-8 w-8" />
  },
  {
    id: 'touch',
    title: 'Touch Game',
    description: 'Listen and touch the correct picture',
    icon: <Hand className="h-8 w-8" />
  },
  {
    id: 'listen-verify',
    title: 'Listen and Verify',
    description: 'Listen to the word and verify if it matches the picture',
    icon: <VolumeIcon className="h-8 w-8" />
  }
] as const

type ActivityId = (typeof activities)[number]['id']

interface ActivityStatus {
  assigned: boolean
  timeMs: number
}

interface ActivityContentProps {
  level: LevelCode
  unit: UnitContent
  audio: Record<string, string>
  images: Record<string, string>
  assignmentId?: string | null
  assignmentActivity?: string | null
}

const assignmentActivityMap: Record<string, ActivityId> = {
  flashcards: 'flashcards',
  memory_match: 'memory',
  touch_listen: 'touch'
}

export default function ActivityContent({
  level,
  unit,
  audio,
  images,
  assignmentId,
  assignmentActivity
}: ActivityContentProps) {
  const { studentId, assignmentId: activeAssignmentId, setIdentity } = usePracticeIdentity()
  const [selectedActivity, setSelectedActivity] = useState<ActivityId | null>(null)
  const [teacherMode, setTeacherMode] = useState(false)
  const [activityState, setActivityState] = useState<Record<ActivityId, ActivityStatus>>(() => {
    const initial: Record<ActivityId, ActivityStatus> = {} as Record<ActivityId, ActivityStatus>
    activities.forEach((activity) => {
      initial[activity.id] = { assigned: false, timeMs: 0 }
    })
    return initial
  })
  const trackerRef = useRef<{ id: ActivityId | null; startedAt: number | null }>({
    id: null,
    startedAt: null
  })
  const [activeTimer, setActiveTimer] = useState<{ id: ActivityId | null; startedAt: number | null }>({
    id: null,
    startedAt: null
  })
  const [now, setNow] = useState(Date.now())

  const preferredActivity = assignmentActivity ? assignmentActivityMap[assignmentActivity.toLowerCase()] ?? null : null
  const assignedActivityLabel = preferredActivity
    ? activities.find((activity) => activity.id === preferredActivity)?.title ?? 'Assigned activity'
    : 'Assigned activity'

  useEffect(() => {
    if (assignmentId && preferredActivity) {
      setActivityState((prev) => {
        const current = prev[preferredActivity] ?? { assigned: false, timeMs: 0 }
        if (current.assigned) {
          return prev
        }
        return {
          ...prev,
          [preferredActivity]: {
            ...current,
            assigned: true
          }
        }
      })
    }
  }, [assignmentId, preferredActivity])

  useEffect(() => {
    if (assignmentId && assignmentId !== activeAssignmentId) {
      setIdentity({ assignmentId })
    }
    if (!assignmentId && activeAssignmentId) {
      setIdentity({ assignmentId: null })
    }
  }, [assignmentId, activeAssignmentId, setIdentity])

  const recordElapsed = useCallback(() => {
    const { id, startedAt } = trackerRef.current
    if (!id || startedAt == null) {
      return
    }

    const elapsed = Date.now() - startedAt
    setActivityState((prev) => {
      const current = prev[id] ?? { assigned: false, timeMs: 0 }
      return {
        ...prev,
        [id]: {
          ...current,
          timeMs: current.timeMs + elapsed
        }
      }
    })
    trackerRef.current = { id, startedAt: null }
    setActiveTimer({ id, startedAt: null })
  }, [])

  useEffect(() => {
    return () => {
      recordElapsed()
      trackerRef.current = { id: null, startedAt: null }
      setActiveTimer({ id: null, startedAt: null })
    }
  }, [recordElapsed])

  useEffect(() => {
    if (!activeTimer.id || activeTimer.startedAt == null) {
      return
    }
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const handleToggleAssigned = (activityId: ActivityId) => {
    setActivityState((prev) => {
      const current = prev[activityId] ?? { assigned: false, timeMs: 0 }
      return {
        ...prev,
        [activityId]: {
          ...current,
          assigned: !current.assigned
        }
      }
    })
  }

  const handleStartActivity = (activityId: ActivityId) => {
    recordElapsed()
    const startedAt = Date.now()
    trackerRef.current = { id: activityId, startedAt }
    setActiveTimer({ id: activityId, startedAt })
    setSelectedActivity(activityId)
  }

  const handleStartAssignment = () => {
    if (preferredActivity) {
      handleStartActivity(preferredActivity)
    }
    if (assignmentId) {
      setIdentity({ assignmentId })
    }
    void startAssignmentSubmission({ assignmentId, studentId })
  }

  const handleExitActivity = () => {
    recordElapsed()
    trackerRef.current = { id: null, startedAt: null }
    setActiveTimer({ id: null, startedAt: null })
    setSelectedActivity(null)
  }

  const formatDuration = useCallback((ms: number) => {
    if (ms <= 0) return '0m 00s'
    const totalSeconds = Math.round(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }, [])

  const totalTimeMs = useMemo(() => {
    const stored = Object.values(activityState).reduce((sum, status) => sum + (status?.timeMs ?? 0), 0)
    if (activeTimer.id && activeTimer.startedAt != null) {
      return stored + (now - activeTimer.startedAt)
    }
    return stored
  }, [activityState, activeTimer, now])

  const getActivityTime = useCallback(
    (activityId: ActivityId) => {
      const base = activityState[activityId]?.timeMs ?? 0
      if (activeTimer.id === activityId && activeTimer.startedAt != null) {
        return base + (now - activeTimer.startedAt)
      }
      return base
    },
    [activityState, activeTimer, now]
  )

  const renderActivity = () => {
    if (!selectedActivity) return null

    const commonProps = {
      unit,
      audio,
      images
    }

    switch (selectedActivity) {
      case 'flashcards':
        return <FlashcardGrid {...commonProps} />
      case 'matching':
        return <MatchingGame {...commonProps} />
      case 'memory':
        return <MemoryGame {...commonProps} />
      case 'touch':
        return <TouchGame {...commonProps} />
      case 'listen-verify':
        return <ListenAndVerifyGame {...commonProps} />
      default:
        return null
    }
  }

  const activeActivityState = selectedActivity ? activityState[selectedActivity] : null
  const activeActivityTimeMs = useMemo(() => {
    if (!selectedActivity) return 0
    return getActivityTime(selectedActivity)
  }, [getActivityTime, selectedActivity])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href={`/levels/${level.toLowerCase()}`} passHref>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lessons
        </Button>
      </Link>

      <h2 className="mb-2 text-3xl font-bold text-slate-900">{unit.title}</h2>
      <p className="mb-8 text-slate-600">
        Pick an activity type to practice the words from this unit. Your progress resets each time you return here.
      </p>

      {assignmentId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Assignment ready</p>
            <p className="text-sm text-emerald-800">
              You&apos;re assigned: <span className="font-semibold">{assignedActivityLabel}</span>
            </p>
          </div>
          <Button onClick={handleStartAssignment} className="bg-emerald-500 text-white hover:bg-emerald-600">
            Start assignment
          </Button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-50 bg-indigo-50/60 p-4">
        <div className="text-sm text-indigo-700">
          Track assignments and see how much time students spend in this session. Totals clear when you leave the page.
        </div>
        <Button variant="outline" onClick={() => setTeacherMode((prev) => !prev)}>
          {teacherMode ? 'Hide teacher tools' : 'Show teacher tools'}
        </Button>
      </div>

      {teacherMode && (
        <div className="mb-8 rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Teacher tools</h3>
              <p className="text-sm text-amber-700">Assign activities and monitor today&apos;s time on task.</p>
            </div>
            <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-amber-700">
              Total time: {formatDuration(totalTimeMs)}
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {activities.map((activity) => {
              const status = activityState[activity.id]
              const isAssigned = status?.assigned ?? false
              return (
                <li
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700"
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      checked={isAssigned}
                      onChange={() => handleToggleAssigned(activity.id)}
                    />
                    <span>{activity.title}</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {isAssigned && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">Assigned</span>
                    )}
                    <span>Time today: {formatDuration(getActivityTime(activity.id))}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {selectedActivity ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={handleExitActivity}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Activities
            </Button>
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
              Time logged this session: {formatDuration(activeActivityTimeMs)}
            </div>
          </div>
          {renderActivity()}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {activities.map((activity) => (
            <Card key={activity.id} className="h-full border-indigo-100 shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-4">
                    {activity.icon}
                    {activity.title}
                  </CardTitle>
                  {activityState[activity.id]?.assigned && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                      Assigned
                    </span>
                  )}
                </div>
                <CardDescription>{activity.description}</CardDescription>
                <div className="mt-3 text-xs text-slate-500">
                  Time today: {formatDuration(getActivityTime(activity.id))}
                </div>
                <Button className="mt-4" onClick={() => handleStartActivity(activity.id)}>
                  Start Activity
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
