'use client'

import { useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { LevelCode } from '@/config/types'
import type { UnitContent } from '@/lib/content'

interface UnitPickerProps {
  levels: { code: LevelCode; title: string; units: UnitContent[] }[]
  selectedLevel: LevelCode
  selectedUnitSlug: string
  onSelect: (level: LevelCode, unitSlug: string) => void
}

export default function UnitPicker({ levels, selectedLevel, selectedUnitSlug, onSelect }: UnitPickerProps) {
  if (levels.length === 0) {
    return <p className="text-sm text-slate-500">No levels available yet.</p>
  }

  const activeLevel = useMemo(
    () => levels.find((level) => level.code === selectedLevel) ?? levels[0],
    [levels, selectedLevel]
  )

  const handleLevelChange = (value: string) => {
    const nextLevel = levels.find((level) => level.code === value) ?? levels[0]
    const defaultUnit = nextLevel?.units[0]?.slug ?? ''
    onSelect(nextLevel.code, defaultUnit)
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={selectedLevel} onValueChange={handleLevelChange}>
        <TabsList className="flex w-full flex-wrap gap-2">
          {levels.map((level) => (
            <TabsTrigger key={level.code} value={level.code}>
              {level.code}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeLevel?.units.length ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {activeLevel.units.map((unit) => {
            const isSelected = unit.slug === selectedUnitSlug
            return (
              <Button
                key={unit.slug}
                variant={isSelected ? 'default' : 'outline'}
                className="items-start justify-between text-left"
                onClick={() => onSelect(activeLevel.code, unit.slug)}
              >
                <span className={isSelected ? 'font-semibold text-white' : 'font-semibold text-slate-700'}>
                  {unit.title}
                </span>
                <span className={isSelected ? 'text-xs text-indigo-100 md:text-sm' : 'text-xs text-slate-500 md:text-sm'}>
                  {unit.order.toString().padStart(2, '0')} · {unit.items.length} cards
                </span>
              </Button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No units available for this level yet.</p>
      )}
    </div>
  )
}
