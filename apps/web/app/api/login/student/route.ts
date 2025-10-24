import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerClient } from '@/lib/supabase/server'
import { levelForClass } from '@/lib/levels'
import type { ClassLevel } from '@/config/types'

interface StudentLoginPayload {
  studentId?: string | null
  classId?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, classId } = (await request.json()) as StudentLoginPayload

    if (!studentId || !classId) {
      return NextResponse.json({ error: 'studentId and classId are required.' }, { status: 400 })
    }

    const client = supabaseServerClient()

    const [{ data: student, error: studentError }, { data: classRow, error: classError }] = await Promise.all([
      client.from('students').select('id, first_name, last_name, picture_password').eq('id', studentId).maybeSingle(),
      client.from('classes').select('id, level, term_id').eq('id', classId).maybeSingle()
    ])

    if (studentError) {
      console.error('Unable to load student', studentError)
      return NextResponse.json({ error: 'Unable to login student.' }, { status: 500 })
    }

    if (classError) {
      console.error('Unable to load class', classError)
      return NextResponse.json({ error: 'Unable to login student.' }, { status: 500 })
    }

    if (!student || !classRow) {
      return NextResponse.json({ error: 'Student or class not found.' }, { status: 404 })
    }

    const classLevel = classRow.level as ClassLevel

    let termCode: string | null = null
    if (classRow.term_id) {
      const { data: termRow, error: termError } = await client.from('terms').select('code').eq('id', classRow.term_id).maybeSingle()
      if (termError) {
        console.error('Unable to load term', termError)
      }
      termCode = termRow?.code ?? null
    }

    const levelCode = levelForClass(classLevel, termCode)
    const response = NextResponse.json({ ok: true, levelSlug: levelCode })

    const cookieOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    }

    response.cookies.set('eif_student_id', student.id, cookieOptions)
    response.cookies.set('eif_class_id', classRow.id, cookieOptions)
    response.cookies.set('eif_student_name', student.first_name, cookieOptions)
    response.cookies.set('eif_level_code', levelCode, cookieOptions)

    return response
  } catch (error) {
    console.error('Unexpected error logging in student', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 400 })
  }
}
