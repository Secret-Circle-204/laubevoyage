'use client'

import React, { createContext, useContext, useState } from 'react'
import { logoutCustomerAction } from '@/application/actions/customer-actions'

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

  const setSession = (newSession: CustomerSessionState) => {
    setSessionState(newSession)
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
    <SessionContext.Provider value={{ session, setSession, logout }}>
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
