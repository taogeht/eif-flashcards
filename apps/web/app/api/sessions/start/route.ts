import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerClient } from '@/lib/supabase/server'

const ALLOWED_LEVELS = new Set(['1A', '1B', '2A', '2B', '3A', '3B'])
const ALLOWED_ACTIVITIES = new Set(['flashcards', 'memory_match', 'touch_listen'])

interface StartSessionPayload {
  studentId?: string | null
  classId?: string | null
  level: string
  activity: string
  assignmentId?: string | null
  startedAt?: string | number | Date
}

const normalizeIso = (value?: string | number | Date | null) => {
  if (value == null) {
    return new Date().toISOString()
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value')
  }
  return date.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartSessionPayload
    const level = body.level?.toUpperCase()
    const activity = body.activity?.toLowerCase()

    if (!level || !ALLOWED_LEVELS.has(level)) {
      return NextResponse.json({ error: 'Invalid or missing level.' }, { status: 400 })
    }

    if (!activity || !ALLOWED_ACTIVITIES.has(activity)) {
      return NextResponse.json({ error: 'Invalid or missing activity.' }, { status: 400 })
    }

    const client = supabaseServerClient()
    const payload = {
      student_id: body.studentId ?? null,
      class_id: body.classId ?? null,
      assignment_id: body.assignmentId ?? null,
      level,
      activity,
      started_at: normalizeIso(body.startedAt)
    }

    const { data, error } = await client
      .from('practice_sessions')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('Failed to start session:', error)
      return NextResponse.json({ error: 'Unable to start session.' }, { status: 500 })
    }

    return NextResponse.json({ sessionId: data.id })
  } catch (error) {
    console.error('Unexpected error starting session:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
