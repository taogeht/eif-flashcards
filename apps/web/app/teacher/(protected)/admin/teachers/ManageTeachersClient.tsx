'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

interface TeacherSummary {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  schoolId: string | null
  schoolName: string | null
  isAdmin: boolean
}

interface SchoolSummary {
  id: string
  name: string
}

interface ClassSummary {
  id: string
  name: string
  code: string | null
  schoolId: string | null
  teacherId: string | null
}

interface ManageTeachersClientProps {
  initialTeachers: TeacherSummary[]
  schools: SchoolSummary[]
  classes: ClassSummary[]
}

const MIN_PASSCODE_LENGTH = 6

export default function ManageTeachersClient({ initialTeachers, schools, classes }: ManageTeachersClientProps) {
  const router = useRouter()
  const [teachers] = useState(initialTeachers)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('')
  const [makeAdmin, setMakeAdmin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [assignmentClassId, setAssignmentClassId] = useState('')
  const [assignmentTeacherId, setAssignmentTeacherId] = useState('')
  const [assignmentStatus, setAssignmentStatus] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  const classLookup = useMemo(() => {
    const map = new Map<string, ClassSummary>()
    classes.forEach((classRow) => map.set(classRow.id, classRow))
    return map
  }, [classes])

  const filteredTeachersForAssignment = useMemo(() => {
    if (!assignmentClassId) {
      return teachers
    }
    const classInfo = classLookup.get(assignmentClassId)
    if (!classInfo || !classInfo.schoolId) {
      return teachers
    }
    return teachers.filter((teacher) => teacher.isAdmin || teacher.schoolId === classInfo.schoolId)
  }, [assignmentClassId, classLookup, teachers])

  const validateForm = () => {
    if (!email.trim()) {
      return 'Email is required.'
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return 'Enter a valid email address.'
    }
    if (!passcode || passcode.trim().length < MIN_PASSCODE_LENGTH) {
      return `Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.`
    }
    if (!makeAdmin && !selectedSchoolId) {
      return 'Select a school for this teacher.'
    }
    if (!firstName.trim()) {
      return 'First name is required.'
    }
    return null
  }

  const handleCreateTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setSuccessMessage(null)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/teacher/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          passcode: passcode.trim(),
          schoolId: makeAdmin ? null : selectedSchoolId,
          isAdmin: makeAdmin
        })
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? `Request failed with status ${response.status}`)
      }

      setEmail('')
      setFirstName('')
      setLastName('')
      setPasscode('')
      setSelectedSchoolId('')
      setMakeAdmin(false)
      setSuccessMessage('Teacher created successfully.')
      router.refresh()
    } catch (submitError) {
      console.error('Unable to create teacher', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Unable to create teacher right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPasscode = async (teacher: TeacherSummary) => {
    const displayName = teacher.firstName || teacher.lastName ? `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim() : teacher.email ?? 'teacher'
    const nextPasscode = window.prompt(`Enter a new passcode for ${displayName}`)
    if (nextPasscode === null) {
      return
    }
    const trimmed = nextPasscode.trim()
    if (trimmed.length < MIN_PASSCODE_LENGTH) {
      window.alert(`Passcode must be at least ${MIN_PASSCODE_LENGTH} characters.`)
      return
    }
    try {
      const response = await fetch(`/api/teacher/admin/teachers/${teacher.id}/passcode`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ passcode: trimmed })
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? `Update failed with status ${response.status}`)
      }

      window.alert('Passcode updated successfully.')
    } catch (error) {
      console.error('Unable to update passcode', error)
      window.alert(error instanceof Error ? error.message : 'Unable to update passcode right now.')
    }
  }

  const handleAssignClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assignmentClassId) {
      setAssignmentError('Select a class to assign.')
      return
    }

    try {
      setAssignmentStatus(null)
      setAssignmentError(null)
      const response = await fetch(`/api/teacher/admin/classes/${assignmentClassId}/teacher`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teacherId: assignmentTeacherId || null })
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? `Request failed with status ${response.status}`)
      }

      setAssignmentStatus('Class assignment updated.')
      router.refresh()
    } catch (assignError) {
      console.error('Unable to assign class', assignError)
      setAssignmentError(assignError instanceof Error ? assignError.message : 'Unable to assign class right now.')
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Admin Tools</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Teacher accounts</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create new teacher logins, assign schools, and reset passcodes. Passcodes are stored as secure hashes and cannot be retrieved once set.
        </p>
      </header>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-xl font-semibold text-slate-900">Add a teacher</h2>
        <p className="mt-1 text-sm text-slate-600">Provide a passcode (minimum {MIN_PASSCODE_LENGTH} characters). Teachers can change it later.</p>
        <form onSubmit={handleCreateTeacher} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="teacher-email" className="text-sm font-semibold text-slate-700">
              Email<span className="text-rose-500">*</span>
            </label>
            <input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="teacher@school.com"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="teacher-first-name" className="text-sm font-semibold text-slate-700">
              First name<span className="text-rose-500">*</span>
            </label>
            <input
              id="teacher-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Alex"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="teacher-last-name" className="text-sm font-semibold text-slate-700">Last name</label>
            <input
              id="teacher-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Kim"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="teacher-passcode" className="text-sm font-semibold text-slate-700">
              Passcode<span className="text-rose-500">*</span>
            </label>
            <input
              id="teacher-passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter a passcode"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="teacher-school" className="text-sm font-semibold text-slate-700">
              School{makeAdmin ? '' : <span className="text-rose-500">*</span>}
            </label>
            <select
              id="teacher-school"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              disabled={makeAdmin}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={makeAdmin}
                onChange={(event) => {
                  setMakeAdmin(event.target.checked)
                  if (event.target.checked) {
                    setSelectedSchoolId('')
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Portal admin (access to all schools)
            </label>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            {successMessage && <p className="text-sm font-semibold text-emerald-600">{successMessage}</p>}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Creating…' : 'Create teacher'}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-xl font-semibold text-slate-900">Current teachers</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">School</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-indigo-50/50">
                  <td className="px-4 py-3 text-slate-900">
                    {(teacher.firstName || teacher.lastName
                      ? `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim()
                      : '—')}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{teacher.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{teacher.schoolName ?? 'All schools'}</td>
                  <td className="px-4 py-3 text-slate-700">{teacher.isAdmin ? 'Admin' : 'Teacher'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPasscode(teacher)}
                      className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      Reset passcode
                    </Button>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    No teachers yet. Add your first teacher above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl backdrop-blur">
        <h2 className="text-xl font-semibold text-slate-900">Assign classes</h2>
        <p className="mt-1 text-sm text-slate-600">Choose a class and assign or remove a teacher.</p>
        <form onSubmit={handleAssignClass} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="assignment-class" className="text-sm font-semibold text-slate-700">
              Class<span className="text-rose-500">*</span>
            </label>
            <select
              id="assignment-class"
              value={assignmentClassId}
              onChange={(event) => {
                setAssignmentClassId(event.target.value)
                setAssignmentTeacherId('')
                setAssignmentStatus(null)
                setAssignmentError(null)
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Select a class</option>
              {classes.map((classRow) => (
                <option key={classRow.id} value={classRow.id}>
                  {classRow.name} {classRow.code ? `(${classRow.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="assignment-teacher" className="text-sm font-semibold text-slate-700">
              Teacher
            </label>
            <select
              id="assignment-teacher"
              value={assignmentTeacherId}
              onChange={(event) => setAssignmentTeacherId(event.target.value)}
              disabled={!assignmentClassId}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
            >
              <option value="">Unassigned</option>
              {filteredTeachersForAssignment.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName || teacher.lastName
                    ? `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim()
                    : teacher.email ?? 'Unnamed teacher'}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            {assignmentError && <p className="text-sm font-semibold text-rose-600">{assignmentError}</p>}
            {assignmentStatus && <p className="text-sm font-semibold text-emerald-600">{assignmentStatus}</p>}
            <Button
              type="submit"
              disabled={!assignmentClassId}
              className="w-full rounded-full bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              Save assignment
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
