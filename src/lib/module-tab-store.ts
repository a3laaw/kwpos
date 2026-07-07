"use client"

import * as React from "react"
import { useAppStore } from "@/lib/store"

/**
 * Module-scoped store for sub-tab navigation within each module.
 * The Topbar's MegaMenuBar writes to this store, and each module view
 * reads from it to know which sub-tab is active.
 *
 * Without this, the MegaMenuBar in the Topbar would call setView with
 * invalid AppView values (e.g. "journal", "accounts") which would
 * reset to dashboard.
 */

const moduleTabStore: Record<string, string> = {}

/** Get the current sub-tab for a module (defaults to first item). */
export function getModuleTab(moduleView: string, defaultValue: string): string {
  return moduleTabStore[moduleView] ?? defaultValue
}

/** Set the current sub-tab for a module. */
export function setModuleTab(moduleView: string, tab: string): void {
  moduleTabStore[moduleView] = tab
}

/**
 * React hook that reads the current sub-tab for the given module.
 * Returns [tab, setTab] — calling setTab updates the store AND triggers
 * a re-render of the calling component.
 */
export function useModuleTab(moduleView: string, defaultValue: string): [string, (tab: string) => void] {
  const view = useAppStore((s) => s.view)
  const [tab, setTabState] = React.useState<string>(getModuleTab(moduleView, defaultValue))

  // When the module changes, reset tab from store
  React.useEffect(() => {
    setTabState(getModuleTab(moduleView, defaultValue))
  }, [moduleView, view])

  const setTab = React.useCallback((newTab: string) => {
    setModuleTab(moduleView, newTab)
    setTabState(newTab)
  }, [moduleView])

  return [tab, setTab]
}
