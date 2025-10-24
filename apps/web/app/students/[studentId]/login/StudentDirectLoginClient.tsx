'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { PICTURE_OPTIONS, getPictureOption } from '@/lib/kiosk/picture-options'
import { findAvatarPreset } from '@/lib/kiosk/avatar-presets'
import { usePracticeIdentity } from '@/contexts/PracticeContext'

interface StudentDirectLoginClientProps {
  student: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
    picturePassword: string | null
  }
  classInfo: {
    id: string
    name: string
    code: string
    levelCode: string
  }
}

const PASSWORD_OPTION_COUNT = 6

function shuffle<T>(values: readonly T[]): T[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function StudentDirectLoginClient({ student, classInfo }: StudentDirectLoginClientProps) {
  const router = useRouter()
  const { setIdentity } = usePracticeIdentity()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const presetAvatar = findAvatarPreset(student.avatarUrl)

  const options = useMemo(() => {
    if (!student.picturePassword) {
      return []
    }
    const correct = getPictureOption(student.picturePassword)
    const shuffled = shuffle(PICTURE_OPTIONS)
    const result: typeof PICTURE_OPTIONS = []
    const used = new Set<string>()
    if (correct) {
      result.push(correct)
      used.add(correct.id)
    }
    for (const option of shuffled) {
      if (result.length >= PASSWORD_OPTION_COUNT) {
        break
      }
      if (!used.has(option.id)) {
        result.push(option)
        used.add(option.id)
      }
    }
    return shuffle(result)
  }, [student.picturePassword])

  const handleSelect = async (optionId: string) => {
    if (!student.picturePassword) {
      setError('Choose your password first, then come back to login.')
      return
    }

    if (optionId !== student.picturePassword) {
      setError('Not your picture. Try again!')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/login/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: student.id,
          classId: classInfo.id
        })
      })

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`)
      }

      const data = (await response.json()) as { levelSlug?: string }
      const destination = data.levelSlug ?? classInfo.levelCode
      setIdentity({
        studentId: student.id,
        studentName: student.firstName,
        classId: classInfo.id,
        levelCode: destination.toUpperCase(),
        assignmentId: null
      })
      router.push(`/levels/${destination.toLowerCase()}`)
    } catch (loginError) {
      console.error('Direct login failed', loginError)
      setError('We could not log you in. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-10">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Welcome</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">{student.firstName}, tap your picture!</h1>
        <p className="mt-2 text-lg text-slate-600">Class {classInfo.name} · Code {classInfo.code}</p>
      </header>

      <section className="rounded-3xl bg-white/90 p-6 text-center shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <div className={`mx-auto mb-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-indigo-200 ${presetAvatar ? 'bg-gradient-to-br ' + presetAvatar.gradient : 'bg-indigo-50'} text-5xl`}>
          {presetAvatar ? (
            <span>{presetAvatar.emoji}</span>
          ) : student.avatarUrl ? (
            <Image src={student.avatarUrl} alt={student.firstName} width={112} height={112} className="h-full w-full object-cover" />
          ) : (
            <span>😊</span>
          )}
        </div>

        {student.picturePassword ? (
          <div className="grid gap-4 md:grid-cols-2">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                disabled={isSubmitting}
                className={`flex h-32 flex-col items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br ${option.gradient} text-4xl text-white shadow-lg transition-transform duration-200 hover:-translate-y-1`}
              >
                <span>{option.emoji}</span>
                <span className="mt-2 text-lg font-semibold uppercase tracking-wide drop-shadow-md">{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 px-5 py-6 text-amber-700">
            <p className="text-lg font-semibold">You need a picture password first.</p>
            <p className="mt-2 text-sm">
              Ask your teacher or visit the password page to choose a secret picture: <code className="rounded bg-amber-100 px-2 py-1 text-xs">/students/{student.id}/password</code>
            </p>
          </div>
        )}

        {error && <p className="mt-6 text-sm font-semibold text-rose-600">{error}</p>}

        <div className="mt-6">
          <Button variant="outline" onClick={() => router.push('/')} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            Back to home
          </Button>
        </div>
      </section>
    </div>
  )
}
