'use client'

import { useRef } from 'react'
import { Volume2 } from 'lucide-react'

interface ListenShadowProps {
  audioUrl?: string
}

export default function ListenShadow({ audioUrl }: ListenShadowProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  const playAudio = () => {
    if (!audioUrl || !audioRef.current) return
    audioRef.current.src = audioUrl
    audioRef.current.currentTime = 0
    audioRef.current.play().catch((error) => {
      console.error('Unable to play audio', error)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/70 p-4 shadow-sm">
      <audio ref={audioRef} hidden />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={playAudio}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-600"
        >
          <Volume2 className="h-4 w-4" />
          Play prompt
        </button>
      </div>

      <div className="rounded-xl border border-indigo-50 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-700">
        <p className="font-semibold uppercase tracking-wide text-indigo-500">Listen &amp; repeat</p>
        <p className="mt-2 text-indigo-700/90">
          Hear the model audio and repeat it out loud. We&apos;ll bring pronunciation recording back when feedback is
          ready.
        </p>
      </div>
    </div>
  )
}
