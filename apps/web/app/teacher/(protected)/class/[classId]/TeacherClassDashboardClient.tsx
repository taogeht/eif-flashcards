'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Clock, Target, Award, Plus, UserMinus } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { PICTURE_OPTIONS } from '@/lib/kiosk/picture-options'
import type { AvatarPresetId } from '@/lib/kiosk/avatar-presets'
import { AVATAR_PRESETS, buildPresetValue } from '@/lib/kiosk/avatar-presets'
import { cn } from '@/lib/utils'

interface ClassInfo {
  id: string
  name: string
  level: string
  code: string
  levelCode: string
  termCode: string | null
  schoolId: string | null
}

interface SummaryData {
  minutes: number
  sessions: number
  activeStudents: number
  avgAccuracy: number | null
}

interface StudentSummary {
  id: string
  name: string
  firstName: string
  avatarUrl?: string | null
  minutes: number
  sessions: number
  items: number
  accuracy: number | null
}

interface AssignmentSummary {
  id: string
  title: string
  activity: string
  level: string | null
  target: Record<string, unknown>
  dueAt: string | null
  submissions: {
    id: string
    studentId: string | null
    status: string | null
    timeSpent: number
    completedAt: string | null
  }[]
  completedCount: number
  inProgressCount: number
  totalStudents: number
}

interface RecentSessionSummary {
  id: string
  studentName: string
  activity: string
  minutes: number
  startedAt: string
}

interface TeacherClassDashboardProps {
  classInfo: ClassInfo
  rangeDays: number
  summary: SummaryData
  students: StudentSummary[]
  assignments: AssignmentSummary[]
  recentSessions: RecentSessionSummary[]
}

const activityLabels: Record<string, string> = {
  flashcards: 'Flashcards',
  memory_match: 'Memory Match',
  touch_listen: 'Touch & Listen'
}

const formatMinutes = (minutes: number) => `${minutes} min`

const formatDate = (value: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return value
  }
}

const formatPercent = (value: number | null) =>
  value != null ? `${Math.round(value * 100)}%` : '—'

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

type AddStudentMode = 'new' | 'existing'

interface StudentSearchResult {
  id: string
  firstName: string
  lastName: string | null
  avatarUrl?: string | null
}

function AddStudentDialog({ classId, schoolId }: { classId: string; schoolId: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AddStudentMode>('new')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarPreset, setAvatarPreset] = useState<AvatarPresetId>('boy')
  const [picturePassword, setPicturePassword] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const resetState = () => {
    setMode('new')
    setIsSubmitting(false)
    setError(null)
    setFirstName('')
    setLastName('')
    setAvatarPreset('boy')
    setPicturePassword(null)
    setSearchTerm('')
    setSearchResults([])
    setSelectedStudentId(null)
    setIsSearching(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      setError(null)

      let payload: Record<string, unknown>
      if (mode === 'existing') {
        if (!selectedStudentId) {
          setError('Choose a student to add from the list.')
          setIsSubmitting(false)
          return
        }
        payload = { studentId: selectedStudentId }
      } else {
        payload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatarUrl: buildPresetValue(avatarPreset),
          picturePassword
        }
      }

      const response = await fetch(`/api/teacher/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? `Request failed with status ${response.status}`)
      }

      handleOpenChange(false)
      router.refresh()
    } catch (submitError) {
      console.error('Unable to add student', submitError)
      const message = submitError instanceof Error ? submitError.message : 'Unable to add student'
      setError(message)
      setIsSubmitting(false)
    }
  }

  const disableSubmit =
    isSubmitting ||
    (mode === 'new' ? firstName.trim().length === 0 : !selectedStudentId)

  useEffect(() => {
    if (mode !== 'existing') {
      return
    }

    const term = searchTerm.trim()
    if (term.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true)
        const params = new URLSearchParams({ q: term })
        const response = await fetch(
          `/api/teacher/classes/${classId}/students/search?${params.toString()}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          const data = (await response.json()) as { error?: string }
          throw new Error(data.error ?? `Search failed with status ${response.status}`)
        }

        const data = (await response.json()) as { students: StudentSearchResult[] }
        setSearchResults(data.students ?? [])
        setError(null)
        setIsSearching(false)
      } catch (searchError) {
        if ((searchError as Error).name === 'AbortError') {
          return
        }
        console.error('Unable to search students', searchError)
        setIsSearching(false)
        setError(
          searchError instanceof Error ? searchError.message : 'Unable to search students right now.'
        )
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timeout)
      setIsSearching(false)
    }
  }, [classId, mode, searchTerm])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="inline-flex items-center gap-2 bg-indigo-500 text-white hover:bg-indigo-600">
          <Plus className="h-4 w-4" />
          Add student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add student to this class</DialogTitle>
          <DialogDescription>Invite a new student or attach an existing one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('new')
                setError(null)
              }}
              className={cn(
                'flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                mode === 'new'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
              )}
            >
              Create new student
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('existing')
                setError(null)
                setSearchTerm('')
                setSearchResults([])
                setSelectedStudentId(null)
              }}
              className={cn(
                'flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                mode === 'existing'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
              )}
            >
              Add existing student
            </button>
          </div>

          {mode === 'new' ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="new-first-name" className="text-sm font-semibold text-slate-700">
                  First name<span className="text-rose-500">*</span>
                </label>
                <input
                  id="new-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Avery"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="new-last-name" className="text-sm font-semibold text-slate-700">
                  Last name
                </label>
                <input
                  id="new-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Park"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Choose an avatar</p>
                <div className="grid grid-cols-2 gap-3">
                  {AVATAR_PRESETS.map((preset) => {
                    const isActive = avatarPreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarPreset(preset.id)}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 text-sm font-semibold shadow-sm transition',
                          isActive
                            ? 'border-indigo-400 bg-white text-indigo-700 shadow'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200'
                        )}
                      >
                        <span className="mb-1 text-2xl">{preset.emoji}</span>
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="new-picture-password" className="text-sm font-semibold text-slate-700">
                  Picture password
                </label>
                <select
                  id="new-picture-password"
                  value={picturePassword ?? ''}
                  onChange={(event) => setPicturePassword(event.target.value || null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Choose later</option>
                  {PICTURE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="existing-student-search" className="text-sm font-semibold text-slate-700">
                Search students<span className="text-rose-500">*</span>
              </label>
              <input
                id="existing-student-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Type at least 2 letters of a first or last name"
              />
              {schoolId && (
                <p className="text-xs text-slate-500">
                  Showing students already linked to this school. Create a new student if you don’t see them.
                </p>
              )}
              <div className="rounded-2xl border border-slate-200 bg-white/70">
                {isSearching && (
                  <p className="px-4 py-3 text-sm text-slate-500">Searching students…</p>
                )}
                {!isSearching && searchTerm.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    No students found. Try a different name or create a new student.
                  </p>
                )}
                <ul className="divide-y divide-slate-200">
                  {searchResults.map((student) => {
                    const fullName = `${student.firstName} ${student.lastName ?? ''}`.trim()
                    const isActive = student.id === selectedStudentId
                    return (
                      <li key={student.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id)
                            setError(null)
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition',
                            isActive
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'hover:bg-indigo-50 text-slate-700'
                          )}
                        >
                          <span>{fullName}</span>
                          {isActive && <span className="text-xs font-semibold uppercase">Selected</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={disableSubmit}
              className="inline-flex items-center justify-center bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Saving…' : 'Save student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StudentRosterRow({ student, classId }: { student: StudentSummary; classId: string }) {
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState(false)
  const handleRemove = async () => {
    if (isRemoving) return
    const confirmed = window.confirm(`Remove ${student.name} from this class?`)
    if (!confirmed) return

    try {
      setIsRemoving(true)
      const response = await fetch(`/api/teacher/classes/${classId}/students/${student.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? `Failed with status ${response.status}`)
      }

      router.refresh()
    } catch (removeError) {
      console.error('Unable to remove student', removeError)
      alert(removeError instanceof Error ? removeError.message : 'Unable to remove student right now.')
      setIsRemoving(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{student.name}</p>
        <p className="text-xs text-slate-500">
          {formatMinutes(student.minutes)} · {student.sessions} sessions · {student.items} items
        </p>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleRemove}
        disabled={isRemoving}
        className="inline-flex items-center gap-2"
      >
        <UserMinus className="h-4 w-4" />
        {isRemoving ? 'Removing…' : 'Remove'}
      </Button>
    </li>
  )
}

const metricCards = (
  summary: SummaryData
): Array<{ label: string; value: string; icon: ReactNode; description: string }> => [
  {
    label: 'Minutes Practiced',
    value: `${summary.minutes}`,
    icon: <Clock className="h-5 w-5 text-indigo-500" />,
    description: 'Total in selected window'
  },
  {
    label: 'Active Students',
    value: `${summary.activeStudents}`,
    icon: <Users className="h-5 w-5 text-indigo-500" />,
    description: 'Reached at least one session'
  },
  {
    label: 'Sessions Logged',
    value: `${summary.sessions}`,
    icon: <Target className="h-5 w-5 text-indigo-500" />,
    description: 'Across all activities'
  },
  {
    label: 'Avg. Accuracy',
    value: summary.avgAccuracy != null ? `${Math.round(summary.avgAccuracy * 100)}%` : '—',
    icon: <Award className="h-5 w-5 text-indigo-500" />,
    description: 'Touch & verify results'
  }
]

export default function TeacherClassDashboard({
  classInfo,
  rangeDays,
  summary,
  students,
  assignments,
  recentSessions
}: TeacherClassDashboardProps) {
  const topStudents = useMemo(
    () => [...students].sort((a, b) => b.minutes - a.minutes).slice(0, 5),
    [students]
  )

  const rosterStudents = useMemo(
    () => [...students].sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [students]
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Teacher Dashboard</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">{classInfo.name}</h1>
        <p className="mt-2 text-slate-600">
          Level {classInfo.levelCode} · Code {classInfo.code}
          {classInfo.termCode ? ` · Term ${classInfo.termCode}` : ''}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-indigo-400">Last {rangeDays} days</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards(summary).map((card) => (
          <Card key={card.label} className="border-indigo-100">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-sm font-semibold text-indigo-500">
                {card.icon}
                {card.label}
              </CardTitle>
              <div className="text-3xl font-bold text-slate-900">{card.value}</div>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-indigo-100">
          <CardHeader>
            <CardTitle>Top learners</CardTitle>
            <CardDescription>Minutes logged in the last {rangeDays} days</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <ul className="space-y-4">
              {topStudents.map((student) => (
                <li key={student.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">
                      {student.sessions} sessions · {student.items} items
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-600">
                    {formatMinutes(student.minutes)}
                  </span>
                </li>
              ))}
              {topStudents.length === 0 && <p className="text-sm text-slate-500">No sessions recorded yet.</p>}
            </ul>
          </div>
        </Card>

        <Card className="border-indigo-100">
          <CardHeader>
            <CardTitle>Recent practice</CardTitle>
            <CardDescription>Most recent 10 sessions from the class</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <ul className="space-y-3">
              {recentSessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{session.studentName}</p>
                    <p className="text-xs text-slate-500">
                      {activityLabels[session.activity] ?? session.activity} · {formatDateTime(session.startedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">{formatMinutes(session.minutes)}</span>
                </li>
              ))}
              {recentSessions.length === 0 && <p className="text-sm text-slate-500">No sessions yet.</p>}
            </ul>
          </div>
        </Card>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Class roster</h2>
            <p className="text-sm text-slate-600">Manage who is linked to {classInfo.name}.</p>
          </div>
          <AddStudentDialog classId={classInfo.id} schoolId={classInfo.schoolId} />
        </div>
        <div className="mt-6">
          <ul className="space-y-4">
            {rosterStudents.map((student) => (
              <StudentRosterRow key={student.id} student={student} classId={classInfo.id} />
            ))}
            {rosterStudents.length === 0 && (
              <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-6 text-sm text-slate-500">
                No active students yet. Add your first student above.
              </p>
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl">
        <header className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Assignment progress</h2>
          <p className="text-sm text-slate-500">Track who has finished and who still needs help.</p>
        </header>
        <div className="space-y-6">
          {assignments.length === 0 && <p className="text-sm text-slate-500">No assignments for this class yet.</p>}
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-2xl border border-indigo-100 bg-white/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
                    {activityLabels[assignment.activity] ?? assignment.activity}
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">{assignment.title}</h3>
                  <p className="text-xs text-slate-500">Due {formatDate(assignment.dueAt)} · Level {assignment.level ?? '—'}</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                    {assignment.completedCount}/{assignment.totalStudents} completed
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-600">
                    {assignment.inProgressCount} in progress
                  </span>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Student</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Minutes</th>
                      <th className="py-2 pr-4">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.submissions.map((submission) => {
                      const student = students.find((item) => item.id === submission.studentId)
                      return (
                        <tr key={submission.id} className="border-t border-slate-100">
                          <td className="py-2 pr-4 text-slate-800">{student?.name ?? 'Unknown'}</td>
                          <td className="py-2 pr-4 text-slate-600">{submission.status ?? 'pending'}</td>
                          <td className="py-2 pr-4 text-slate-600">{formatMinutes(submission.timeSpent)}</td>
                          <td className="py-2 pr-4 text-slate-600">{formatDate(submission.completedAt)}</td>
                        </tr>
                      )
                    })}
                    {assignment.submissions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-sm text-slate-500">
                          No submissions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl">
        <header className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Student overview</h2>
          <p className="text-sm text-slate-500">Full roster with practice participation.</p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Minutes</th>
                <th className="py-2 pr-4">Sessions</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2 pr-4">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 text-slate-800">{student.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{formatMinutes(student.minutes)}</td>
                  <td className="py-2 pr-4 text-slate-600">{student.sessions}</td>
                  <td className="py-2 pr-4 text-slate-600">{student.items}</td>
                  <td className="py-2 pr-4 text-slate-600">{formatPercent(student.accuracy)}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-sm text-slate-500">
                    No students enrolled in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
