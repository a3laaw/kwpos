import type { AppView } from "@/lib/types"
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Truck,
  Calculator,
  ReceiptText,
  Plug,
  BookOpen,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  FileBarChart,
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
    view: "reports",
    label: "التقارير",
    icon: FileBarChart,
    description: "تقارير مبيعات مرنة بفلاتر",
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
  {
    view: "customers",
    label: "العملاء",
    icon: Users,
    description: "دليل العملاء (CRM)",
  },
  {
    view: "analytics",
    label: "تحليلات المبيعات",
    icon: BarChart3,
    description: "أكثر مبيعاً وراكد وربحية",
  },
  {
    view: "accounting",
    label: "المحاسبة",
    icon: BookOpen,
    description: "شجرة الحسابات والقيود",
  },
  {
    view: "integrations",
    label: "التكاملات",
    icon: Plug,
    description: "ربط مع شوبيفاي وغيره",
  },
  {
    view: "settings",
    label: "الإعدادات",
    icon: SettingsIcon,
    description: "الدولة والعملة والضريبة",
  },
]
