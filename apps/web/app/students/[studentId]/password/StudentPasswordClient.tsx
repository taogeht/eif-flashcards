'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { PICTURE_OPTIONS, getPictureOption } from '@/lib/kiosk/picture-options'

interface StudentPasswordClientProps {
  student: {
    id: string
    firstName: string
    lastName: string
    picturePassword: string | null
  }
}

export default function StudentPasswordClient({ student }: StudentPasswordClientProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(student.picturePassword)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId)
    setError(null)
  }

  const handleSave = async () => {
    if (!selectedOption) {
      setError('Please tap a picture to be your password.')
      return
    }

    try {
      setStatus('saving')
      setError(null)

      const response = await fetch(`/api/students/${student.id}/picture-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pictureId: selectedOption })
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      setStatus('saved')
    } catch (saveError) {
      console.error('Failed to save picture password', saveError)
      setStatus('error')
      setError('We could not save that picture. Please try again.')
    }
  }

  const activeOption = getPictureOption(selectedOption)

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="rounded-3xl bg-white/90 p-8 text-center shadow-xl ring-1 ring-emerald-100 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-500">Choose Your Password</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900">Hello, {student.firstName}!</h1>
        <p className="mt-2 text-lg text-slate-600">Pick one picture to be your secret login. Remember it for next time.</p>
      </header>

      <section className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-emerald-100 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-3">
          {PICTURE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectOption(option.id)}
              className={`group flex h-40 flex-col items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br ${option.gradient} text-4xl text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 ${
                selectedOption === option.id ? 'ring-4 ring-emerald-300' : ''
              }`}
            >
              <span>{option.emoji}</span>
              <span className="mt-2 text-lg font-semibold uppercase tracking-wide drop-shadow-md">{option.label}</span>
            </button>
          ))}
        </div>

        {activeOption && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-4">
            <span className="text-sm font-semibold text-emerald-700">
              You chose the <span className="uppercase">{activeOption.label}</span> picture!
            </span>
            <Button onClick={handleSave} disabled={status === 'saving'} className="bg-emerald-500 text-white hover:bg-emerald-600">
              {status === 'saving' ? 'Saving…' : 'Save password'}
            </Button>
          </div>
        )}

        {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
        {status === 'saved' && !error && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
            Password saved! You can go back to your class page and log in with your new picture.
          </div>
        )}
      </section>
    </div>
  )
}
