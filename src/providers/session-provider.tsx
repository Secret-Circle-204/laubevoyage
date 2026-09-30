'use client'

import React, { createContext, useContext, useState } from 'react'
import { logoutCustomerAction, getCurrentSessionAction } from '@/application/actions/customer-actions'

export interface CustomerSessionState {
  isAuthenticated: boolean
  customerId?: number
  email?: string
  firstName?: string
  lastName?: string
  tier?: string
  points?: number
  role?: 'admin' | 'super_admin' | 'customer'
}

interface SessionContextType {
  session: CustomerSessionState
  setSession: (session: CustomerSessionState) => void
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({
  children,
  initialSession = { isAuthenticated: false },
}: {
  children: React.ReactNode
  initialSession?: CustomerSessionState
}) {
  const [session, setSessionState] = useState<CustomerSessionState>(initialSession)
  const [prevSessionId, setPrevSessionId] = useState<string>(
    `${initialSession?.isAuthenticated}:${initialSession?.customerId || ''}:${initialSession?.email || ''}`
  )

  const currentSessionId = `${initialSession?.isAuthenticated}:${initialSession?.customerId || ''}:${initialSession?.email || ''}`

  // Adjust state during render when initialSession prop identity changes (React pattern: You Might Not Need an Effect)
  if (currentSessionId !== prevSessionId) {
    setPrevSessionId(currentSessionId)
    if (initialSession) {
      setSessionState(initialSession)
    }
  }

  const setSession = (newSession: CustomerSessionState) => {
    setSessionState(newSession)
  }

  const refreshSession = async () => {
    try {
      const res = await getCurrentSessionAction()
      if (res.success && res.session) {
        setSessionState(res.session)
      } else {
        console.warn(
          '[SessionProvider] Session revalidation skipped due to server error. Preserving active session state.',
          res.error
        )
      }
    } catch (err) {
      console.warn(
        '[SessionProvider] Session revalidation transport failure. Preserving active session state.',
        err
      )
    }
  }

  const logout = async () => {
    try {
      await logoutCustomerAction()
    } catch (err) {
      console.error('Failed to clear session cookie:', err)
    }
    setSessionState({ isAuthenticated: false })
    window.location.href = '/login'
  }

  return (
    <SessionContext.Provider value={{ session, setSession, refreshSession, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
