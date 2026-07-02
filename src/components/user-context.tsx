"use client"

import * as React from "react"
import type { Role } from "@/lib/types"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

const UserContext = React.createContext<SessionUser | null>(null)

/**
 * Provides the authenticated user synchronously to all client components.
 * Using a React context (populated from the server-rendered `user` prop)
 * avoids the hydration mismatch + permission "flash" that would occur if we
 * stored the user in a Zustand store and set it via `useEffect`.
 */
export function UserProvider({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  // Memoize so the context value is stable across re-renders.
  const value = React.useMemo(() => user, [user.id, user.name, user.email, user.role])
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser(): SessionUser {
  const ctx = React.useContext(UserContext)
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return ctx
}
