"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppView } from "@/lib/types"

interface AppState {
  // navigation (single-page app via client routing)
  view: AppView
  setView: (v: AppView) => void

  // mobile sidebar open state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

/**
 * NOTE: `skipHydration: true` prevents Zustand from synchronously hydrating
 * the persisted `view` from localStorage during the store's initial creation
 * on the client. Without this, the client's first render would use the
 * persisted `view` (e.g. "inventory") while the server rendered the default
 * ("dashboard") — causing a React hydration mismatch and shifting all Radix
 * `useId` identifiers. We manually rehydrate inside an effect in `AppShell`
 * (after hydration completes) so the persisted view is applied safely.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "dashboard",
      setView: (v) => set({ view: v, sidebarOpen: false }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "erp-app-store",
      partialize: (s) => ({ view: s.view }),
      skipHydration: true,
    }
  )
)
