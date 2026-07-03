import * as XLSX from "xlsx"

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

/** Build an .xlsx workbook from rows and trigger a download (browser-side). */
export function exportToExcel(
  rows: Record<string, any>[],
  columns: ExcelColumn[],
  filename: string,
  sheetName = "Sheet1"
) {
  const headerRow = columns.map((c) => c.header)
  const dataRows = rows.map((r) => columns.map((c) => r[c.key] ?? ""))
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}

/** Parse an uploaded .xlsx/.csv file into an array of row objects. */
export async function parseExcelFile(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[]
}

/** Build an .xlsx template for import (with headers only) for download. */
export function downloadTemplate(columns: ExcelColumn[], filename: string, sheetName = "Template") {
  const headerRow = columns.map((c) => c.header)
  const ws = XLSX.utils.aoa_to_sheet([headerRow])
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 22 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`)
}
