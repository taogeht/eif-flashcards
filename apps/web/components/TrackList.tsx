'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Play, Pause, BookOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { LevelCode } from '@/config/types'

interface TrackListUnit {
  slug: string
  title: string
  audioUrl: string
}

interface TrackListProps {
  level: LevelCode
  units: TrackListUnit[]
  selectedUnitSlug?: string
}

export default function TrackList({ level, units, selectedUnitSlug }: TrackListProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playingSlug, setPlayingSlug] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [duration, setDuration] = useState<Record<string, number>>({})
  const [currentTime, setCurrentTime] = useState<Record<string, number>>({})

  const tracksToShow = selectedUnitSlug
    ? units.filter((unit) => unit.slug === selectedUnitSlug)
    : units

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const updateProgress = () => {
    if (!audioRef.current || !playingSlug) return

    const current = audioRef.current.currentTime
    const total = audioRef.current.duration
    const progressValue = total ? (current / total) * 100 : 0

    setProgress((prev) => ({ ...prev, [playingSlug]: progressValue || 0 }))
    setCurrentTime((prev) => ({ ...prev, [playingSlug]: current }))
    setDuration((prev) => ({ ...prev, [playingSlug]: total }))
  }

  const togglePlay = (unit: TrackListUnit) => {
    if (!audioRef.current) return

    if (playingSlug === unit.slug) {
      audioRef.current.pause()
      setPlayingSlug(null)
    } else {
      audioRef.current.src = unit.audioUrl
      audioRef.current
        .play()
        .then(() => setPlayingSlug(unit.slug))
        .catch((error) => {
          console.error('Unable to play audio', error)
        })
    }
  }

  const handleSliderChange = (unit: TrackListUnit, value: number) => {
    if (!audioRef.current || !duration[unit.slug]) return
    audioRef.current.currentTime = (value / 100) * duration[unit.slug]
    setProgress((prev) => ({ ...prev, [unit.slug]: value }))
  }

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onTimeUpdate={updateProgress} />
      {tracksToShow.map((unit) => (
        <div
          key={unit.slug}
          className="rounded-xl border-4 border-blue-300 bg-gradient-to-r from-blue-100 to-purple-100 p-6 shadow-lg"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex flex-col items-center gap-4 md:w-40">
              <Button
                variant="outline"
                size="icon"
                onClick={() => togglePlay(unit)}
                className="h-20 w-20 rounded-full border-4 border-white bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:from-blue-600 hover:to-purple-600"
              >
                {playingSlug === unit.slug ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10" />}
              </Button>

              {!selectedUnitSlug && (
                <Link href={`/levels/${level.toLowerCase()}/activities?unit=${unit.slug}`} passHref>
                  <Button
                    variant="outline"
                    className="rounded-xl border-2 border-white bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md transition-transform duration-200 hover:scale-105 hover:from-pink-600 hover:to-purple-600"
                  >
                    <BookOpen className="mr-2 h-5 w-5" />
                    Activities
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex-1">
              <h3 className="mb-4 text-xl font-bold text-blue-700">{unit.title}</h3>
              <Slider
                value={[progress[unit.slug] || 0]}
                max={100}
                step={0.1}
                className="w-full"
                onValueChange={([value]) => handleSliderChange(unit, value)}
              />
              <div className="mt-2 text-sm text-gray-600">
                {formatTime(currentTime[unit.slug] || 0)} / {formatTime(duration[unit.slug] || 0)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
