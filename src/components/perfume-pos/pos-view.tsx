"use client"

import * as React from "react"
import { useState } from "react"
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Pause,
  RotateCcw,
  LayoutGrid,
  Package,
  FileText,
  Users,
  BarChart3,
  Warehouse,
  Settings,
  Bell,
  ChevronLeft,
  Sparkles,
  Tag,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  ScanLine,
  User2,
  LogOut,
  Menu,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Stock = "in" | "low" | "out"

interface Perfume {
  id: string
  name: string
  brand: string
  category: string
  price: number
  volume: string
  stock: Stock
  stockLabel: string
  qty: number
  image?: string
  hue: string
}

const colorPalette = [
  { name: "أبيض نقي", hex: "#FFFFFF", role: "الخلفية الرئيسية", text: "#1A1A1A", border: true },
  { name: "أخضر داكن", hex: "#2E6237", role: "اللون الأساسي", text: "#FFFFFF", border: false },
  { name: "ذهبي", hex: "#DFC196", role: "لمسات ذهبية", text: "#1A1A1A", border: false },
  { name: "أصفر ذهبي", hex: "#F9DC7C", role: "إبراز فاتح", text: "#1A1A1A", border: false },
  { name: "بيج ناعم", hex: "#F9EDC5", role: "تظليل خفيف", text: "#1A1A1A", border: false },
  { name: "أسود فحمي", hex: "#1A1A1A", role: "النصوص", text: "#FFFFFF", border: false },
]

const categories = [
  { id: "all", name: "الكل", count: 8 },
  { id: "oriental", name: "عطور شرقية", count: 3 },
  { id: "floral", name: "عطور زهرية", count: 2 },
  { id: "woody", name: "عطور خشبية", count: 2 },
  { id: "fresh", name: "عطور منعشة", count: 1 },
]

const products: Perfume[] = [
  {
    id: "p1",
    name: "عود ملكي",
    brand: "دار العطور",
    category: "oriental",
    price: 85.0,
    volume: "100 مل",
    stock: "in",
    stockLabel: "متوفر",
    qty: 24,
    image: "/perfumes/oud.png",
    hue: "#2E6237",
  },
  {
    id: "p2",
    name: "ورد الطائف",
    brand: "دار العطور",
    category: "floral",
    price: 65.0,
    volume: "75 مل",
    stock: "in",
    stockLabel: "متوفر",
    qty: 18,
    image: "/perfumes/rose.png",
    hue: "#C76B8A",
  },
  {
    id: "p3",
    name: "مسك الطهارة",
    brand: "أصالة",
    category: "fresh",
    price: 45.0,
    volume: "50 مل",
    stock: "low",
    stockLabel: "كمية محدودة",
    qty: 5,
    image: "/perfumes/musk.png",
    hue: "#9CA3AF",
  },
  {
    id: "p4",
    name: "زعفران ذهبي",
    brand: "دار العطور",
    category: "oriental",
    price: 110.0,
    volume: "100 مل",
    stock: "in",
    stockLabel: "متوفر",
    qty: 12,
    image: "/perfumes/saffron.png",
    hue: "#DFC196",
  },
  {
    id: "p5",
    name: "عنبر فاخر",
    brand: "أصالة",
    category: "oriental",
    price: 95.0,
    volume: "100 مل",
    stock: "out",
    stockLabel: "نفد المخزون",
    qty: 0,
    hue: "#8B5A2B",
  },
  {
    id: "p6",
    name: "ياسمين الليل",
    brand: "دار العطور",
    category: "floral",
    price: 55.0,
    volume: "75 مل",
    stock: "in",
    stockLabel: "متوفر",
    qty: 21,
    hue: "#E8B4D0",
  },
  {
    id: "p7",
    name: "صندل هندي",
    brand: "أصالة",
    category: "woody",
    price: 75.0,
    volume: "100 مل",
    stock: "low",
    stockLabel: "كمية محدودة",
    qty: 4,
    hue: "#A0522D",
  },
  {
    id: "p8",
    name: "العنبر الأبيض",
    brand: "دار العطور",
    category: "woody",
    price: 70.0,
    volume: "75 مل",
    stock: "in",
    stockLabel: "متوفر",
    qty: 16,
    hue: "#D4C5A0",
  },
]

const navItems = [
  { id: "pos", name: "نقطة البيع", icon: LayoutGrid, badge: null as string | null },
  { id: "products", name: "المنتجات", icon: Package, badge: "8" },
  { id: "invoices", name: "الفواتير", icon: FileText, badge: null },
  { id: "customers", name: "العملاء", icon: Users, badge: null },
  { id: "reports", name: "التقارير", icon: BarChart3, badge: null },
  { id: "inventory", name: "المخزون", icon: Warehouse, badge: "2" },
  { id: "settings", name: "الإعدادات", icon: Settings, badge: null },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtKwd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const stockStyles: Record<
  Stock,
  { dot: string; chip: string; text: string; icon: React.ElementType }
> = {
  in: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
    icon: CheckCircle2,
  },
  low: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700",
    icon: Clock,
  },
  out: {
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-600 border-red-200",
    text: "text-red-600",
    icon: XCircle,
  },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CartLine {
  perfume: Perfume
  qty: number
}

export function PerfumePOS() {
  const [activeNav, setActiveNav] = useState("pos")
  const [activeCat, setActiveCat] = useState("all")
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartLine[]>([
    { perfume: products[0], qty: 1 },
    { perfume: products[3], qty: 2 },
  ])
  const [discountPct, setDiscountPct] = useState(5)

  const filtered = products.filter((p) => {
    const catOk = activeCat === "all" || p.category === activeCat
    const qOk =
      query.trim() === "" ||
      p.name.includes(query) ||
      p.brand.includes(query)
    return catOk && qOk
  })

  const addToCart = (p: Perfume) => {
    if (p.stock === "out") return
    setCart((prev) => {
      const found = prev.find((l) => l.perfume.id === p.id)
      if (found)
        return prev.map((l) =>
          l.perfume.id === p.id ? { ...l, qty: l.qty + 1 } : l
        )
      return [...prev, { perfume: p, qty: 1 }]
    })
  }

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.perfume.id === id ? { ...l, qty: l.qty + delta } : l
        )
        .filter((l) => l.qty > 0)
    )
  }

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.perfume.id !== id))

  const clearCart = () => setCart([])

  const subtotal = cart.reduce((s, l) => s + l.perfume.price * l.qty, 0)
  const discount = (subtotal * discountPct) / 100
  const vat = 0 // Kuwait: no VAT in this demo
  const total = subtotal - discount + vat
  const totalItems = cart.reduce((s, l) => s + l.qty, 0)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ============================ HEADER ============================ */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[#F0F0F0]">
        <div className="px-5 lg:px-8 h-16 flex items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden grid place-items-center h-10 w-10 rounded-xl border border-[#F0F0F0] text-[#1A1A1A] hover:bg-[#FAFAFA] transition"
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-[#2E6237] to-[#1F4A26] grid place-items-center shadow-[0_4px_14px_rgba(46,98,55,0.25)]">
                <Sparkles className="h-5 w-5 text-[#F9DC7C]" />
                <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-[#DFC196] ring-2 ring-white" />
              </div>
              <div className="leading-tight">
                <div className="font-extrabold text-[15px] text-[#1A1A1A] tracking-tight">
                  دار العطور
                </div>
                <div className="text-[11px] text-[#6B6B6B] font-medium">
                  الكويت · نقطة البيع
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-auto">
            <div className="relative w-full group">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9B9B9B] group-focus-within:text-[#2E6237] transition-colors" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن عطر، علامة تجارية، أو باركود..."
                className="w-full h-11 rounded-xl bg-[#F7F7F5] border border-[#F0F0F0] pr-10 pl-24 text-sm text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#2E6237] focus:bg-white focus:ring-4 focus:ring-[#2E6237]/8 transition-all"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden lg:inline-flex items-center gap-1 px-2 h-7 rounded-md bg-white border border-[#ECECEC] text-[11px] font-semibold text-[#6B6B6B]">
                  <ScanLine className="h-3 w-3" /> مسح
                </kbd>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ms-auto md:ms-0">
            <button className="relative grid place-items-center h-10 w-10 rounded-xl border border-[#F0F0F0] text-[#1A1A1A] hover:bg-[#FAFAFA] hover:-translate-y-0.5 transition-all">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#DFC196] ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-2.5 ps-2 border-s border-[#F0F0F0]">
              <div className="hidden sm:block text-end leading-tight">
                <div className="text-[13px] font-bold text-[#1A1A1A]">
                  نورا العنزي
                </div>
                <div className="text-[11px] text-[#6B6B6B]">
                  مديرة الفرع
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#DFC196] to-[#F9DC7C] grid place-items-center text-[#1A1A1A] font-bold text-sm shadow-[0_3px_10px_rgba(223,193,150,0.4)]">
                ن
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================ COLOR PALETTE ============================ */}
      <section className="px-5 lg:px-8 pt-6 pb-2">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#2E6237] tracking-widest uppercase mb-1">
              <span className="h-px w-6 bg-[#DFC196]" />
              لوحة الألوان
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">
              نظام الألوان الفاخر
            </h2>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] bg-[#F7F7F5] border border-[#F0F0F0] rounded-full px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#DFC196]" />
            هوية بصرية راقية
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {colorPalette.map((c) => (
            <div
              key={c.hex}
              className="group relative rounded-2xl border border-[#F0F0F0] bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`h-16 rounded-xl mb-3 ring-1 ring-inset ring-black/5 ${
                  c.border ? "border border-[#F0F0F0]" : ""
                }`}
                style={{ backgroundColor: c.hex }}
              />
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-[#1A1A1A] truncate">
                    {c.name}
                  </div>
                  <div className="text-[10px] text-[#9B9B9B] truncate">
                    {c.role}
                  </div>
                </div>
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: c.hex,
                    color: c.text,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                >
                  {c.hex}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ POS INTERFACE ============================ */}
      <section className="flex-1 px-5 lg:px-8 pt-5 pb-6">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#2E6237] tracking-widest uppercase mb-1">
              <span className="h-px w-6 bg-[#DFC196]" />
              واجهة نقطة البيع
            </div>
            <h2 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">
              جلسة بيع جديدة
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-[12px] text-[#6B6B6B] bg-white border border-[#F0F0F0] rounded-full px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              الوردية مفتوحة · #SHIFT-1042
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 lg:gap-5">
          {/* -------------------- SIDEBAR (RTL right) -------------------- */}
          <aside className="col-span-12 lg:col-span-2 order-1">
            <div className="rounded-2xl bg-gradient-to-b from-[#2E6237] via-[#2A5A33] to-[#1F4A26] p-3 shadow-[0_10px_30px_rgba(46,98,55,0.18)] h-full lg:h-[660px] flex flex-col">
              <div className="px-2 pt-1 pb-3 mb-2 border-b border-white/10">
                <div className="text-[10px] font-bold text-[#F9DC7C]/80 tracking-widest uppercase">
                  القائمة
                </div>
                <div className="text-[13px] font-bold text-white mt-0.5">
                  لوحة التحكم
                </div>
              </div>

              <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible scrollbar-thin flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = activeNav === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all shrink-0 ${
                        active
                          ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(249,220,124,0.35)]"
                          : "text-[#F9EDC5]/70 hover:text-white hover:bg-white/8"
                      }`}
                    >
                      {active && (
                        <span className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-[#F9DC7C] shadow-[0_0_10px_rgba(249,220,124,0.7)]" />
                      )}
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                          active
                            ? "text-[#F9DC7C]"
                            : "text-[#DFC196]/80 group-hover:text-[#F9DC7C]"
                        }`}
                      />
                      <span className="hidden lg:inline whitespace-nowrap">
                        {item.name}
                      </span>
                      {item.badge && (
                        <span
                          className={`hidden lg:inline-flex ms-auto items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-bold ${
                            active
                              ? "bg-[#F9DC7C] text-[#1A1A1A]"
                              : "bg-white/10 text-[#F9EDC5]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>

              <div className="hidden lg:block mt-3 pt-3 border-t border-white/10">
                <div className="rounded-xl bg-white/8 p-3 border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#DFC196] to-[#F9DC7C] grid place-items-center text-[#1A1A1A] font-bold text-xs">
                      ن
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-white truncate">
                        نورا العنزي
                      </div>
                      <div className="text-[10px] text-[#F9EDC5]/60 truncate">
                        مديرة الفرع
                      </div>
                    </div>
                    <button className="text-[#F9EDC5]/60 hover:text-white transition">
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* -------------------- PRODUCTS (center) -------------------- */}
          <div className="col-span-12 lg:col-span-7 order-2">
            <div className="rounded-2xl bg-white border border-[#F0F0F0] shadow-[0_2px_14px_rgba(0,0,0,0.04)] h-full lg:h-[660px] flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-[#F0F0F0] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-extrabold text-[#1A1A1A]">
                      اختيار العطر
                    </h3>
                    <span className="text-[11px] font-bold text-[#2E6237] bg-[#2E6237]/8 rounded-full px-2 py-0.5">
                      {filtered.length} منتج
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="md:hidden grid place-items-center h-9 w-9 rounded-lg border border-[#F0F0F0] text-[#6B6B6B] hover:bg-[#FAFAFA] transition">
                      <Search className="h-4 w-4" />
                    </button>
                    <button className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#F0F0F0] text-[12px] font-semibold text-[#6B6B6B] hover:bg-[#FAFAFA] hover:-translate-y-0.5 transition-all">
                      <ScanLine className="h-4 w-4" />
                      ماسح الباركود
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-0.5">
                  {categories.map((cat) => {
                    const active = activeCat === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCat(cat.id)}
                        className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold transition-all ${
                          active
                            ? "bg-[#2E6237] text-white shadow-[0_4px_12px_rgba(46,98,55,0.25)]"
                            : "bg-[#F7F7F5] text-[#6B6B6B] border border-[#F0F0F0] hover:border-[#DFC196] hover:text-[#1A1A1A]"
                        }`}
                      >
                        {cat.name}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-white text-[#9B9B9B]"
                          }`}
                        >
                          {cat.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <table className="w-full text-right">
                  <thead className="sticky top-0 z-10 bg-[#FBFBF9]">
                    <tr className="text-[11px] font-bold text-[#9B9B9B] uppercase tracking-wider">
                      <th className="font-bold py-3 px-4 text-right">المنتج</th>
                      <th className="font-bold py-3 px-3 text-right hidden sm:table-cell">
                        الفئة
                      </th>
                      <th className="font-bold py-3 px-3 text-center hidden md:table-cell">
                        الحجم
                      </th>
                      <th className="font-bold py-3 px-3 text-center hidden lg:table-cell">
                        المخزون
                      </th>
                      <th className="font-bold py-3 px-3 text-left">السعر</th>
                      <th className="font-bold py-3 px-4 text-center w-14">
                        إضافة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const st = stockStyles[p.stock]
                      const disabled = p.stock === "out"
                      const catName =
                        categories.find((c) => c.id === p.category)?.name ||
                        p.category
                      return (
                        <tr
                          key={p.id}
                          className={`group border-t border-[#F4F4F2] hover:bg-[#FBFBF9] transition-colors ${
                            i % 2 === 1 ? "bg-[#FCFCFB]" : ""
                          }`}
                        >
                          {/* Product */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-11 w-11 rounded-xl shrink-0 grid place-items-center overflow-hidden ring-1 ring-black/5"
                                style={{
                                  background: p.image
                                    ? `#FFFFFF`
                                    : `linear-gradient(135deg, ${p.hue}33, ${p.hue}11)`,
                                }}
                              >
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span
                                    className="text-base font-extrabold"
                                    style={{ color: p.hue }}
                                  >
                                    {p.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13.5px] font-bold text-[#1A1A1A] truncate">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-[#9B9B9B] truncate">
                                  {p.brand}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Category */}
                          <td className="py-3 px-3 hidden sm:table-cell">
                            <span className="text-[11.5px] font-semibold text-[#6B6B6B]">
                              {catName}
                            </span>
                          </td>
                          {/* Volume */}
                          <td className="py-3 px-3 text-center hidden md:table-cell">
                            <span className="inline-flex items-center text-[11.5px] font-semibold text-[#6B6B6B] bg-[#F7F7F5] rounded-md px-2 py-0.5">
                              {p.volume}
                            </span>
                          </td>
                          {/* Stock */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full border px-2.5 py-1 ${st.chip}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                {p.stockLabel}
                              </span>
                            </div>
                          </td>
                          {/* Price */}
                          <td className="py-3 px-3 text-left">
                            <div className="text-[14px] font-extrabold text-[#1A1A1A] tabular-nums">
                              {fmtKwd(p.price)}
                            </div>
                            <div className="text-[10px] text-[#9B9B9B] font-medium">
                              د.ك
                            </div>
                          </td>
                          {/* Add */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => addToCart(p)}
                              disabled={disabled}
                              aria-label={`إضافة ${p.name}`}
                              className={`inline-grid place-items-center h-9 w-9 rounded-lg transition-all ${
                                disabled
                                  ? "bg-[#F0F0F0] text-[#9B9B9B] cursor-not-allowed"
                                  : "bg-[#2E6237] text-white hover:bg-[#24522C] hover:-translate-y-0.5 shadow-[0_4px_10px_rgba(46,98,55,0.25)]"
                              }`}
                            >
                              <Plus className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="h-14 w-14 mx-auto rounded-2xl bg-[#F7F7F5] grid place-items-center mb-3">
                      <Search className="h-6 w-6 text-[#9B9B9B]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#6B6B6B]">
                      لا توجد نتائج مطابقة
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* -------------------- INVOICE PANEL (RTL left) -------------------- */}
          <div className="col-span-12 lg:col-span-3 order-3">
            <div className="rounded-2xl bg-white border border-[#F0F0F0] shadow-[0_2px_14px_rgba(0,0,0,0.04)] h-full lg:h-[660px] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#F0F0F0]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-[#2E6237]/8 grid place-items-center">
                      <ShoppingBag className="h-[18px] w-[18px] text-[#2E6237]" />
                    </div>
                    <div>
                      <div className="text-[14px] font-extrabold text-[#1A1A1A]">
                        الفاتورة الحالية
                      </div>
                      <div className="text-[11px] text-[#9B9B9B]">
                        INV-{new Date().getFullYear()}-0247
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E6237] bg-[#2E6237]/8 rounded-full px-2.5 py-1">
                    {totalItems} صنف
                  </span>
                </div>

                {/* Customer */}
                <button className="mt-3 w-full flex items-center gap-2.5 rounded-xl border border-dashed border-[#E5E5E5] bg-[#FCFCFB] px-3 py-2.5 hover:border-[#DFC196] hover:bg-[#FFFCF5] transition-all group">
                  <div className="h-8 w-8 rounded-lg bg-[#F9EDC5] grid place-items-center">
                    <User2 className="h-4 w-4 text-[#2E6237]" />
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-[#1A1A1A]">
                      عميل نقدي
                    </div>
                    <div className="text-[10px] text-[#9B9B9B]">
                      اضغط لاختيار عميل
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-[#9B9B9B] group-hover:text-[#2E6237] transition" />
                </button>
              </div>

              {/* Cart lines */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {cart.length === 0 && (
                  <div className="h-full grid place-items-center py-10">
                    <div className="text-center">
                      <div className="h-14 w-14 mx-auto rounded-2xl bg-[#F7F7F5] grid place-items-center mb-3">
                        <ShoppingBag className="h-6 w-6 text-[#9B9B9B]" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#6B6B6B]">
                        السلة فارغة
                      </p>
                      <p className="text-[11px] text-[#9B9B9B] mt-0.5">
                        أضف العطور لبدء البيع
                      </p>
                    </div>
                  </div>
                )}

                {cart.map((line) => {
                  const p = line.perfume
                  return (
                    <div
                      key={p.id}
                      className="group rounded-xl border border-[#F0F0F0] bg-white p-2.5 hover:border-[#DFC196] hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-10 w-10 rounded-lg shrink-0 grid place-items-center overflow-hidden ring-1 ring-black/5"
                          style={{
                            background: p.image
                              ? "#FFFFFF"
                              : `linear-gradient(135deg, ${p.hue}33, ${p.hue}11)`,
                          }}
                        >
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span
                              className="text-sm font-extrabold"
                              style={{ color: p.hue }}
                            >
                              {p.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-bold text-[#1A1A1A] truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-[#9B9B9B]">
                            {p.volume} · {fmtKwd(p.price)} د.ك
                          </div>
                        </div>
                        <button
                          onClick={() => removeLine(p.id)}
                          className="text-[#C0C0C0] hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#F4F4F2]">
                        <div className="inline-flex items-center bg-[#F7F7F5] rounded-lg p-0.5">
                          <button
                            onClick={() => changeQty(p.id, -1)}
                            className="grid place-items-center h-7 w-7 rounded-md text-[#6B6B6B] hover:bg-white hover:text-[#2E6237] transition"
                            aria-label="إنقاص"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[28px] text-center text-[13px] font-extrabold text-[#1A1A1A] tabular-nums">
                            {line.qty}
                          </span>
                          <button
                            onClick={() => changeQty(p.id, 1)}
                            className="grid place-items-center h-7 w-7 rounded-md text-[#6B6B6B] hover:bg-white hover:text-[#2E6237] transition"
                            aria-label="زيادة"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                        <div className="text-[13.5px] font-extrabold text-[#1A1A1A] tabular-nums">
                          {fmtKwd(p.price * line.qty)}
                          <span className="text-[10px] font-medium text-[#9B9B9B] ms-1">
                            د.ك
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals + checkout */}
              <div className="border-t border-[#F0F0F0] p-3.5 bg-[#FCFCFB]">
                {/* Discount chips */}
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#6B6B6B] ms-0.5">
                    <Percent className="h-3.5 w-3.5 text-[#DFC196]" />
                    الخصم:
                  </div>
                  {[0, 5, 10, 15].map((d) => {
                    const active = discountPct === d
                    return (
                      <button
                        key={d}
                        onClick={() => setDiscountPct(d)}
                        className={`flex-1 h-7 rounded-md text-[11px] font-bold transition-all ${
                          active
                            ? "bg-[#DFC196] text-[#1A1A1A] shadow-[0_3px_8px_rgba(223,193,150,0.4)]"
                            : "bg-white border border-[#F0F0F0] text-[#6B6B6B] hover:border-[#DFC196]"
                        }`}
                      >
                        {d === 0 ? "بدون" : `${d}%`}
                      </button>
                    )
                  })}
                </div>

                {/* Lines */}
                <div className="space-y-1.5 mb-3 text-[12.5px]">
                  <div className="flex items-center justify-between text-[#6B6B6B]">
                    <span>المجموع الفرعي</span>
                    <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      {fmtKwd(subtotal)} د.ك
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#6B6B6B]">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-[#DFC196]" />
                      الخصم ({discountPct}%)
                    </span>
                    <span className="font-semibold text-[#2E6237] tabular-nums">
                      − {fmtKwd(discount)} د.ك
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#6B6B6B]">
                    <span>الضريبة</span>
                    <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      0.000 د.ك
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-end justify-between rounded-xl bg-gradient-to-l from-[#2E6237] to-[#24522C] p-3 mb-3 shadow-[0_6px_16px_rgba(46,98,55,0.22)]">
                  <div>
                    <div className="text-[11px] font-bold text-[#F9DC7C]/90 tracking-wide">
                      الإجمالي المستحق
                    </div>
                    <div className="text-[10px] text-[#F9EDC5]/70">
                      شامل الضريبة
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-[22px] font-extrabold text-white tabular-nums leading-none">
                      {fmtKwd(total)}
                    </div>
                    <div className="text-[11px] text-[#F9EDC5]/80 font-semibold mt-0.5">
                      دينار كويتي
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-[#F0F0F0] bg-white text-[12px] font-bold text-[#6B6B6B] hover:border-[#DFC196] hover:text-[#1A1A1A] hover:-translate-y-0.5 transition-all">
                    <Pause className="h-4 w-4" />
                    تعليق
                  </button>
                  <button
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    className={`inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border text-[12px] font-bold transition-all ${
                      cart.length === 0
                        ? "bg-[#F4F4F4] text-[#B5B5B5] border-[#F0F0F0] cursor-not-allowed"
                        : "border-[#F0F0F0] bg-white text-[#6B6B6B] hover:border-red-200 hover:text-red-600 hover:-translate-y-0.5"
                    }`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    إفراغ
                  </button>
                </div>
                <button
                  disabled={cart.length === 0}
                  className={`w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-[14px] font-extrabold transition-all ${
                    cart.length === 0
                      ? "bg-[#F0F0F0] text-[#B5B5B5] cursor-not-allowed"
                      : "bg-gradient-to-l from-[#2E6237] to-[#3A7A45] text-white shadow-[0_8px_20px_rgba(46,98,55,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(46,98,55,0.36)]"
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  إتمام الدفع · {fmtKwd(total)} د.ك
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ FOOTER ============================ */}
      <footer className="mt-auto border-t border-[#F0F0F0] bg-white">
        <div className="px-5 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#2E6237] to-[#1F4A26] grid place-items-center">
              <Sparkles className="h-4 w-4 text-[#F9DC7C]" />
            </div>
            <div className="text-[12px] text-[#6B6B6B]">
              <span className="font-bold text-[#1A1A1A]">دار العطور</span>{" "}
              · نظام نقاط البيع الفاخر · الكويت
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#9B9B9B]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              متصل · السيرفر يعمل
            </span>
            <span className="hidden sm:inline">الإصدار 2.4.0</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
