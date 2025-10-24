'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange?: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProps {
  value: string
  onValueChange?: (value: string) => void
  children: ReactNode
}

export function Tabs({ value, onValueChange, children }: TabsProps) {
  return <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return <div className={cn('flex rounded-full bg-slate-100 p-1', className)}>{children}</div>
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  const isActive = context?.value === value

  return (
    <button
      type="button"
      onClick={() => context?.onValueChange?.(value)}
      className={cn(
        'flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition',
        isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        className
      )}
    >
      {children}
    </button>
  )
}
