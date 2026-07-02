"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppView, Role } from "@/lib/types"

interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

interface AppState {
  // session (mirrors NextAuth session for client use)
  user: SessionUser | null
  setUser: (u: SessionUser | null) => void

  // navigation (single-page app via client routing)
  view: AppView
  setView: (v: AppView) => void

  // mobile sidebar open state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      view: "dashboard",
      setView: (v) => set({ view: v, sidebarOpen: false }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "erp-app-store",
      partialize: (s) => ({ view: s.view }),
    }
  )
)
