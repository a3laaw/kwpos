"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Plus,
  Trash2,
  Loader2,
  FileText,
  ChevronDown,
  Truck,
  Tags,
  PackageCheck,
  AlertTriangle,
} from "lucide-react"
import {
  useSuppliers,
  useProducts,
  useCategories,
  useWarehouses,
  usePurchaseOrders,
  useCreatePurchaseInvoice,
  type CreatePurchaseInvoiceBody,
} from "@/hooks/use-api"
import type { PurchaseOrder } from "@/lib/types"
import { useFmt } from "@/components/currency-context"
import { useT } from "@/components/i18n-context"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface LineItem {
  key: string
  productId: string
  purchaseOrderItemId?: string | null
  quantity: string
  unitCost: string
}

let keySeq = 0
const makeKey = () => `pi-row-${++keySeq}`

/** Props for pre-filling the dialog from a PO (used by the
 *  "Receive & Create Invoice" action on the PO list / detail). */
export interface PurchaseInvoicePrefill {
  purchaseOrderId?: string
  supplierId?: string
  warehouseId?: string | null
  items?: Array<{
    productId: string
    productName?: string | null
    quantity: number
    unitCost: number
    purchaseOrderItemId?: string
  }>
}

export function PurchaseInvoiceDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional pre-fill (used by "Receive & Create Invoice" on a PO). */
  prefill?: PurchaseInvoicePrefill | null
}) {
  const fmt = useFmt()
  const t = useT()
  const { data: sups } = useSuppliers()
  const { data: prods } = useProducts()
  const { data: catsData } = useCategories()
  const { data: whsData } = useWarehouses()
  const { data: posData } = usePurchaseOrders()
  const createMut = useCreatePurchaseInvoice()

  const [supplierId, setSupplierId] = React.useState("")
  const [warehouseId, setWarehouseId] = React.useState("")
  const [purchaseOrderId, setPurchaseOrderId] = React.useState("")
  const [invoiceDate, setInvoiceDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  )
  const [taxRate, setTaxRate] = React.useState("0")
  const [discount, setDiscount] = React.useState("")
  const [shipping, setShipping] = React.useState("")
  const [customs, setCustoms] = React.useState("")
  const [other, setOther] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "BANK" | "CREDIT">("CASH")
  const [note, setNote] = React.useState("")
  const [items, setItems] = React.useState<LineItem[]>([
    { key: makeKey(), productId: "", quantity: "1", unitCost: "0" },
  ])
  const [extraOpen, setExtraOpen] = React.useState(false)
  const [categoryFilter, setCategoryFilter] = React.useState("all")
  // Confirmation dialog before posting (warns about stock updates)
  const [postConfirmOpen, setPostConfirmOpen] = React.useState(false)
  const [pendingPost, setPendingPost] = React.useState(false)

  const products = prods?.items ?? []
  const suppliers = sups?.items ?? []
  const categories = catsData?.items ?? []
  const warehouses = (whsData?.items ?? []).filter((w) => w.isActive)
  const allPOs = posData?.items ?? []
  // Only POs that are APPROVED or PENDING (not yet received/cancelled/rejected)
  // can be linked to a new purchase invoice.
  const linkablePOs = allPOs.filter(
    (p) => p.status === "APPROVED" || p.status === "PENDING"
  )

  function resetForm() {
    setSupplierId("")
    setWarehouseId("")
    setPurchaseOrderId("")
    setInvoiceDate(new Date().toISOString().slice(0, 10))
    setTaxRate("0")
    setDiscount("")
    setShipping("")
    setCustoms("")
    setOther("")
    setPaymentMethod("CASH")
    setNote("")
    setItems([{ key: makeKey(), productId: "", quantity: "1", unitCost: "0" }])
    setExtraOpen(false)
    setCategoryFilter("all")
    setPendingPost(false)
  }

  // Reset on open + apply prefill when provided (e.g. from a PO).
  React.useEffect(() => {
    if (!open) return
    if (prefill) {
      setSupplierId(prefill.supplierId || "")
      setWarehouseId(prefill.warehouseId || "")
      setPurchaseOrderId(prefill.purchaseOrderId || "")
      setInvoiceDate(new Date().toISOString().slice(0, 10))
      setTaxRate("0")
      setDiscount("")
      setShipping("")
      setCustoms("")
      setOther("")
      setNote("")
      setExtraOpen(false)
      setCategoryFilter("all")
      setPendingPost(false)
      if (prefill.items && prefill.items.length > 0) {
        setItems(
          prefill.items.map((it) => ({
            key: makeKey(),
            productId: it.productId,
            purchaseOrderItemId: it.purchaseOrderItemId ?? null,
            quantity: String(it.quantity),
            unitCost: String(it.unitCost),
          }))
        )
      } else {
        setItems([{ key: makeKey(), productId: "", quantity: "1", unitCost: "0" }])
      }
    } else {
      resetForm()
    }
  }, [open, prefill])

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((arr) =>
      arr.map((it) => (it.key === key ? { ...it, ...patch } : it))
    )
  }
  function selectProduct(key: string, productId: string) {
    const p = products.find((x) => x.id === productId)
    updateItem(key, {
      productId,
      unitCost: p ? String(p.costPrice) : "0",
    })
  }
  function addRow() {
    setItems((arr) => [
      ...arr,
      { key: makeKey(), productId: "", quantity: "1", unitCost: "0" },
    ])
  }
  function removeRow(key: string) {
    setItems((arr) => (arr.length > 1 ? arr.filter((it) => it.key !== key) : arr))
  }

  /** Import items from the currently selected PO. Replaces existing rows. */
  function importFromPO() {
    if (!purchaseOrderId) {
      toast.error(t.piSelectPO)
      return
    }
    const po = allPOs.find((p) => p.id === purchaseOrderId) as
      | PurchaseOrder
      | undefined
    if (!po) {
      toast.error(t.piSelectPO)
      return
    }
    // Prefill supplier/warehouse from the PO if not already set
    if (!supplierId && po.supplierId) setSupplierId(po.supplierId)
    if (po.items.length === 0) {
      toast.info(t.piNoPO)
      return
    }
    setItems(
      po.items.map((it) => ({
        key: makeKey(),
        productId: it.productId,
        purchaseOrderItemId: it.id,
        quantity: String(it.quantity),
        unitCost: String(it.unitCost),
      }))
    )
    toast.success(t.piImportFromPO)
  }

  const subtotal = items.reduce((acc, it) => {
    if (!it.productId) return acc
    return acc + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0)
  }, 0)
  const taxRateNum = Number(taxRate) || 0
  const taxAmount = (subtotal * taxRateNum) / 100
  const discountNum = Number(discount) || 0
  const shippingNum = Number(shipping) || 0
  const customsNum = Number(customs) || 0
  const otherNum = Number(other) || 0
  const total =
    subtotal + taxAmount + shippingNum + customsNum + otherNum - discountNum
  const extraTotal = shippingNum + customsNum + otherNum

  const selectedProductIds = new Set(
    items.map((it) => it.productId).filter(Boolean)
  )
  const filteredProducts = products.filter(
    (p) =>
      categoryFilter === "all" ||
      p.categoryId === categoryFilter ||
      selectedProductIds.has(p.id)
  )

  // Pre-compute Combobox option lists (high-volume selectors).
  const supplierOptions = React.useMemo<ComboboxOption[]>(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  )
  const productOptions = React.useMemo<ComboboxOption[]>(
    () => filteredProducts.map((p) => ({ value: p.id, label: p.name })),
    [filteredProducts]
  )
  const poOptions = React.useMemo<ComboboxOption[]>(
    () => [
      { value: "none", label: t.piNoPO },
      ...linkablePOs.map((p) => ({
        value: p.id,
        label: `PO-${p.id.slice(-6).toUpperCase()} — ${p.supplierName}`,
      })),
    ],
    [linkablePOs, t.piNoPO]
  )

  const validItems = items.filter(
    (it) => it.productId && Number(it.quantity) > 0
  )

  function buildBody(post: boolean): CreatePurchaseInvoiceBody | null {
    if (!supplierId) {
      toast.error(t.selectSupplierFirst)
      return null
    }
    if (validItems.length === 0) {
      toast.error(t.addAtLeastOneProduct)
      return null
    }
    return {
      supplierId,
      warehouseId: warehouseId || null,
      purchaseOrderId: purchaseOrderId || null,
      invoiceDate: new Date(invoiceDate).toISOString(),
      taxRate: taxRateNum,
      discount: discountNum,
      shipping: shippingNum,
      customs: customsNum,
      otherCharges: otherNum,
      note: note.trim() || null,
      paymentMethod,
      items: validItems.map((it) => ({
        productId: it.productId,
        purchaseOrderItemId: it.purchaseOrderItemId ?? null,
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
      })),
      post,
    }
  }

  async function submit(body: CreatePurchaseInvoiceBody, post: boolean) {
    try {
      await createMut.mutateAsync(body)
      toast.success(post ? t.piPostedSuccess : t.piCreated)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(post ? t.piPostedSuccess : t.piCreated, {
        description: err?.message,
      })
    }
  }

  async function handleSaveDraft() {
    const body = buildBody(false)
    if (!body) return
    await submit(body, false)
  }

  function handleSavePostClick() {
    const body = buildBody(true)
    if (!body) return
    setPendingPost(true)
    setPostConfirmOpen(true)
  }

  async function handleConfirmPost() {
    const body = buildBody(true)
    if (!body) {
      setPostConfirmOpen(false)
      setPendingPost(false)
      return
    }
    setPostConfirmOpen(false)
    await submit(body, true)
    setPendingPost(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t.piNew}
            </DialogTitle>
            <DialogDescription>{t.piDesc}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveDraft()
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.supplier} *</Label>
                <Combobox
                  value={supplierId}
                  onValueChange={setSupplierId}
                  placeholder={t.piSelectSupplier}
                  searchPlaceholder={t.piSelectSupplier}
                  options={supplierOptions}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.piSelectWarehouse}</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.piSelectWarehouse} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.piSelectPO}</Label>
                <div className="flex gap-2">
                  <Combobox
                    value={purchaseOrderId}
                    onValueChange={setPurchaseOrderId}
                    placeholder={t.piNoPO}
                    searchPlaceholder={t.piNoPO}
                    className="flex-1"
                    options={poOptions}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={importFromPO}
                    disabled={!purchaseOrderId || purchaseOrderId === "none"}
                    className="gap-1.5 shrink-0"
                  >
                    <PackageCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.piImportFromPO}</span>
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pi-date">{t.date}</Label>
                <Input
                  id="pi-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>{t.piItems}</Label>
                <div className="flex items-center gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <Tags className="h-3 w-3 text-muted-foreground ms-1 me-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allCategories}</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRow}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.piAddItem}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-thin pl-1">
                {items.map((it) => {
                  const lineSub =
                    (Number(it.quantity) || 0) * (Number(it.unitCost) || 0)
                  return (
                    <div
                      key={it.key}
                      className="rounded-lg border border-border/60 bg-muted/20 p-2 space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-6 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {t.product}
                          </Label>
                          <Combobox
                            value={it.productId}
                            onValueChange={(v) => selectProduct(it.key, v)}
                            placeholder={t.selectProduct}
                            searchPlaceholder={t.selectProduct}
                            className="h-9"
                            options={productOptions}
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {t.qty}
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            className="h-9"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(it.key, { quantity: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {t.unitPrice}
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            inputMode="decimal"
                            className="h-9"
                            value={it.unitCost}
                            onChange={(e) =>
                              updateItem(it.key, { unitCost: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1 text-center">
                          <p className="text-xs text-muted-foreground mb-1.5">
                            {t.colTotal}
                          </p>
                          <p className="text-xs font-semibold tabular-nums">
                            {fmt.currency(lineSub)}
                          </p>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => removeRow(it.key)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Collapsible
              open={extraOpen}
              onOpenChange={setExtraOpen}
              className="rounded-lg border border-border/60"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start hover:bg-muted/40 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4 text-primary" />
                    {t.piLandedCost}
                    {extraTotal > 0 ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        (+{fmt.currency(extraTotal)})
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      extraOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/60 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pi-shipping" className="text-xs text-muted-foreground">
                      {t.shipping}
                    </Label>
                    <Input
                      id="pi-shipping"
                      type="number"
                      min={0}
                      step="0.001"
                      inputMode="decimal"
                      placeholder="0"
                      value={shipping}
                      onChange={(e) => setShipping(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pi-customs" className="text-xs text-muted-foreground">
                      {t.customs}
                    </Label>
                    <Input
                      id="pi-customs"
                      type="number"
                      min={0}
                      step="0.001"
                      inputMode="decimal"
                      placeholder="0"
                      value={customs}
                      onChange={(e) => setCustoms(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pi-other" className="text-xs text-muted-foreground">
                      {t.otherFees}
                    </Label>
                    <Input
                      id="pi-other"
                      type="number"
                      min={0}
                      step="0.001"
                      inputMode="decimal"
                      placeholder="0"
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Payment Method — determines the credit account in the journal:
                CASH → 1010, BANK → 1020, CREDIT → 2010 (آجل) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t.piPaymentMethod}
              </Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "CASH" | "BANK" | "CREDIT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t.piPaymentCash}</SelectItem>
                  <SelectItem value="BANK">{t.piPaymentBank}</SelectItem>
                  <SelectItem value="CREDIT">{t.piPaymentCredit}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pi-tax" className="text-xs text-muted-foreground">
                  {t.taxRate} %
                </Label>
                <Input
                  id="pi-tax"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pi-discount" className="text-xs text-muted-foreground">
                  {t.discount}
                </Label>
                <Input
                  id="pi-discount"
                  type="number"
                  min={0}
                  step="0.001"
                  inputMode="decimal"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pi-note" className="text-xs text-muted-foreground">
                {t.note}
              </Label>
              <Textarea
                id="pi-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.optional}
              />
            </div>

            <div className="space-y-2 rounded-lg bg-primary/5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.piSubtotal}</span>
                <span className="font-medium tabular-nums">
                  {fmt.currency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t.piTaxAmount} ({taxRateNum}%)
                </span>
                <span className="font-medium tabular-nums">
                  {fmt.currency(taxAmount)}
                </span>
              </div>
              {extraTotal > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.piLandedCost}</span>
                  <span className="font-medium tabular-nums">
                    {fmt.currency(extraTotal)}
                  </span>
                </div>
              ) : null}
              {discountNum > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.discount}</span>
                  <span className="font-medium tabular-nums text-destructive">
                    −{fmt.currency(discountNum)}
                  </span>
                </div>
              ) : null}
              <Separator className="my-1" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.piTotal}</span>
                <span className="text-lg font-bold tabular-nums text-primary">
                  {fmt.currency(total)}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMut.isPending}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={createMut.isPending}
                className="gap-1.5"
              >
                {createMut.isPending && !pendingPost ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t.piSaveDraft}
              </Button>
              <Button
                type="button"
                onClick={handleSavePostClick}
                disabled={createMut.isPending}
                className="gap-1.5"
              >
                {createMut.isPending && pendingPost ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                {t.piSavePost}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={postConfirmOpen}
        onOpenChange={(o) => {
          setPostConfirmOpen(o)
          if (!o) setPendingPost(false)
        }}
        title={t.piSavePost}
        description={
          <span className="flex items-start gap-2 text-sm leading-relaxed">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{t.piPostConfirm}</span>
          </span>
        }
        confirmText={t.piPost}
        destructive={false}
        loading={createMut.isPending && pendingPost}
        onConfirm={handleConfirmPost}
      />
    </>
  )
}
