'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@/payload-types'

interface AuthContextType {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (newData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/users/me', {
        cache: 'no-store',
        signal,
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user || null)
      } else {
        setUser(null)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user || null)
        return { success: true }
      } else {
        return { success: false, error: data.errors?.[0]?.message || 'Invalid credentials' }
      }
    } catch {
      return { success: false, error: 'An unexpected authentication error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/logout', {
        method: 'POST',
        cache: 'no-store',
      })
      if (res.ok) {
        setUser(null)
      }
    } catch (err) {
      console.error('[AuthProvider] Logout failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateUser = (newData: Partial<User>) => {
    setUser((prevUser) => {
      if (!prevUser) return null
      return { ...prevUser, ...newData } as User
    })
  }

  useEffect(() => {
    const controller = new AbortController()
    refresh(controller.signal)
    return () => {
      controller.abort()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh: () => refresh(), login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
