import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerClient } from '@/lib/supabase/server'

interface CompleteAssignmentPayload {
  assignmentId?: string | null
  studentId?: string | null
  durationMs?: number | null
  accuracy?: number | null
  metrics?: {
    minutes?: number | null
    rounds?: number | null
    cards?: number | null
  }
}

function meetsTarget(
  target: Record<string, unknown> | null | undefined,
  stats: { minutes: number; rounds: number; cards: number }
) {
  if (!target || typeof target !== 'object') {
    return false
  }
  const minutesTarget = Number((target as Record<string, unknown>).minutes)
  if (!Number.isNaN(minutesTarget) && minutesTarget > 0) {
    return stats.minutes >= minutesTarget
  }
  const roundsTarget = Number((target as Record<string, unknown>).rounds)
  if (!Number.isNaN(roundsTarget) && roundsTarget > 0) {
    return stats.rounds >= roundsTarget
  }
  const cardsTarget = Number((target as Record<string, unknown>).cards)
  if (!Number.isNaN(cardsTarget) && cardsTarget > 0) {
    return stats.cards >= cardsTarget
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const { assignmentId, studentId, durationMs, accuracy, metrics } =
      (await request.json()) as CompleteAssignmentPayload

    if (!assignmentId || !studentId) {
      return NextResponse.json({ error: 'assignmentId and studentId are required.' }, { status: 400 })
    }

    const client = supabaseServerClient()

    const [{ data: assignment, error: assignmentError }, { data: submission, error: submissionError }] =
      await Promise.all([
        client
          .from('assignments')
          .select('id, target, due_at')
          .eq('id', assignmentId)
          .maybeSingle(),
        client
          .from('assignment_submissions')
          .select('id, time_spent_s, status, started_at')
          .eq('assignment_id', assignmentId)
          .eq('student_id', studentId)
          .maybeSingle()
      ])

    if (assignmentError) {
      console.error('Failed to load assignment', assignmentError)
      return NextResponse.json({ error: 'Unable to review assignment.' }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 })
    }

    if (submissionError) {
      console.error('Failed to load assignment submission', submissionError)
      return NextResponse.json({ error: 'Unable to review assignment.' }, { status: 500 })
    }

    const effectiveDurationMs = typeof durationMs === 'number' && Number.isFinite(durationMs) ? durationMs : 0
    const durationSeconds = Math.max(0, Math.round(effectiveDurationMs / 1000))
    const minutesPracticed =
      typeof metrics?.minutes === 'number' && Number.isFinite(metrics.minutes)
        ? Math.max(0, metrics.minutes)
        : durationSeconds / 60
    const roundsCompleted =
      typeof metrics?.rounds === 'number' && Number.isFinite(metrics.rounds) ? Math.max(0, metrics.rounds) : 0
    const cardsCompleted =
      typeof metrics?.cards === 'number' && Number.isFinite(metrics.cards) ? Math.max(0, metrics.cards) : 0

    const achieved = meetsTarget(assignment.target ?? {}, {
      minutes: minutesPracticed,
      rounds: roundsCompleted,
      cards: cardsCompleted
    })

    const now = new Date()
    const isLate = assignment.due_at ? now.toISOString() > assignment.due_at : false
    const nextStatus = achieved ? (isLate ? 'late' : 'completed') : 'in_progress'

    const baseUpdate = {
      status: nextStatus,
      time_spent_s: Math.max(0, (submission?.time_spent_s ?? 0) + durationSeconds),
      accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
      completed_at: achieved ? now.toISOString() : null,
      started_at: submission?.started_at ?? now.toISOString()
    }

    if (!submission) {
      const { error: insertError } = await client.from('assignment_submissions').insert({
        assignment_id: assignmentId,
        student_id: studentId,
        ...baseUpdate
      })

      if (insertError) {
        console.error('Failed to insert assignment submission', insertError)
        return NextResponse.json({ error: 'Unable to update assignment.' }, { status: 500 })
      }
    } else {
      const { error: updateError } = await client
        .from('assignment_submissions')
        .update(baseUpdate)
        .eq('id', submission.id)

      if (updateError) {
        console.error('Failed to update assignment submission', updateError)
        return NextResponse.json({ error: 'Unable to update assignment.' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, completed: achieved })
  } catch (error) {
    console.error('Unexpected error completing assignment', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 400 })
  }
}
