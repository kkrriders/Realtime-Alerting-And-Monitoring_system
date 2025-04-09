"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

export type UserRole = "viewer" | "editor" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (requiredRole: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for demonstration
const MOCK_USER: User = {
  id: "user-1",
  name: "Demo User",
  email: "demo@example.com",
  role: "admin",
  avatar: "/placeholder.svg?height=32&width=32",
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Simulate checking for an existing session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, this would check for a valid session/token
        // For demo purposes, we'll just set the mock user after a delay
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setUser(MOCK_USER)
      } catch (error) {
        console.error("Authentication error:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // In a real app, this would validate credentials with an API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setUser(MOCK_USER)
    } catch (error) {
      console.error("Login error:", error)
      throw new Error("Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    // In a real app, this would invalidate the session/token
    setUser(null)
  }

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!user) return false

    const roleHierarchy: Record<UserRole, number> = {
      viewer: 1,
      editor: 2,
      admin: 3,
    }

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
