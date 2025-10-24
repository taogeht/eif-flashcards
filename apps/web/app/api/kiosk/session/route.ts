import { NextResponse, type NextRequest } from 'next/server'

interface KioskSessionPayload {
  classId?: string | null
  classCode?: string | null
  termCode?: string | null
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(request: NextRequest) {
  const { classId, classCode, termCode } = (await request.json()) as KioskSessionPayload

  if (!classId || !classCode) {
    return NextResponse.json({ error: 'classId and classCode are required.' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })

  const options = { path: '/', maxAge: COOKIE_MAX_AGE }

  response.cookies.set('eif_class_id', classId, options)
  response.cookies.set('eif_class_code', classCode, options)
  response.cookies.set('eif_last_class_code', classCode, options)

  if (termCode) {
    response.cookies.set('eif_term_code', termCode, options)
  }

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set('eif_class_id', '', { path: '/', maxAge: 0 })
  response.cookies.set('eif_class_code', '', { path: '/', maxAge: 0 })
  response.cookies.set('eif_term_code', '', { path: '/', maxAge: 0 })
  response.cookies.set('eif_student_id', '', { path: '/', maxAge: 0 })
  response.cookies.set('eif_student_name', '', { path: '/', maxAge: 0 })
  response.cookies.set('eif_level_code', '', { path: '/', maxAge: 0 })
  response.cookies.set('eif_assignment_id', '', { path: '/', maxAge: 0 })

  return response
}
