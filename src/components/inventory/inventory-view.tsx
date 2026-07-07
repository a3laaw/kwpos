"use client"

import * as React from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ProductFormDialog } from "@/components/inventory/product-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Boxes,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  PackageX,
  Filter,
  AlertTriangle,
  Barcode,
} from "lucide-react"
import { useUser } from "@/components/user-context"
import { printBarcodeLabels } from "@/lib/print"
import { MegaMenuBar, type MegaMenuGroup } from "@/components/shared/mega-menu-bar"
import { Breadcrumbs } from "@/components/shared/breadcrumbs"
import { WarehouseManager } from "@/components/inventory/warehouse-manager"
import { StockTakeTab } from "@/components/inventory/stock-take-tab"
import { StockTransferTab } from "@/components/inventory/stock-transfer-tab"
import { Warehouse as WarehouseIcon, ClipboardCheck, ArrowRightLeft } from "lucide-react"
import { ExcelExportButton, ExcelImportButton } from "@/components/shared/excel-buttons"
import { useProducts, useCategories, useDeleteProduct } from "@/hooks/use-api"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import type { Product } from "@/lib/types"

export function InventoryView() {
  const fmt = useFmt()
  const t = useT()
  const user = useUser()
  const [q, setQ] = React.useState("")
  const [categoryId, setCategoryId] = React.useState<string>("")
  const [lowStockOnly, setLowStockOnly] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)
  const [invTab, setInvTab] = React.useState<"products" | "warehouses" | "stocktake" | "transfers">("products")

  const debouncedQ = React.useDeferredValue(q)
  const { data, isLoading, isError, refetch } = useProducts({
    q: debouncedQ || undefined,
    categoryId: categoryId || undefined,
    lowStock: lowStockOnly || undefined,
  })
  const { data: cats } = useCategories()
  const deleteMut = useDeleteProduct()

  const canManage = user.role === "ADMIN" || user.role === "WAREHOUSE"

  const products = data?.items ?? []

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success(t.productDeleted)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(t.deleteFailed, { description: err?.message })
    }
  }

  function handlePrintBarcodes() {
    if (products.length === 0) {
      toast.error(t.noProductsToPrint)
      return
    }
    printBarcodeLabels(
      products.map((p) => ({ name: p.name, barcode: p.barcode, salePrice: p.salePrice })),
      1
    )
    toast.success(t.openingPrintWindow, {
      description: t.barcodeLabelsCount.replace("{count}", String(products.length)),
    })
  }

  const INV_TAB_LABELS: Record<string, any> = {
    products: "invItemsTab",
    warehouses: "warehouses",
    stocktake: "stockTakeTab",
    transfers: "stockTransferTab",
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { labelKey: "navInventory" },
          { labelKey: INV_TAB_LABELS[invTab] || "invItemsTab" },
        ]}
      />
      <PageHeader
        title={t.invManageTitle}
        description={t.invManageDesc}
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canManage ? <ExcelImportButton type="products" /> : null}
            <ExcelExportButton type="products" />
            {products.length > 0 ? (
              <Button variant="outline" onClick={handlePrintBarcodes} className="gap-2">
                <Barcode className="h-4 w-4" />
                <span className="hidden sm:inline">{t.printBarcode}</span>
              </Button>
            ) : null}
            {canManage ? (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.addProduct}
              </Button>
            ) : null}
          </div>
        }
      />

      <MegaMenuBar
        groups={[
          {
            labelKey: "invItemsTab",
            items: [
              { value: "products", labelKey: "invItemsTab", icon: Boxes },
              { value: "warehouses", labelKey: "warehouses", icon: WarehouseIcon },
            ],
          },
          {
            labelKey: "stockTakeTab",
            items: [
              { value: "stocktake", labelKey: "stockTakeTab", icon: ClipboardCheck },
              { value: "transfers", labelKey: "stockTransferTab", icon: ArrowRightLeft },
            ],
          },
        ]}
        value={invTab}
        onChange={(v) => setInvTab(v as typeof invTab)}
      />

      {invTab === "products" && (
        <div className="space-y-5">
      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchNameBarcodePlaceholder}
              className="pr-9"
            />
          </div>
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
            <SelectTrigger className="sm:w-48">
              <Filter className="h-4 w-4 ml-1 text-muted-foreground" />
              <SelectValue placeholder={t.allCategories} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allCategories}</SelectItem>
              {(cats?.items ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            onClick={() => setLowStockOnly((v) => !v)}
            className="gap-2 sm:w-auto"
          >
            <AlertTriangle className="h-4 w-4" />
            {t.nearOutOfStock}
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={7} />
          </div>
        ) : isError ? (
          <div className="p-4">
            <EmptyState
              title={t.productsLoadFailed}
              action={<Button onClick={() => refetch()}>{t.retry}</Button>}
            />
          </div>
        ) : products.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<PackageX className="h-7 w-7" />}
              title={lowStockOnly ? t.noLowStockProducts : t.noProducts}
              description={lowStockOnly ? t.noLowStockDesc : t.addFirstProduct}
              action={
                canManage ? (
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.addProduct}
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[180px]">{t.colProduct}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.colBarcode}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.colCategory}</TableHead>
                  <TableHead className="text-center">{t.colQty}</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">{t.colReorderLevel}</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">{t.colCostPrice}</TableHead>
                  <TableHead className="text-center">{t.colSalePrice}</TableHead>
                  {canManage ? <TableHead className="w-12 text-center"></TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const low = p.quantity <= p.reorderLevel
                  const critical = p.quantity <= Math.ceil(p.reorderLevel / 2)
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {p.categoryName || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs" dir="ltr">
                        {p.barcode || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {p.categoryName ? (
                          <Badge variant="outline">{p.categoryName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={critical ? "destructive" : low ? "secondary" : "outline"}
                          className="tabular-nums"
                        >
                          {fmt.number(p.quantity)} {p.unit}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center tabular-nums text-muted-foreground">
                        {fmt.number(p.reorderLevel)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center tabular-nums text-muted-foreground">
                        {fmt.currency(p.costPrice)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-semibold">
                        {fmt.currency(p.salePrice)}
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(p)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                {t.edit}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(p)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        {t.productsCountLabel.replace("{count}", String(fmt.number(products.length)))}
      </p>
      </div>
      )}

      {invTab === "warehouses" && <WarehouseManager />}
      {invTab === "stocktake" && <StockTakeTab />}
      {invTab === "transfers" && <StockTransferTab />}

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t.deleteProductTitle}
        description={
          <>
            {t.deleteProductPermanent.replace("{name}", deleteTarget?.name ?? "")}
          </>
        }
        confirmText={t.delete}
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
