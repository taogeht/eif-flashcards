'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import type { ClassLevel, LevelCode } from '@/config/types'
import { PICTURE_OPTIONS, getPictureOption } from '@/lib/kiosk/picture-options'
import { findAvatarPreset } from '@/lib/kiosk/avatar-presets'
import { usePracticeIdentity } from '@/contexts/PracticeContext'

interface StudentViewModel {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
  picturePassword?: string | null
}

interface ClassInfo {
  id: string
  name: string
  code: string
  level: ClassLevel
  levelCode: LevelCode
  termCode: string | null
}

interface ClassLoginClientProps {
  classInfo: ClassInfo
  students: StudentViewModel[]
}

const PASSWORD_GRID_SIZE = 6

const friendlyLevelLabel: Record<ClassLevel, string> = {
  Small: 'Small Class',
  Middle: 'Middle Class',
  Big: 'Big Class'
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function ClassLoginClient({ classInfo, students }: ClassLoginClientProps) {
  const router = useRouter()
  const { setIdentity } = usePracticeIdentity()
  const [selectedStudent, setSelectedStudent] = useState<StudentViewModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    const persistKioskSession = async () => {
      try {
        await fetch('/api/kiosk/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            classId: classInfo.id,
            classCode: classInfo.code,
            termCode: classInfo.termCode
          })
        })
      } catch (sessionError) {
        console.error('Unable to save kiosk session cookie', sessionError)
      }
    }

    void persistKioskSession()
  }, [classInfo.id, classInfo.code, classInfo.termCode])

  const passwordOptions = useMemo(() => {
    if (!selectedStudent?.picturePassword) {
      return []
    }

    const correctOption = getPictureOption(selectedStudent.picturePassword)
    const shuffled = shuffleArray(PICTURE_OPTIONS)
    const uniqueOptions = new Set<string>()
    const result: typeof PICTURE_OPTIONS = []

    if (correctOption) {
      result.push(correctOption)
      uniqueOptions.add(correctOption.id)
    }

    for (const option of shuffled) {
      if (uniqueOptions.size >= PASSWORD_GRID_SIZE) {
        break
      }
      if (!uniqueOptions.has(option.id)) {
        result.push(option)
        uniqueOptions.add(option.id)
      }
    }

    return shuffleArray(result)
  }, [selectedStudent])

  const handleStudentSelect = (student: StudentViewModel) => {
    setSelectedStudent(student)
    setError(null)
  }

  const handleBackToStudents = () => {
    setSelectedStudent(null)
    setError(null)
  }

  const handlePasswordSelect = async (optionId: string) => {
    if (!selectedStudent) {
      return
    }

    if (!selectedStudent.picturePassword) {
      setError('Ask your teacher to set your picture password first!')
      return
    }

    if (optionId !== selectedStudent.picturePassword) {
      setError('Oops! Try again and find your secret picture.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/login/student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          classId: classInfo.id
        })
      })

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`)
      }

      const data = (await response.json()) as { levelSlug?: string }
      const nextLevel = data.levelSlug ?? classInfo.levelCode
      setIdentity({
        studentId: selectedStudent.id,
        studentName: selectedStudent.firstName,
        classId: classInfo.id,
        levelCode: nextLevel.toUpperCase(),
        assignmentId: null
      })
      router.push(`/levels/${nextLevel.toLowerCase()}`)
    } catch (loginError) {
      console.error('Student login failed', loginError)
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      const response = await fetch('/api/kiosk/session', {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error(`Failed to sign out: ${response.status}`)
      }
      setIdentity({
        studentId: null,
        studentName: null,
        classId: null,
        levelCode: null,
        assignmentId: null
      })
      setSelectedStudent(null)
      setError(null)
      setIsSigningOut(false)
      router.push('/class')
    } catch (signOutError) {
      console.error('Unable to clear kiosk session', signOutError)
      setError('Could not sign out right now. Please try again.')
      setIsSigningOut(false)
    }
  }

  const renderAvatar = (student: StudentViewModel) => {
    const preset = findAvatarPreset(student.avatarUrl)
    if (preset) {
      return (
        <div className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br ${preset.gradient} text-5xl shadow-inner`}>
          <span>{preset.emoji}</span>
        </div>
      )
    }

    return (
      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-indigo-100 text-5xl shadow-inner">
        {student.avatarUrl ? (
          <Image
            src={student.avatarUrl}
            alt={`${student.firstName} ${student.lastName}`}
            width={128}
            height={128}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-5xl">😊</span>
        )}
      </div>
    )
  }

  const headerTitle = selectedStudent ? `Hi, ${selectedStudent.firstName}!` : `${classInfo.name}`
  const headerSubtitle = selectedStudent
    ? 'Tap your secret picture to start learning.'
    : `${friendlyLevelLabel[classInfo.level]} · Tap your name to begin`

  return ( 
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Class Kiosk</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">{headerTitle}</h1>
        <p className="mt-2 text-lg text-slate-600">{headerSubtitle}</p>
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            {isSigningOut ? 'Signing out…' : 'Sign out of this class'}
          </Button>
        </div>
      </header>

      {!selectedStudent ? (
        <section className="flex-1 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => handleStudentSelect(student)}
                className="group flex flex-col items-center gap-4 rounded-2xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 text-left shadow-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                {renderAvatar(student)}
                <div className="text-center">
                  <p className="text-xl font-semibold text-slate-900">{student.firstName}</p>
                  <p className="text-sm text-slate-500">{student.lastName}</p>
                </div>
                {!student.picturePassword && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Needs password
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-6 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBackToStudents}>
              ← Back
            </Button>
            <div className="flex items-center gap-3 rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
              <span>Class code:</span>
              <span className="font-semibold uppercase">{classInfo.code}</span>
            </div>
          </div>

          {selectedStudent.picturePassword ? (
            <div className="grid gap-4 md:grid-cols-3">
              {passwordOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePasswordSelect(option.id)}
                  disabled={isSubmitting}
                  className={`group flex h-40 flex-col items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br ${option.gradient} text-4xl text-white shadow-lg transition-transform duration-200 hover:-translate-y-1`}
                >
                  <span>{option.emoji}</span>
                  <span className="mt-2 text-lg font-semibold uppercase tracking-wide drop-shadow-md">{option.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-amber-200 bg-amber-50/80 p-8 text-center text-amber-700">
              <p className="text-xl font-semibold">This student needs a picture password.</p>
              <p>
                Scan the personal QR code or open their password page to choose a secret picture before logging in.
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/students/${selectedStudent.id}/password`)}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Set password now
              </Button>
            </div>
          )}

          {error && <p className="text-center text-sm font-semibold text-rose-600">{error}</p>}
        </section>
      )}
    </div>
  )
}
