/**
 * i18n strings for the "shifts" module.
 * Auto-extracted from the original monolithic i18n.ts (Split Module — Fowler).
 *
 * Exports `ar` and `en` plain objects whose keys are a subset of Dict.
 * They are spread into the main DICTS object in i18n/index.ts.
 */

export const ar_shifts: Record<string, string> = {
  // Shifts module
  shfOpenNewShift: "فتح وردية جديدة",
  shfOpenShift: "فتح وردية",
  shfNoOpenShift: "لا توجد وردية مفتوحة",
  shfOpenShiftToStart: "افتح وردية لبدء المبيعات",
  shfClosedShiftsHistory: "سجل الورديات المغلقة",
  shfLastShiftsWithVariances: "آخر الورديات ذات الفروقات",
  shfActiveShift: "الوردية الحالية",
  shfOpenedAtHint: "فُتحت في",
  shfOpen: "فتح",
  shfCash: "نقدي",
  shfKnet: "كي نت",
  shfVisaMaster: "فيزا / ماستركارد",
  shfElectronicPaymentVariances: "فروقات المدفوعات الإلكترونية",
  shfVarianceExplanation: "تفسير الفرق",
  shfKnetVariance: "فرق كي نت",
  shfVisaVariance: "فرق الفيزا",
  shfExpectedBook: "الدفتري المتوقع",
  shfActualFromMachine: "الفعلي من الجهاز",
  shfVariance: "الفرق",
  shfCloseShiftAndReconcile: "إغلاق الوردية ومطابقة الصندوق",
  // Shifts module — extended
  shfDescFull: "فتح/إغلاق الوردية، مطابقة النقدية و K-Net والفيزا، وحساب فروقات الدفع الإلكتروني.",
  shfLoadFailed: "تعذّر التحميل",
  shfNoOpenShiftDesc: "افتح وردية جديدة لبدء تسجيل المبيعات والمطابقة.",
  shfLastShiftsCount: "آخر {count} وردية مع فروقات المطابقة",
  shfColShiftNo: "رقم الوردية",
  shfColPeriod: "الفترة",
  shfColCashVariance: "نقدي (فرق)",
  shfColKnetVariance: "K-Net (فرق)",
  shfColVisaVariance: "فيزا (فرق)",
  shfActiveShiftLabel: "وردية نشطة: {no}",
  shfOpenedAtDesc: "فُتحت في {x} — أدخل الأرقام الفعلية من الماكينات ثم أغلق.",
  shfCashLabel: "النقدية",
  shfVisaMasterShort: "فيزا / ماستر",
  shfNotePlaceholder: "مثال: عجز نقدي 0.250 د.ك",
}

export const en_shifts: Record<string, string> = {
  // Shifts module
  shfOpenNewShift: "Open new shift",
  shfOpenShift: "Open shift",
  shfNoOpenShift: "No open shift",
  shfOpenShiftToStart: "Open a shift to start selling",
  shfClosedShiftsHistory: "Closed shifts history",
  shfLastShiftsWithVariances: "Last shifts with variances",
  shfActiveShift: "Active shift",
  shfOpenedAtHint: "Opened at",
  shfOpen: "Open",
  shfCash: "Cash",
  shfKnet: "K-Net",
  shfVisaMaster: "Visa / Mastercard",
  shfElectronicPaymentVariances: "Electronic payment variances",
  shfVarianceExplanation: "Variance explanation",
  shfKnetVariance: "K-Net variance",
  shfVisaVariance: "Visa variance",
  shfExpectedBook: "Expected (book)",
  shfActualFromMachine: "Actual (from machine)",
  shfVariance: "Variance",
  shfCloseShiftAndReconcile: "Close shift & reconcile cash",
  // Shifts module — extended
  shfDescFull: "Open/close shifts, reconcile cash, K-Net, and Visa, and calculate electronic payment variances.",
  shfLoadFailed: "Failed to load",
  shfNoOpenShiftDesc: "Open a new shift to start recording sales and reconciliation.",
  shfLastShiftsCount: "Last {count} shifts with reconciliation variances",
  shfColShiftNo: "Shift no.",
  shfColPeriod: "Period",
  shfColCashVariance: "Cash (variance)",
  shfColKnetVariance: "K-Net (variance)",
  shfColVisaVariance: "Visa (variance)",
  shfActiveShiftLabel: "Active shift: {no}",
  shfOpenedAtDesc: "Opened at {x} — enter the actual amounts from the machines, then close.",
  shfCashLabel: "Cash",
  shfVisaMasterShort: "Visa / Master",
  shfNotePlaceholder: "E.g. cash shortage 0.250 KWD",
}
