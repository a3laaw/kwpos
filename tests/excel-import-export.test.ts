/**
 * Test 9 — Excel import/export: data shape and parsing.
 *
 * Tests the helpers in `src/lib/excel.ts`:
 *   - `parseExcelFile(file: File)` — async, parses .xlsx/.csv into row objects.
 *   - `exportToExcel(rows, columns, filename, sheetName)` — builds a workbook
 *     and writes to disk via XLSX.writeFile.
 *   - `downloadTemplate(columns, filename, sheetName, exampleRows?)` —
 *     builds a header-only (or with-example-rows) workbook for download.
 *
 * Strategy:
 *   - For `parseExcelFile`: build a real .xlsx buffer with XLSX.utils,
 *     wrap it in a Node `File`, and verify the parsed rows.
 *   - For `exportToExcel`/`downloadTemplate`: mock `xlsx.writeFile` (via
 *     `vi.mock`) to intercept the workbook argument (no disk write), then
 *     re-read the workbook via XLSX.utils.sheet_to_json to assert the data
 *     shape. We can't use `vi.spyOn(XLSX, "writeFile")` because ESM module
 *     exports are not configurable.
 *   - For import-row validation: replicate the route handler's per-row
 *     "missing required name → skip" filter on parsed rows (the route
 *     doesn't export this helper, so we re-state the rule here as a pure
 *     function and assert on it).
 *
 * These tests run in-process and don't touch the SQLite test DB.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

// ── Mock xlsx.writeFile (ESM-safe — vi.spyOn fails on non-configurable exports) ──
// We use vi.hoisted + vi.mock so the mock is in place BEFORE the test file's
// other imports resolve. The rest of xlsx (utils, read, write, aoa_to_sheet,
// book_new, book_append_sheet, sheet_to_json) is preserved via `...actual`.
const { mockWriteFile } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
}))

vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("xlsx")>()
  return { ...actual, writeFile: mockWriteFile }
})

import * as XLSX from "xlsx"
import {
  exportToExcel,
  parseExcelFile,
  downloadTemplate,
  type ExcelColumn,
} from "@/lib/excel"

// ── Helpers ──────────────────────────────────────────────────────────────
/** Build an .xlsx buffer from a 2D array (header row first). */
function buildXlsxBuffer(aoa: any[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  // XLSX.write returns a Node Buffer; convert to ArrayBuffer for the File API.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

/** Wrap an ArrayBuffer in a Node File (matches the browser File API). */
function bufferToFile(buf: ArrayBuffer, name: string): File {
  return new File([buf], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

// ── Tests: parseExcelFile ────────────────────────────────────────────────
describe("parseExcelFile — parsing .xlsx into row objects", () => {
  it("parses a 2-row sheet into 2 row objects keyed by header", async () => {
    const buf = buildXlsxBuffer([
      ["name", "price", "qty"],
      ["Apple", 10, 5],
      ["Banana", 5, 20],
    ])
    const rows = await parseExcelFile(bufferToFile(buf, "test.xlsx"))

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ name: "Apple", price: 10, qty: 5 })
    expect(rows[1]).toEqual({ name: "Banana", price: 5, qty: 20 })
  })

  it("fills empty cells with empty string (defval)", async () => {
    const buf = buildXlsxBuffer([
      ["name", "note"],
      ["Apple", ""], // explicit empty cell
    ])
    const rows = await parseExcelFile(bufferToFile(buf, "test.xlsx"))
    expect(rows[0]).toEqual({ name: "Apple", note: "" })
  })

  it("parses Arabic headers correctly", async () => {
    const buf = buildXlsxBuffer([
      ["الاسم", "الهاتف", "العنوان"],
      ["أحمد", "5551234", "العنوان 1"],
    ])
    const rows = await parseExcelFile(bufferToFile(buf, "test.xlsx"))
    expect(rows).toHaveLength(1)
    expect(rows[0]["الاسم"]).toBe("أحمد")
    expect(rows[0]["الهاتف"]).toBe("5551234")
  })

  it("returns empty array for an empty sheet (header only)", async () => {
    const buf = buildXlsxBuffer([["name", "price"]]) // header row only
    const rows = await parseExcelFile(bufferToFile(buf, "test.xlsx"))
    expect(rows).toEqual([])
  })

  it("parses a single-row sheet", async () => {
    const buf = buildXlsxBuffer([
      ["name", "price"],
      ["Single", 99],
    ])
    const rows = await parseExcelFile(bufferToFile(buf, "test.xlsx"))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ name: "Single", price: 99 })
  })
})

// ── Tests: exportToExcel data shape ──────────────────────────────────────
describe("exportToExcel — export data shape", () => {
  let capturedWb: any

  beforeEach(() => {
    capturedWb = null
    mockWriteFile.mockReset()
    mockWriteFile.mockImplementation((wb: any, _filename: string) => {
      capturedWb = wb
      return undefined
    })
  })

  afterEach(() => {
    mockWriteFile.mockReset()
  })

  it("writes a single sheet with the given sheet name", () => {
    const rows = [{ a: 1 }]
    const cols: ExcelColumn[] = [{ header: "A", key: "a" }]
    exportToExcel(rows, cols, "out.xlsx", "MySheet")

    expect(mockWriteFile).toHaveBeenCalledOnce()
    expect(capturedWb.SheetNames).toContain("MySheet")
  })

  it("defaults sheet name to 'Sheet1' when not provided", () => {
    const rows = [{ a: 1 }]
    const cols: ExcelColumn[] = [{ header: "A", key: "a" }]
    // 4-arg form omits sheetName
    exportToExcel(rows, cols, "out.xlsx")

    expect(capturedWb.SheetNames).toContain("Sheet1")
  })

  it("appends '.xlsx' to filename when missing", () => {
    const rows = [{ a: 1 }]
    const cols: ExcelColumn[] = [{ header: "A", key: "a" }]
    exportToExcel(rows, cols, "out", "Sheet1") // no .xlsx extension

    expect(mockWriteFile).toHaveBeenCalledOnce()
    const filename = mockWriteFile.mock.calls[0][1]
    expect(filename).toBe("out.xlsx")
  })

  it("preserves '.xlsx' when filename already ends with it", () => {
    const rows = [{ a: 1 }]
    const cols: ExcelColumn[] = [{ header: "A", key: "a" }]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const filename = mockWriteFile.mock.calls[0][1]
    expect(filename).toBe("out.xlsx")
  })

  it("emits header row using columns[i].header in order", () => {
    const rows = [{ a: 1, b: 2, c: 3 }]
    const cols: ExcelColumn[] = [
      { header: "Alpha", key: "a" },
      { header: "Beta", key: "b" },
      { header: "Gamma", key: "c" },
    ]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa[0]).toEqual(["Alpha", "Beta", "Gamma"])
  })

  it("emits data rows using r[c.key] for each column", () => {
    const rows = [
      { a: "x", b: 10, c: true },
      { a: "y", b: 20, c: false },
    ]
    const cols: ExcelColumn[] = [
      { header: "A", key: "a" },
      { header: "B", key: "b" },
      { header: "C", key: "c" },
    ]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa[1]).toEqual(["x", 10, true])
    expect(aoa[2]).toEqual(["y", 20, false])
  })

  it("falls back to empty string for missing keys in a row", () => {
    const rows = [{ a: "x" /* no b */ }]
    const cols: ExcelColumn[] = [
      { header: "A", key: "a" },
      { header: "B", key: "b" },
    ]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa[1]).toEqual(["x", ""])
  })

  it("sets column widths to 18 by default", () => {
    const rows = [{ a: 1 }]
    const cols: ExcelColumn[] = [{ header: "A", key: "a" /* no width */ }]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    expect(sheet["!cols"]).toEqual([{ wch: 18 }])
  })

  it("uses the explicit column width when provided", () => {
    const rows = [{ a: 1, b: 2 }]
    const cols: ExcelColumn[] = [
      { header: "A", key: "a", width: 30 },
      { header: "B", key: "b" /* default */ },
    ]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    expect(sheet["!cols"]).toEqual([{ wch: 30 }, { wch: 18 }])
  })

  it("emits empty data section when rows is empty (header only)", () => {
    const rows: any[] = []
    const cols: ExcelColumn[] = [
      { header: "A", key: "a" },
      { header: "B", key: "b" },
    ]
    exportToExcel(rows, cols, "out.xlsx", "Sheet1")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa).toEqual([["A", "B"]]) // header only, no data rows
  })
})

// ── Tests: downloadTemplate ──────────────────────────────────────────────
describe("downloadTemplate — template generation", () => {
  let capturedWb: any

  beforeEach(() => {
    capturedWb = null
    mockWriteFile.mockReset()
    mockWriteFile.mockImplementation((wb: any, _filename: string) => {
      capturedWb = wb
      return undefined
    })
  })

  afterEach(() => {
    mockWriteFile.mockReset()
  })

  it("emits header row only when exampleRows is omitted", () => {
    const cols: ExcelColumn[] = [
      { header: "Name", key: "name" },
      { header: "Price", key: "price" },
    ]
    downloadTemplate(cols, "template.xlsx", "Template")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa).toEqual([["Name", "Price"]])
  })

  it("emits example rows under the header when provided", () => {
    const cols: ExcelColumn[] = [
      { header: "Name", key: "name" },
      { header: "Price", key: "price" },
    ]
    downloadTemplate(cols, "template.xlsx", "Template", [
      { name: "Apple", price: 10 },
      { name: "Banana", price: 5 },
    ])

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa).toEqual([
      ["Name", "Price"],
      ["Apple", 10],
      ["Banana", 5],
    ])
  })

  it("uses column widths defaulting to 22 (wider than exportToExcel)", () => {
    const cols: ExcelColumn[] = [{ header: "Name", key: "name" /* no width */ }]
    downloadTemplate(cols, "template.xlsx", "Template")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    expect(sheet["!cols"]).toEqual([{ wch: 22 }])
  })

  it("uses the explicit column width when provided", () => {
    const cols: ExcelColumn[] = [
      { header: "Name", key: "name", width: 40 },
    ]
    downloadTemplate(cols, "template.xlsx", "Template")

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    expect(sheet["!cols"]).toEqual([{ wch: 40 }])
  })

  it("falls back to empty string for missing keys in example rows", () => {
    const cols: ExcelColumn[] = [
      { header: "Name", key: "name" },
      { header: "Note", key: "note" },
    ]
    downloadTemplate(cols, "template.xlsx", "Template", [
      { name: "X" /* no note */ },
    ])

    const sheet = capturedWb.Sheets[capturedWb.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
    expect(aoa[1]).toEqual(["X", ""])
  })

  it("appends '.xlsx' to filename when missing", () => {
    const cols: ExcelColumn[] = [{ header: "A", key: "a" }]
    downloadTemplate(cols, "template", "Template")

    const filename = mockWriteFile.mock.calls[0][1]
    expect(filename).toBe("template.xlsx")
  })
})

// ── Tests: import-row validation (route handler's skip rule) ─────────────
// The route handler `src/app/api/excel/import-products/route.ts` reads each
// parsed row, extracts `name = String(row["الاسم"] ?? row["name"] ?? "").trim()`,
// and skips the row (without creating a product) when `name` is empty.
// The route doesn't export this helper, so we re-state it here as a pure
// function and test that the parsing + validation pipeline correctly
// identifies missing-name rows. This mirrors exactly the route's logic.
describe("import-row validation — reject rows missing required fields", () => {
  /** Re-implementation of the route's per-row name extraction + validation. */
  function extractName(row: Record<string, any>): string {
    return String(row["الاسم"] ?? row["name"] ?? "").trim()
  }

  it("row with 'name' key → name extracted", () => {
    expect(extractName({ name: "Apple" })).toBe("Apple")
  })

  it("row with Arabic 'الاسم' key → name extracted (Arabic takes precedence in fallback)", () => {
    // The `??` operator returns the LEFT side if it's not null/undefined,
    // so when BOTH keys are present, "الاسم" wins.
    expect(extractName({ "الاسم": "برتقال", name: "Orange" })).toBe("برتقال")
  })

  it("row with Arabic 'الاسم' only → name extracted", () => {
    expect(extractName({ "الاسم": "برتقال" })).toBe("برتقال")
  })

  it("row with whitespace-only name → empty string (will be skipped)", () => {
    expect(extractName({ name: "   " })).toBe("")
  })

  it("row with no name and no 'الاسم' key → empty string (will be skipped)", () => {
    expect(extractName({ price: 10 })).toBe("")
  })

  it("row with name = 0 (number) → coerced to '0' (NOT skipped — name is truthy string)", () => {
    // Edge case: `String(0)` is "0", which is truthy. The route would NOT
    // skip this row (though a product named "0" is dubious).
    expect(extractName({ name: 0 })).toBe("0")
  })

  it("end-to-end: parse a sheet with mixed rows → only rows with a name pass validation", async () => {
    // Build a sheet with 4 rows: 2 have names, 1 has whitespace-only, 1 has no name column.
    const buf = buildXlsxBuffer([
      ["name", "price"],
      ["Apple", 10], // valid
      ["   ", 20], // whitespace-only → skip
      ["Banana", 5], // valid
      [/* missing name cell */ "", 99], // empty name → skip
    ])
    const rows = await parseExcelFile(bufferToFile(buf, "test.xlsx"))

    // All 4 rows parsed (the empty cell becomes "" via defval).
    expect(rows).toHaveLength(4)

    // Apply the route's validation: keep only rows with a non-empty name.
    const valid = rows.filter((r) => extractName(r) !== "")
    expect(valid).toHaveLength(2)
    expect(valid.map((r) => r.name)).toEqual(["Apple", "Banana"])

    // Skipped rows (whitespace-only + empty) → 2
    const skipped = rows.filter((r) => extractName(r) === "")
    expect(skipped).toHaveLength(2)
  })
})

// ── Tests: file-extension validation (route handler's gate) ─────────────
// The route handler rejects files whose name doesn't end with .xlsx/.xls/.csv
// with a 400 invalid-file-type. The allowed list is:
//   [".xlsx", ".xls", ".csv"]
// We re-state that rule as a pure function and verify it covers the
// expected extensions.
describe("file-extension validation — accept only .xlsx/.xls/.csv", () => {
  const VALID_EXTENSIONS = [".xlsx", ".xls", ".csv"]

  function isValidFileType(fileName: string): boolean {
    const lower = (fileName || "").toLowerCase()
    return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext))
  }

  it("accepts .xlsx files", () => {
    expect(isValidFileType("products.xlsx")).toBe(true)
  })

  it("accepts .xls files (legacy Excel)", () => {
    expect(isValidFileType("old.xls")).toBe(true)
  })

  it("accepts .csv files", () => {
    expect(isValidFileType("data.csv")).toBe(true)
  })

  it("accepts files with uppercase extensions (case-insensitive)", () => {
    expect(isValidFileType("PRODUCTS.XLSX")).toBe(true)
    expect(isValidFileType("data.CSV")).toBe(true)
  })

  it("rejects .pdf files", () => {
    expect(isValidFileType("document.pdf")).toBe(false)
  })

  it("rejects .docx files", () => {
    expect(isValidFileType("notes.docx")).toBe(false)
  })

  it("rejects files with no extension", () => {
    expect(isValidFileType("no_extension_file")).toBe(false)
  })

  it("rejects empty filename", () => {
    expect(isValidFileType("")).toBe(false)
  })
})
