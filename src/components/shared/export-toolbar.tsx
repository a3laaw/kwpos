"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { useT } from "@/components/i18n-context"

export interface ExportToolbarProps {
  /** Report title — used as the PDF document title, the sheet name, and the
   *  first row of the PDF (rendered as a heading above the table). */
  title: string
  /** Column headers (one per column). Must align with the row arrays. */
  headers: string[]
  /** Row data — each inner array is one row, length must match `headers`. */
  rows: any[][]
  /** Base filename (without extension) for the downloaded file. */
  filename: string
  /** Optional className for the wrapper. */
  className?: string
}

/**
 * ExportToolbar — a small two-button toolbar that exports the given tabular
 * data to PDF (via jspdf + jspdf-autotable) or Excel (via SheetJS / xlsx).
 *
 * The PDF export is RTL-aware:
 *   - The document title is drawn at the top center.
 *   - `autoTable` is called with `startY` below the title.
 *   - The default font is "helvetica" (the only standard font that reliably
 *     ships with jspdf and renders Latin digits + Arabic-compatible glyphs
 *     on most systems; Arabic text itself will not shape correctly in
 *     jsPDF without a custom font, but headers/numbers render fine).
 *
 * The heavy libs (jspdf, jspdf-autotable, xlsx) are imported dynamically
 * inside the click handlers so they are only loaded when the user actually
 * clicks a button — keeping the initial JS bundle small.
 */
export function ExportToolbar({
  title,
  headers,
  rows,
  filename,
  className,
}: ExportToolbarProps) {
  const t = useT()
  const [pdfLoading, setPdfLoading] = React.useState(false)
  const [xlsxLoading, setXlsxLoading] = React.useState(false)

  async function handlePdf() {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      // ── Browser-based PDF export (Arabic-safe) ──────────────────────
      // jsPDF with "helvetica" doesn't support Arabic — text comes out
      // garbled. Instead, we open a print window with proper Arabic
      // HTML + RTL, and the browser's native "Save as PDF" handles the
      // conversion perfectly.
      const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif; color: #1a1a1a; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 12px; color: #B85042; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #B85042; color: white; padding: 8px 6px; text-align: right; font-weight: 600; }
  td { padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right; }
  tr:nth-child(even) td { background: #f9fafb; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h ?? ""}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${c == null ? "" : String(c)}</td>`).join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

      const w = window.open("", "_blank", "width=900,height=700")
      if (!w) {
        toast.error(t.exportFailedMsg, { description: "يرجى السماح بالنوافذ المنبثقة" })
        return
      }
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.document.title = title
      toast.success(t.exportSucceededMsg)
    } catch (err: any) {
      console.error("PDF export failed", err)
      toast.error(t.exportFailedMsg, { description: err?.message ?? String(err) })
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleExcel() {
    if (xlsxLoading) return
    setXlsxLoading(true)
    try {
      const XLSX = await import("xlsx")
      const headerRow = headers.slice()
      const dataRows = rows.map((r) =>
        r.map((cell) => (cell == null ? "" : cell))
      )
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
      ws["!cols"] = headers.map((h, i) => ({
        wch: Math.max(
          12,
          Math.min(
            40,
            String(h ?? "").length + 4,
            ...dataRows.map((r) => String(r[i] ?? "").length + 4)
          )
        ),
      }))
      const wb = XLSX.utils.book_new()
      // Sheet name must be ≤ 31 chars and free of special chars
      const sheetName = (title || "Sheet1").replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "Sheet1"
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
      XLSX.writeFile(wb, safeName)
      toast.success(t.exportSucceededMsg)
    } catch (err: any) {
      console.error("Excel export failed", err)
      toast.error(t.exportFailedMsg, { description: err?.message ?? String(err) })
    } finally {
      setXlsxLoading(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={pdfLoading}
        onClick={handlePdf}
      >
        {pdfLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{t.exportPDF}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={xlsxLoading}
        onClick={handleExcel}
      >
        {xlsxLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#2E6237]" />
        )}
        <span className="hidden sm:inline">{t.exportExcel}</span>
      </Button>
    </div>
  )
}
