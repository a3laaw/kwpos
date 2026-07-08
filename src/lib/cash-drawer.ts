"use client"

import { getHardwareSettings, buildDrawerOpenCommand } from "@/lib/hardware"

/**
 * Open the cash drawer via the configured printer.
 *
 * Approaches (in order of preference):
 * 1. Web Serial API — if the printer is connected via USB/serial and the
 *    browser supports Web Serial (Chrome/Edge). Opens a port and writes
 *    the ESC/POS drawer-kick command directly.
 * 2. Print window fallback — opens a hidden iframe with the raw ESC/POS
 *    bytes as a "document". The user must have the thermal printer set
 *    as their default printer. This is less reliable but works on most
 *    browsers.
 * 3. Manual instruction — if no printer is configured, shows an alert
 *    telling the user to open the drawer manually.
 *
 * Returns true if the command was sent, false if manual intervention
 * is needed.
 */
export async function openCashDrawer(): Promise<boolean> {
  const settings = getHardwareSettings()

  if (settings.printerType === "none") {
    // No printer configured — show manual instruction
    if (typeof window !== "undefined") {
      alert("لا توجد طابعة مُعدة.\nيرجى فتح درج النقدية يدويًا.\n\nTo open the cash drawer, configure a printer in Settings → Hardware.")
    }
    return false
  }

  const command = buildDrawerOpenCommand(settings.drawerKickCode)

  // Approach 1: Web Serial API (Chrome/Edge only)
  if (settings.printerType === "usb" || settings.printerType === "serial") {
    if ("serial" in navigator) {
      try {
        // @ts-ignore — Web Serial API is not in standard TS lib yet
        const port = await navigator.serial.requestPort()
        await port.open({ baudRate: 9600 })
        const writer = port.writable?.getWriter()
        if (writer) {
          await writer.write(command)
          writer.releaseLock()
        }
        await port.close()
        return true
      } catch (e) {
        // User cancelled port selection or port is busy — fall through
        // to print window approach.
        console.warn("[cash-drawer] Web Serial failed:", e)
      }
    }
  }

  // Approach 2: Print window fallback
  // Create a hidden iframe and "print" the ESC/POS bytes. The browser
  // sends them to the default printer, which interprets them as raw
  // ESC/POS commands.
  if (typeof document !== "undefined") {
    try {
      const iframe = document.createElement("iframe")
      iframe.style.position = "fixed"
      iframe.style.right = "0"
      iframe.style.bottom = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      iframe.style.border = "0"
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow?.document
      if (!doc) {
        document.body.removeChild(iframe)
        return false
      }

      // Write the ESC/POS command as raw bytes using a Blob URL.
      // The browser will send these bytes to the printer when printing.
      const blob = new Blob([new Uint8Array(command)], { type: "application/octet-stream" })
      const url = URL.createObjectURL(blob)

      doc.open()
      doc.write(`<html><head><title>cash-drawer</title></head><body>`)
      doc.write(`<embed src="${url}" type="application/octet-stream" width="0" height="0">`)
      doc.write(`</body></html>`)
      doc.close()

      // Trigger print after a short delay
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch {
          // ignore
        }
        // Clean up after 3 seconds
        setTimeout(() => {
          URL.revokeObjectURL(url)
          if (iframe.parentNode) {
            document.body.removeChild(iframe)
          }
        }, 3000)
      }, 200)

      return true
    } catch (e) {
      console.error("[cash-drawer] Print window failed:", e)
      return false
    }
  }

  return false
}
