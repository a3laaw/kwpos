import type { AppView } from "@/lib/types"
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Truck,
  Calculator,
  ReceiptText,
} from "lucide-react"

export interface NavItem {
  view: AppView
  label: string
  icon: typeof LayoutDashboard
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    view: "dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    description: "نظرة عامة على الأداء",
  },
  {
    view: "sales",
    label: "نقاط البيع",
    icon: Calculator,
    description: "إنشاء فاتورة جديدة",
  },
  {
    view: "invoices",
    label: "الفواتير",
    icon: ReceiptText,
    description: "سجل المبيعات",
  },
  {
    view: "inventory",
    label: "المخازن",
    icon: Boxes,
    description: "إدارة المنتجات",
  },
  {
    view: "purchases",
    label: "المشتريات",
    icon: ShoppingCart,
    description: "أوامر الشراء",
  },
  {
    view: "suppliers",
    label: "الموردين",
    icon: Truck,
    description: "بيانات الموردين",
  },
]
