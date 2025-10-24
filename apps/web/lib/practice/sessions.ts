'use client'

type PracticeActivity = 'flashcards' | 'memory_match' | 'touch_listen'

interface BaseSessionPayload {
  studentId?: string | null
  classId?: string | null
  assignmentId?: string | null
  level: string
  activity: PracticeActivity
}

export interface StartPracticeSessionOptions extends BaseSessionPayload {
  startedAt?: string | number | Date
}

export interface EndPracticeSessionOptions {
  sessionId?: string | null
  durationMs?: number
  itemsCompleted?: number
  accuracy?: number
  assignmentId?: string | null
  endedAt?: string | number | Date
}

const toJson = (value: unknown) => JSON.stringify(value)

export async function startPracticeSession(options: StartPracticeSessionOptions) {
  try {
    const response = await fetch('/api/sessions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: toJson({
        studentId: options.studentId ?? null,
        classId: options.classId ?? null,
        assignmentId: options.assignmentId ?? null,
        level: options.level,
        activity: options.activity,
        startedAt: options.startedAt
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to start session (${response.status})`)
    }

    const data = (await response.json()) as { sessionId?: string }
    return data.sessionId ?? null
  } catch (error) {
    console.error('Unable to start practice session', error)
    return null
  }
}

export async function endPracticeSession({
  sessionId,
  durationMs,
  itemsCompleted,
  accuracy,
  assignmentId,
  endedAt
}: EndPracticeSessionOptions) {
  if (!sessionId) {
    return
  }

  const payload: Record<string, unknown> = {
    sessionId
  }

  if (typeof durationMs === 'number' && Number.isFinite(durationMs)) {
    payload.duration_s = Math.max(0, Math.round(durationMs / 1000))
  }

  if (typeof itemsCompleted === 'number' && Number.isFinite(itemsCompleted)) {
    payload.items_completed = Math.max(0, Math.round(itemsCompleted))
  }

  if (typeof accuracy === 'number' && Number.isFinite(accuracy)) {
    payload.accuracy = accuracy
  }

  if (assignmentId !== undefined) {
    payload.assignmentId = assignmentId
  }

  if (endedAt !== undefined) {
    payload.endedAt = endedAt
  }

  try {
    await fetch('/api/sessions/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: toJson(payload)
    })
  } catch (error) {
    console.error('Unable to finish practice session', error)
  }
}

export type { PracticeActivity }
