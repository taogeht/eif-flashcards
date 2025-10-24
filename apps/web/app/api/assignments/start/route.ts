import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerClient } from '@/lib/supabase/server'

interface StartAssignmentPayload {
  assignmentId?: string | null
  studentId?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { assignmentId, studentId } = (await request.json()) as StartAssignmentPayload

    if (!assignmentId || !studentId) {
      return NextResponse.json({ error: 'assignmentId and studentId are required.' }, { status: 400 })
    }

    const client = supabaseServerClient()

    const { data: existing, error: fetchError } = await client
      .from('assignment_submissions')
      .select('id, started_at')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (fetchError) {
      console.error('Failed to read assignment submission', fetchError)
      return NextResponse.json({ error: 'Unable to start assignment.' }, { status: 500 })
    }

    const now = new Date().toISOString()

    if (!existing) {
      const { error: insertError } = await client.from('assignment_submissions').insert({
        assignment_id: assignmentId,
        student_id: studentId,
        status: 'in_progress',
        started_at: now
      })

      if (insertError) {
        console.error('Failed to create assignment submission', insertError)
        return NextResponse.json({ error: 'Unable to start assignment.' }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    const { error: updateError } = await client
      .from('assignment_submissions')
      .update({
        status: 'in_progress',
        started_at: existing.started_at ?? now
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('Failed to update assignment submission', updateError)
      return NextResponse.json({ error: 'Unable to start assignment.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unexpected error starting assignment', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 400 })
  }
}
