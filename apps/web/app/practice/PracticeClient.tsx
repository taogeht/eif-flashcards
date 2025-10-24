'use client'

import { useMemo, useState } from 'react'

import UnitPicker from '@/components/UnitPicker'
import ProgressStrip from '@/components/ProgressStrip'
import SRSRunner, { type ProgressPayload } from '@/components/SRSRunner'
import type { LevelCode } from '@/config/types'
import type { UnitBundle, UnitContent } from '@/lib/content'

interface PracticeClientProps {
  levels: { code: LevelCode; title: string; units: UnitContent[] }[]
  audio: UnitBundle['audio']
  images: UnitBundle['images']
}

const defaultProgress: ProgressPayload = {
  completed: 0,
  total: 10,
  mastered: 0,
  startedAt: Date.now(),
  elapsedMs: 0,
  sessionComplete: false
}

export default function PracticeClient({ levels, audio, images }: PracticeClientProps) {
  const [selectedLevel, setSelectedLevel] = useState<LevelCode>(levels[0]?.code ?? '1A')
  const firstUnit = levels.find((level) => level.code === selectedLevel)?.units[0]
  const [selectedUnitSlug, setSelectedUnitSlug] = useState<string>(firstUnit?.slug ?? '')
  const [progress, setProgress] = useState<ProgressPayload>(defaultProgress)
  const [streak, setStreak] = useState<number>(3)

  const selectedUnit = useMemo(() => {
    const level = levels.find((item) => item.code === selectedLevel)
    return level?.units.find((unit) => unit.slug === selectedUnitSlug) ?? level?.units[0]
  }, [levels, selectedLevel, selectedUnitSlug])

  const minutes = Math.max(0, Math.round(progress.elapsedMs / 60000))

  const handleUnitSelect = (level: LevelCode, unitSlug: string) => {
    setSelectedLevel(level)
    setSelectedUnitSlug(unitSlug)
    setProgress({ ...defaultProgress, startedAt: Date.now() })
  }

  const handleProgressUpdate = (next: ProgressPayload) => {
    setProgress((prev) => {
      if (
        prev.completed === next.completed &&
        prev.mastered === next.mastered &&
        prev.total === next.total &&
        prev.sessionComplete === next.sessionComplete &&
        prev.elapsedMs === next.elapsedMs
      ) {
        return prev
      }
      return next
    })
    if (next.sessionComplete) {
      setStreak((prev) => prev + 1)
    }
  }

  if (!selectedUnit) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">No units available yet</h2>
        <p className="mt-2 text-slate-600">Please check back later once content has been published.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-indigo-100 backdrop-blur">
        <h1 className="text-3xl font-bold text-slate-900">Practice Center</h1>
        <p className="mt-2 text-slate-600">
          Choose your level and unit, then work through Today&rsquo;s 10 flashcards with listening and speaking
          practice.
        </p>
      </header>

      <section className="rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-indigo-100 backdrop-blur">
        <UnitPicker
          levels={levels}
          selectedLevel={selectedLevel}
          selectedUnitSlug={selectedUnitSlug}
          onSelect={handleUnitSelect}
        />
      </section>

      <section className="rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-indigo-100 backdrop-blur">
        <ProgressStrip minutes={minutes} streak={streak} mastered={progress.mastered} total={progress.total} />
      </section>

      <section className="rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-indigo-100 backdrop-blur">
        <SRSRunner unit={selectedUnit} audio={audio} images={images} onProgressUpdate={handleProgressUpdate} />
      </section>
    </div>
  )
}
