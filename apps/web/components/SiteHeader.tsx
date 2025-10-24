'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { usePracticeIdentity } from '@/contexts/PracticeContext'

export default function SiteHeader() {
  const router = useRouter()
  const { studentId, studentName, levelCode, setIdentity } = usePracticeIdentity()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const isLoggedIn = Boolean(studentId)
  const homeHref = useMemo(() => (levelCode ? `/levels/${levelCode.toLowerCase()}` : '/'), [levelCode])

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    try {
      setIsSigningOut(true)
      const response = await fetch('/api/kiosk/session', { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(`Failed to sign out: ${response.status}`)
      }
      setIdentity({
        studentId: null,
        studentName: null,
        classId: null,
        levelCode: null,
        assignmentId: null
      })
      setIsSigningOut(false)
      router.push('/class')
      router.refresh()
    } catch (error) {
      console.error('Unable to sign out', error)
      setIsSigningOut(false)
    }
  }

  return (
    <header className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href={homeHref} className="flex items-center space-x-4">
            <img
              src="/assets/common/logo.png"
              alt="Macmillan Language School"
              className="h-12 w-auto"
            />
            <h1 className="text-2xl md:text-3xl font-bold">Macmillan Language School</h1>
          </Link>

          {isLoggedIn && (
            <div className="flex items-center justify-between gap-4 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
              <span className="font-semibold text-white/90">
                Hello, {studentName ?? 'friend'}!
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
