"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Upload, Loader2, FileSpreadsheet } from "lucide-react"
import { useExportExcel, useImportProducts, useImportCustomers } from "@/hooks/use-api"
import { downloadTemplate, type ExcelColumn } from "@/lib/excel"
import { useT } from "@/components/i18n-context"

/** Build the product template columns using the active locale's dictionary. */
function buildProductColumns(t: ReturnType<typeof useT>): ExcelColumn[] {
  return [
    { header: t.colName, key: "name", width: 28 },
    { header: t.colBarcode, key: "barcode", width: 16 },
    { header: t.colCategory, key: "category", width: 16 },
    { header: t.colQty, key: "quantity", width: 10 },
    { header: t.colReorderLevel, key: "reorder", width: 10 },
    { header: t.colCostPrice, key: "cost", width: 12 },
    { header: t.colSalePrice, key: "sale", width: 12 },
    { header: t.colUnit, key: "unit", width: 10 },
    { header: "رابط الصورة", key: "imageUrl", width: 40 },
  ]
}

/** Build the customer template columns using the active locale's dictionary. */
function buildCustomerColumns(t: ReturnType<typeof useT>): ExcelColumn[] {
  return [
    { header: t.colName, key: "name", width: 24 },
    { header: t.phone, key: "phone", width: 16 },
    { header: t.address, key: "address", width: 30 },
  ]
}

/** Export button — downloads the given entity type as .xlsx */
export function ExcelExportButton({
  type,
  from,
  to,
  label,
}: {
  type: "sales" | "products" | "journal" | "customers" | "suppliers"
  from?: string
  to?: string
  label?: string
}) {
  const t = useT()
  const exportMut = useExportExcel()
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={exportMut.isPending}
      onClick={() =>
        exportMut.mutate(
          { type, from, to },
          {
            onSuccess: () => toast.success(t.exportedToExcel),
            onError: (err: any) => toast.error(t.exportFailed, {
              description: err?.message || "حدث خطأ غير متوقع",
            }),
          }
        )
      }
    >
      {exportMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{label ?? t.export}</span>
      <FileSpreadsheet className="h-3.5 w-3.5 text-[#DFC196]" />
    </Button>
  )
}

/** Import button — uploads an .xlsx file and imports rows */
export function ExcelImportButton({ type }: { type: "products" | "customers" }) {
  const t = useT()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const importProducts = useImportProducts()
  const importCustomers = useImportCustomers()

  const mut = type === "products" ? importProducts : importCustomers
  // Build columns lazily so they pick up the current locale on every render.
  const columns = type === "products" ? buildProductColumns(t) : buildCustomerColumns(t)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    mut.mutate(file, {
      onSuccess: (res: any) => {
        toast.success(t.importSucceeded, {
          description: t.importSummary
            .replace("{total}", String(res?.total ?? 0))
            .replace("{created}", String(res?.created ?? 0))
            .replace("{updated}", String(res?.updated ?? 0))
            .replace("{skipped}", String(res?.skipped ?? 0)),
        })
      },
      onError: (err: any) => toast.error(t.importFailed, { description: err?.message }),
    })
    // reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ""
  }

  function downloadTemp() {
    // For the products template, include 2 example rows that demonstrate:
    //   1) A root-level category (no parent)
    //   2) A nested child category using "أب > ابن" format
    //   3) The image-URL column with a sample direct link
    // The user deletes these rows before filling in real data.
    const exampleRows =
      type === "products"
        ? [
            {
              name: "عطر رجالي فاخر",
              barcode: "6281000012345",
              category: "عطور > عطور رجالية",
              quantity: 50,
              reorder: 10,
              cost: 15,
              sale: 35,
              unit: "قطعة",
              imageUrl: "https://example.com/images/perfume1.jpg",
            },
            {
              name: "بخور عود",
              barcode: "6281000056789",
              category: "بخور",
              quantity: 30,
              reorder: 5,
              cost: 20,
              sale: 45,
              unit: "علبة",
              imageUrl: "",
            },
          ]
        : undefined
    downloadTemplate(columns, `${type}-template.xlsx`, type === "products" ? t.products : t.customers, exampleRows)
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{t.import}</span>
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#2E6237]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> {t.uploadExcelFile}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemp} className="gap-2">
            <Download className="h-4 w-4" /> {t.downloadEmptyTemplate}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
