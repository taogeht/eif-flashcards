'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ClassCodeEntryProps {
  lastClassCode: string | null
  schoolName?: string | null
  schoolId?: string | null
}

const AUTO_REDIRECT_SECONDS = 5

const sanitizeCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

export default function ClassCodeEntry({ lastClassCode, schoolName, schoolId }: ClassCodeEntryProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allowAutoRedirect, setAllowAutoRedirect] = useState(Boolean(lastClassCode))
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS)

  useEffect(() => {
    if (!lastClassCode || !allowAutoRedirect) {
      return undefined
    }

    setCountdown(AUTO_REDIRECT_SECONDS)

    const downTimer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    const redirectTimer = setTimeout(() => {
      router.push(`/class/${lastClassCode.toLowerCase()}`)
    }, AUTO_REDIRECT_SECONDS * 1000)

    return () => {
      clearInterval(downTimer)
      clearTimeout(redirectTimer)
    }
  }, [allowAutoRedirect, lastClassCode, router])

  useEffect(() => {
    setCode((previous) => (previous ? sanitizeCode(previous) : ''))
  }, [])

  const normalizedCode = useMemo(() => sanitizeCode(code), [code])
  const isSubmitDisabled = normalizedCode.length === 0 || isSubmitting

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const targetCode = sanitizeCode(code)

    if (!targetCode) {
      setError('Enter your class code to continue.')
      return
    }

    setError(null)
    setIsSubmitting(true)
    router.push(`/class/${targetCode.toLowerCase()}`)
  }

  const handleResumeRedirect = () => {
    if (!lastClassCode) {
      return
    }
    setAllowAutoRedirect(true)
  }

  const handleCancelRedirect = () => {
    setAllowAutoRedirect(false)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-8">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-500">Class Kiosk</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Scan your class QR code</h1>
        <p className="mt-2 text-lg text-slate-600">
          {schoolName
            ? `Welcome to ${schoolName}. Enter a class code or scan a QR code to launch the kiosk.`
            : 'Enter your class code or scan a QR code to open the kiosk experience.'}
        </p>
        {schoolId && (
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-indigo-400">School ID: {schoolId}</p>
        )}
      </header>

      {lastClassCode && (
        <section className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Last class detected</p>
              <p className="text-2xl font-semibold text-slate-900">
                {lastClassCode.toUpperCase()} {allowAutoRedirect && countdown > 0 ? `· resuming in ${countdown}s` : ''}
              </p>
              <p className="text-sm text-slate-600">Stay here to pick another class or continue with the most recent one.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {allowAutoRedirect ? (
                <>
                  <Button onClick={handleCancelRedirect} variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                    Stay here
                  </Button>
                  <Button onClick={() => router.push(`/class/${lastClassCode.toLowerCase()}`)} className="bg-indigo-500 text-white hover:bg-indigo-600">
                    Continue now
                  </Button>
                </>
              ) : (
                <Button onClick={handleResumeRedirect} className="bg-indigo-500 text-white hover:bg-indigo-600">
                  Resume class {lastClassCode.toUpperCase()}
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-1 flex-col gap-6 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-indigo-100 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label htmlFor="class-code" className="text-center text-lg font-semibold text-slate-700 sm:text-left">
            Type a class code
          </label>
          <input
            id="class-code"
            name="class-code"
            inputMode="latin"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. MQ1A"
            value={code}
            onChange={(event) => {
              setCode(sanitizeCode(event.target.value))
              setError(null)
            }}
            className={cn(
              'w-full rounded-2xl border-4 border-indigo-200 bg-indigo-50 px-6 py-5 text-center text-3xl font-bold tracking-[0.4em] text-indigo-700 shadow-inner transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200',
              isSubmitting && 'opacity-80'
            )}
            maxLength={8}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="mx-auto flex min-w-[14rem] items-center justify-center rounded-full bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {isSubmitting ? 'Opening…' : 'Open class kiosk'}
          </Button>
          {error && <p className="text-center text-sm font-semibold text-rose-600">{error}</p>}
        </form>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-5 py-4 text-sm text-indigo-700">
          <p className="font-semibold">Tip</p>
          <p className="mt-1">
            You can keep this kiosk logged in for your class. Use the Sign out button on the class screen when you need to switch
            to a different class.
          </p>
        </div>
      </section>
    </div>
  )
}
