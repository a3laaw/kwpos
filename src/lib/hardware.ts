/**
 * Hardware settings — printer, cash drawer, barcode scanner config.
 * Stored in localStorage (per-device, since hardware is physical).
 */

export interface HardwareSettings {
  /** Printer connection type */
  printerType: "network" | "usb" | "serial" | "none"
  /** Network printer IP:port (e.g. 192.168.1.100:9100) */
  printerNetworkAddress: string
  /** Cash drawer kick code (ESC/POS) — default 0x07 = pulse 2 */
  drawerKickCode: number
  /** Barcode scanner prefix (optional — some scanners send a prefix char) */
  scannerPrefix: string
  /** Barcode scanner suffix (optional — usually Enter/newline) */
  scannerSuffix: string
  /** Min time between keystrokes to detect scanner (ms). Scanners type ~10ms apart. */
  scannerMinInterval: number
  /** Max time for the full barcode sequence (ms) */
  scannerMaxDuration: number
}

const DEFAULTS: HardwareSettings = {
  printerType: "none",
  printerNetworkAddress: "",
  drawerKickCode: 7, // ESC p 0x07 = pulse 2 (standard)
  scannerPrefix: "",
  scannerSuffix: "\n",
  scannerMinInterval: 15, // ms between keys
  scannerMaxDuration: 200, // total ms for a scan
}

const STORAGE_KEY = "kwpos-hardware-settings"

export function getHardwareSettings(): HardwareSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function saveHardwareSettings(s: Partial<HardwareSettings>): HardwareSettings {
  const current = getHardwareSettings()
  const merged = { ...current, ...s }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // ignore
  }
  return merged
}

/**
 * ESC/POS command to open a cash drawer connected through a thermal printer.
 *
 * Standard command: ESC p m t1 t2
 *   ESC = 0x1B
 *   p   = 0x70
 *   m   = 0x00 (drawer 1) or 0x01 (drawer 2)
 *   t1  = pulse ON time (2ms units)
 *   t2  = pulse OFF time (2ms units)
 *
 * The `kickCode` parameter selects the pulse:
 *   0 → m=0, t1=50, t2=50  (100ms pulse)
 *   1 → m=0, t1=100, t2=100 (200ms pulse)
 *   7 → m=0, t1=50, t2=50  (common default)
 */
export function buildDrawerOpenCommand(kickCode: number = 7): Uint8Array {
  // ESC p m t1 t2 — open drawer 1 with 100ms pulse
  const m = 0x00
  const t1 = kickCode === 1 ? 100 : 50
  const t2 = kickCode === 1 ? 100 : 50
  return new Uint8Array([0x1b, 0x70, m, t1, t2])
}
