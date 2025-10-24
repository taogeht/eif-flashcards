'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export default function TeacherLoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/teacher/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim() || undefined,
          passcode: passcode.trim()
        })
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error ?? `Login failed with status ${response.status}`)
      }

      router.push('/teacher/classes')
      router.refresh()
    } catch (submitError) {
      console.error('Unable to create teacher session', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Unable to log in right now.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-indigo-100 bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-bold text-slate-900">Teacher access</h1>
        <p className="mt-2 text-sm text-slate-600">Use your email and passcode to open the portal.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-2">
            <label htmlFor="teacher-email" className="text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="you@school.com"
              autoComplete="email"
            />
            <p className="text-xs text-slate-500">Leave blank to use the legacy admin passcode.</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="teacher-passcode" className="text-sm font-semibold text-slate-700">
              Passcode
            </label>
            <input
              id="teacher-passcode"
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter passcode"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

          <Button
            type="submit"
            disabled={isSubmitting || passcode.trim().length === 0}
            className="w-full rounded-full bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {isSubmitting ? 'Signing in…' : 'Unlock teacher portal'}
          </Button>
        </form>
      </div>
    </div>
  )
}
