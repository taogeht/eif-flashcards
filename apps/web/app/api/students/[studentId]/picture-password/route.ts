import { NextResponse, type NextRequest } from 'next/server'

import { supabaseServerClient } from '@/lib/supabase/server'
import { PICTURE_OPTIONS } from '@/lib/kiosk/picture-options'

interface UpdatePicturePasswordPayload {
  pictureId?: string | null
}

export async function PATCH(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const { studentId } = params
    const { pictureId } = (await request.json()) as UpdatePicturePasswordPayload

    if (!pictureId || !PICTURE_OPTIONS.some((option) => option.id === pictureId)) {
      return NextResponse.json({ error: 'Invalid picture selection.' }, { status: 400 })
    }

    const client = supabaseServerClient()
    const { error } = await client
      .from('students')
      .update({ picture_password: pictureId })
      .eq('id', studentId)

    if (error) {
      console.error('Failed to update picture password', error)
      return NextResponse.json({ error: 'Unable to update password.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unexpected error updating picture password', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 400 })
  }
}
