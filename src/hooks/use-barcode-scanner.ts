"use client"

import * as React from "react"
import { getHardwareSettings } from "@/lib/hardware"

/**
 * useBarcodeScanner — a global keydown listener that detects USB HID
 * barcode scanner input and calls onScan(barcode) when a scan is detected.
 *
 * Barcode scanners emulate keyboards: they type characters very fast
 * (~5-15ms between keys) and end with Enter. This hook distinguishes
 * scanner input from human typing by:
 *   1. Measuring the interval between keystrokes
 *   2. Requiring the full sequence to complete within scannerMaxDuration
 *   3. Optionally checking for a configured prefix/suffix
 *
 * The hook ignores keystrokes when the active element is an INPUT,
 * TEXTAREA, or contentEditable (so the user can type normally in
 * search fields, cart qty inputs, etc.).
 *
 * @param onScan Callback invoked with the scanned barcode string.
 * @param enabled When false, the listener is inactive (default true).
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  enabled: boolean = true
) {
  const bufferRef = React.useRef<string>("")
  const lastKeyTimeRef = React.useRef<number>(0)
  const firstKeyTimeRef = React.useRef<number>(0)
  const onScanRef = React.useRef(onScan)
  const enabledRef = React.useRef(enabled)

  // Keep refs in sync with latest props without re-registering the listener
  React.useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])
  React.useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!enabledRef.current) return

      // Skip if user is typing in an input/textarea (let the field handle it)
      const active = document.activeElement
      const tag = active?.tagName
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (active as HTMLElement)?.isContentEditable
      ) {
        // Reset buffer — we're not in scanner mode
        bufferRef.current = ""
        return
      }

      // Skip modifier keys alone
      if (e.ctrlKey || e.metaKey || e.altKey) {
        bufferRef.current = ""
        return
      }

      const settings = getHardwareSettings()
      const now = Date.now()

      // Check prefix: if configured and this is the first key, it must match
      if (bufferRef.current === "" && settings.scannerPrefix) {
        if (e.key !== settings.scannerPrefix) return
        // Start buffer with prefix, don't add to it
        firstKeyTimeRef.current = now
        lastKeyTimeRef.current = now
        return
      }

      // Check interval: if too long since last key, this is a new sequence
      if (now - lastKeyTimeRef.current > settings.scannerMinInterval * 3) {
        bufferRef.current = ""
        firstKeyTimeRef.current = now
      }

      // Check max duration: if the sequence is too long, discard
      if (now - firstKeyTimeRef.current > settings.scannerMaxDuration) {
        bufferRef.current = ""
        firstKeyTimeRef.current = now
      }

      lastKeyTimeRef.current = now

      // Handle Enter / suffix
      if (e.key === "Enter" || e.key === settings.scannerSuffix) {
        if (bufferRef.current.length >= 3) {
          // We have a scan!
          const barcode = bufferRef.current
          bufferRef.current = ""
          e.preventDefault()
          onScanRef.current(barcode)
          return
        }
        bufferRef.current = ""
        return
      }

      // Skip non-printable keys
      if (e.key.length !== 1) return

      // Accumulate
      bufferRef.current += e.key

      // If buffer is getting too long without Enter, discard (likely not a scan)
      if (bufferRef.current.length > 50) {
        bufferRef.current = ""
      }
    }

    document.addEventListener("keydown", handler, true)
    return () => document.removeEventListener("keydown", handler, true)
  }, [])
}
