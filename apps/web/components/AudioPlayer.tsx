'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'

export default function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-lg mb-8">
      <audio ref={audioRef} src="/audio/${name.toLowerCase().replace(/ /g, '-')}.mp3" />
      <Button
        onClick={togglePlay}
        size="lg"
        className="w-full h-24 text-4xl font-bold"
      >
        {isPlaying ? <Pause className="w-16 h-16" /> : <Play className="w-16 h-16" />}
      </Button>
    </div>
  )
}

