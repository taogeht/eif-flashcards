
'use client'

import React, { createContext, useContext, useState, useRef } from 'react'

interface AudioContextType {
  playingTrack: string | null
  setPlayingTrack: (track: string | null) => void
  progress: { [key: string]: number }
  setProgress: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>
  audioRef: React.RefObject<HTMLAudioElement>
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ [key: string]: number }>({})
  const audioRef = useRef<HTMLAudioElement>(null)

  return (
    <AudioContext.Provider
      value={{
        playingTrack,
        setPlayingTrack,
        progress,
        setProgress,
        audioRef,
      }}
    >
      {children}
      <audio ref={audioRef} />
    </AudioContext.Provider>
  )
}

export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}