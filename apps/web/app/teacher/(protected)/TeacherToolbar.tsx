'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'

const navLinks = [
  { href: '/teacher', label: 'Overview' },
  { href: '/teacher/classes', label: 'Classes' },
  { href: '/teacher/reports', label: 'Reports' }
]

interface TeacherToolbarProps {
  teacherName?: string | null
  isAdmin?: boolean
}

export default function TeacherToolbar({ teacherName, isAdmin = false }: TeacherToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const links = isAdmin
    ? [...navLinks, { href: '/teacher/admin/teachers', label: 'Admin' }]
    : navLinks

  const handleSignOut = async () => {
    if (isSigningOut) return
    try {
      setIsSigningOut(true)
      const response = await fetch('/api/teacher/session', { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(`Failed to sign out: ${response.status}`)
      }
      router.push('/teacher/login')
      router.refresh()
    } catch (error) {
      console.error('Unable to sign out teacher session', error)
      setIsSigningOut(false)
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 transition ${
                  isActive ? 'bg-indigo-500 text-white shadow-md' : 'hover:bg-indigo-100'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          {teacherName && (
            <span className="text-sm font-semibold text-indigo-600">Hi, {teacherName}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    </header>
  )
}
