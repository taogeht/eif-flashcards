'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface PracticeIdentity {
  studentId: string | null
  studentName: string | null
  classId: string | null
  levelCode: string | null
  assignmentId: string | null
}

interface PracticeContextValue extends PracticeIdentity {
  setIdentity: (next: Partial<PracticeIdentity>) => void
}

export const defaultPracticeIdentity: PracticeIdentity = {
  studentId: null,
  studentName: null,
  classId: null,
  levelCode: null,
  assignmentId: null
}

const PracticeContext = createContext<PracticeContextValue | undefined>(undefined)

interface PracticeProviderProps {
  children: ReactNode
  initialValue?: Partial<PracticeIdentity>
}

export function PracticeProvider({ children, initialValue }: PracticeProviderProps) {
  const [identity, setIdentityState] = useState<PracticeIdentity>(() => ({
    ...defaultPracticeIdentity,
    ...initialValue
  }))

  const setIdentity = useCallback((next: Partial<PracticeIdentity>) => {
    setIdentityState((prev) => ({
      ...prev,
      ...next
    }))
  }, [])

  const contextValue = useMemo<PracticeContextValue>(
    () => ({
      ...identity,
      setIdentity
    }),
    [identity, setIdentity]
  )

  return <PracticeContext.Provider value={contextValue}>{children}</PracticeContext.Provider>
}

export function usePracticeIdentity() {
  const context = useContext(PracticeContext)
  if (!context) {
    throw new Error('usePracticeIdentity must be used within a PracticeProvider')
  }
  return context
}
