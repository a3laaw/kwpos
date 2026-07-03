export type Locale = "ar" | "en"

export interface Dict {
  // Direction
  dir: "rtl" | "ltr"

  // Brand
  appName: string
  appTagline: string

  // Nav
  navDashboard: string
  navSales: string
  navInvoices: string
  navReports: string
  navInventory: string
  navPurchases: string
  navSuppliers: string
  navCustomers: string
  navAnalytics: string
  navAccounting: string
  navIntegrations: string
  navSettings: string

  // Roles
  roleAdmin: string
  roleSales: string
  roleWarehouse: string

  // Common actions
  add: string
  edit: string
  delete: string
  save: string
  cancel: string
  search: string
  apply: string
  reset: string
  export: string
  import: string
  print: string
  close: string
  confirm: string
  loading: string
  noData: string
  retry: string
  total: string

  // Units
  units: string
  categories: string
  country: string
  currency: string
  taxRate: string

  // Page titles
  dashboardTitle: string
  dashboardDesc: string
  salesTitle: string
  salesDesc: string
  invoicesTitle: string
  invoicesDesc: string
  reportsTitle: string
  reportsDesc: string
  inventoryTitle: string
  inventoryDesc: string
  purchasesTitle: string
  purchasesDesc: string
  suppliersTitle: string
  suppliersDesc: string
  customersTitle: string
  customersDesc: string
  analyticsTitle: string
  analyticsDesc: string
  accountingTitle: string
  accountingDesc: string
  integrationsTitle: string
  integrationsDesc: string
  settingsTitle: string
  settingsDesc: string

  // Theme + language
  darkMode: string
  lightMode: string
  switchLang: string
  logout: string

  // Login
  loginTitle: string
  loginDesc: string
  email: string
  password: string
  login: string
  loggingIn: string
  demoAccounts: string
  welcomeBack: string
}

export const DICTS: Record<Locale, Dict> = {
  ar: {
    dir: "rtl",
    appName: "نظام المتجر",
    appTagline: "إدارة المبيعات والمخازن والمشتريات",
    navDashboard: "لوحة التحكم",
    navSales: "نقاط البيع",
    navInvoices: "الفواتير",
    navReports: "التقارير",
    navInventory: "المخازن",
    navPurchases: "المشتريات",
    navSuppliers: "الموردين",
    navCustomers: "العملاء",
    navAnalytics: "تحليلات المبيعات",
    navAccounting: "المحاسبة",
    navIntegrations: "التكاملات",
    navSettings: "الإعدادات",
    roleAdmin: "مدير النظام",
    roleSales: "موظف مبيعات",
    roleWarehouse: "أمين مخزن",
    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    search: "بحث",
    apply: "تطبيق",
    reset: "إعادة تعيين",
    export: "تصدير",
    import: "استيراد",
    print: "طباعة",
    close: "إغلاق",
    confirm: "تأكيد",
    loading: "جارٍ التحميل...",
    noData: "لا توجد بيانات",
    retry: "إعادة المحاولة",
    total: "الإجمالي",
    units: "وحدات القياس",
    categories: "التصنيفات",
    country: "الدولة",
    currency: "العملة",
    taxRate: "نسبة الضريبة",
    dashboardTitle: "لوحة التحكم",
    dashboardDesc: "نظرة عامة على الأداء",
    salesTitle: "نقاط البيع",
    salesDesc: "إنشاء فاتورة جديدة",
    invoicesTitle: "الفواتير",
    invoicesDesc: "سجل المبيعات",
    reportsTitle: "التقارير",
    reportsDesc: "تقارير مبيعات مرنة بفلاتر",
    inventoryTitle: "المخازن",
    inventoryDesc: "إدارة المنتجات والمخازن",
    purchasesTitle: "المشتريات",
    purchasesDesc: "أوامر الشراء",
    suppliersTitle: "الموردين",
    suppliersDesc: "بيانات الموردين",
    customersTitle: "العملاء",
    customersDesc: "دليل العملاء",
    analyticsTitle: "تحليلات المبيعات والمخزون",
    analyticsDesc: "تقارير ذكية مفصّلة",
    accountingTitle: "المحاسبة",
    accountingDesc: "شجرة الحسابات والقيود",
    integrationsTitle: "التكاملات",
    integrationsDesc: "ربط مع شوبيفاي وغيره",
    settingsTitle: "الإعدادات",
    settingsDesc: "الدولة والعملة والوحدات",
    darkMode: "الوضع الليلي",
    lightMode: "الوضع النهاري",
    switchLang: "English",
    logout: "تسجيل الخروج",
    loginTitle: "تسجيل الدخول",
    loginDesc: "أدخل بيانات حسابك للوصول إلى لوحة التحكم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    login: "دخول",
    loggingIn: "جارٍ الدخول...",
    demoAccounts: "حسابات تجريبية",
    welcomeBack: "أهلاً بك",
  },
  en: {
    dir: "ltr",
    appName: "Store Manager",
    appTagline: "Sales, Inventory & Purchasing",
    navDashboard: "Dashboard",
    navSales: "Point of Sale",
    navInvoices: "Invoices",
    navReports: "Reports",
    navInventory: "Inventory",
    navPurchases: "Purchases",
    navSuppliers: "Suppliers",
    navCustomers: "Customers",
    navAnalytics: "Analytics",
    navAccounting: "Accounting",
    navIntegrations: "Integrations",
    navSettings: "Settings",
    roleAdmin: "Administrator",
    roleSales: "Sales Clerk",
    roleWarehouse: "Warehouse Keeper",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    search: "Search",
    apply: "Apply",
    reset: "Reset",
    export: "Export",
    import: "Import",
    print: "Print",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading...",
    noData: "No data",
    retry: "Retry",
    total: "Total",
    units: "Units",
    categories: "Categories",
    country: "Country",
    currency: "Currency",
    taxRate: "Tax Rate",
    dashboardTitle: "Dashboard",
    dashboardDesc: "Performance overview",
    salesTitle: "Point of Sale",
    salesDesc: "Create a new invoice",
    invoicesTitle: "Invoices",
    invoicesDesc: "Sales history",
    reportsTitle: "Reports",
    reportsDesc: "Flexible filtered reports",
    inventoryTitle: "Inventory",
    inventoryDesc: "Manage products & warehouses",
    purchasesTitle: "Purchases",
    purchasesDesc: "Purchase orders",
    suppliersTitle: "Suppliers",
    suppliersDesc: "Supplier directory",
    customersTitle: "Customers",
    customersDesc: "Customer directory",
    analyticsTitle: "Sales & Inventory Analytics",
    analyticsDesc: "Detailed smart reports",
    accountingTitle: "Accounting",
    accountingDesc: "Chart of accounts & journals",
    integrationsTitle: "Integrations",
    integrationsDesc: "Connect Shopify & more",
    settingsTitle: "Settings",
    settingsDesc: "Country, currency & units",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    switchLang: "العربية",
    logout: "Log out",
    loginTitle: "Sign in",
    loginDesc: "Enter your credentials to access the dashboard",
    email: "Email",
    password: "Password",
    login: "Sign in",
    loggingIn: "Signing in...",
    demoAccounts: "Demo accounts",
    welcomeBack: "Welcome back",
  },
}
