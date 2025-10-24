import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerClient } from '@/lib/supabase/server'

interface EndSessionPayload {
  sessionId?: string
  duration_s?: number
  durationS?: number
  items_completed?: number
  itemsCompleted?: number
  accuracy?: number
  assignmentId?: string | null
  endedAt?: string | number | Date
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
    const body = (await request.json()) as EndSessionPayload
    const sessionId = body.sessionId

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
    }

    const durationRaw = body.duration_s ?? body.durationS
    const itemsRaw = body.items_completed ?? body.itemsCompleted

    const updates: Record<string, unknown> = {
      ended_at: normalizeIso(body.endedAt ?? null)
    }

    if (typeof durationRaw === 'number' && Number.isFinite(durationRaw)) {
      updates.duration_s = Math.max(0, Math.round(durationRaw))
    }

    if (typeof itemsRaw === 'number' && Number.isFinite(itemsRaw)) {
      updates.items_completed = Math.max(0, Math.round(itemsRaw))
    }

    if (typeof body.accuracy === 'number' && Number.isFinite(body.accuracy)) {
      updates.accuracy = body.accuracy
    }

    if (body.assignmentId !== undefined) {
      updates.assignment_id = body.assignmentId
    }

    const client = supabaseServerClient()
    const { data, error } = await client
      .from('practice_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select('id')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
      }
      console.error('Failed to complete session:', error)
      return NextResponse.json({ error: 'Unable to complete session.' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unexpected error ending session:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
