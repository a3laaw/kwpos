"use client"

import * as React from "react"
import { create } from "zustand"

/**
 * Module-scoped store for sub-tab navigation within each module.
 * Uses Zustand so ALL components reading the same module key re-render
 * when any one of them updates the tab.
 */

interface ModuleTabState {
  tabs: Record<string, string>
  setTab: (moduleView: string, tab: string) => void
}

const useModuleTabStore = create<ModuleTabState>((set) => ({
  tabs: {},
  setTab: (moduleView, tab) =>
    set((state) => ({
      tabs: { ...state.tabs, [moduleView]: tab },
    })),
}))

/**
 * React hook that reads + writes the current sub-tab for the given module.
 * Returns [tab, setTab]. When setTab is called (from the Topbar's
 * MegaMenuBar), ALL components using the same moduleView re-render.
 */
export function useModuleTab(
  moduleView: string,
  defaultValue: string
): [string, (tab: string) => void] {
  const tab = useModuleTabStore((s) => s.tabs[moduleView] ?? defaultValue)
  const setTab = useModuleTabStore((s) => s.setTab)

  const handleSetTab = React.useCallback(
    (newTab: string) => {
      setTab(moduleView, newTab)
    },
    [moduleView, setTab]
  )

  return [tab, handleSetTab]
}
