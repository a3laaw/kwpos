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

const PRODUCT_COLUMNS: ExcelColumn[] = [
  { header: "الاسم", key: "name", width: 28 },
  { header: "الباركود", key: "barcode", width: 16 },
  { header: "الفئة", key: "category", width: 16 },
  { header: "الكمية", key: "quantity", width: 10 },
  { header: "حد الطلب", key: "reorder", width: 10 },
  { header: "سعر التكلفة", key: "cost", width: 12 },
  { header: "سعر البيع", key: "sale", width: 12 },
  { header: "الوحدة", key: "unit", width: 10 },
]

const CUSTOMER_COLUMNS: ExcelColumn[] = [
  { header: "الاسم", key: "name", width: 24 },
  { header: "الهاتف", key: "phone", width: 16 },
  { header: "العنوان", key: "address", width: 30 },
]

/** Export button — downloads the given entity type as .xlsx */
export function ExcelExportButton({
  type,
  from,
  to,
  label = "تصدير",
}: {
  type: "sales" | "products" | "journal" | "customers" | "suppliers"
  from?: string
  to?: string
  label?: string
}) {
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
            onSuccess: () => toast.success("تم تصدير الملف إلى Excel"),
            onError: () => toast.error("فشل التصدير"),
          }
        )
      }
    >
      {exportMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{label}</span>
      <FileSpreadsheet className="h-3.5 w-3.5 text-[#5CDE9D]" />
    </Button>
  )
}

/** Import button — uploads an .xlsx file and imports rows */
export function ExcelImportButton({ type }: { type: "products" | "customers" }) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const importProducts = useImportProducts()
  const importCustomers = useImportCustomers()

  const mut = type === "products" ? importProducts : importCustomers
  const columns = type === "products" ? PRODUCT_COLUMNS : CUSTOMER_COLUMNS

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    mut.mutate(file, {
      onSuccess: (res: any) => {
        toast.success("تم الاستيراد بنجاح", {
          description: `جُلب: ${res.total} • أُنشئ: ${res.created} • حُدّث: ${res.updated} • تخطّي: ${res.skipped}`,
        })
      },
      onError: (err: any) => toast.error("فشل الاستيراد", { description: err?.message }),
    })
    // reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ""
  }

  function downloadTemp() {
    downloadTemplate(columns, `${type}-template.xlsx`, type === "products" ? "الأصناف" : "العملاء")
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">استيراد</span>
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#055BE5]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> رفع ملف Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemp} className="gap-2">
            <Download className="h-4 w-4" /> تنزيل قالب فارغ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
