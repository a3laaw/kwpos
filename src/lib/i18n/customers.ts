/**
 * i18n strings for the "customers" module.
 * Auto-extracted from the original monolithic i18n.ts (Split Module — Fowler).
 *
 * Exports `ar` and `en` plain objects whose keys are a subset of Dict.
 * They are spread into the main DICTS object in i18n/index.ts.
 */

export const ar_customers: Record<string, string> = {
  // Customers module
  cusAddCustomer: "إضافة عميل",
  cusEditCustomer: "تعديل العميل",
  cusCustomerName: "اسم العميل",
  cusCustomerPhone: "هاتف العميل",
  cusCustomerAddress: "عنوان العميل",
  cusCustomerType: "نوع العميل",
  cusCustomerTypeRetail: "عميل تجزئة",
  cusCustomerTypeWholesale: "عميل جملة",
  cusCustomerTypeCorporate: "عميل شركة",
  cusCustomerAdded: "تمت إضافة العميل",
  cusCustomerUpdated: "تم تحديث العميل",
  cusCustomerDeleted: "تم حذف العميل",
  cusNoCustomers: "لا يوجد عملاء",
  cusAddFirstCustomer: "أضف عميلك الأول",
  cusCustomerNameRequired: "اسم العميل مطلوب",
  cusCustomerPhoneRequired: "هاتف العميل مطلوب",
  cusPageTitle: "دليل العملاء",
  cusPageDesc: "سجل بسيط لبيانات العملاء: الاسم، رقم الهاتف، والعنوان.",
  cusSearchPlaceholder: "ابحث بالاسم أو الهاتف أو العنوان...",
  cusLoadFailed: "تعذّر تحميل العملاء",
  cusNoMatching: "لا توجد نتائج مطابقة",
  cusDateAdded: "تاريخ الإضافة",
  cusTotalCountLabel: "إجمالي {count} عميل",
  cusDeleteTitle: "حذف العميل",
  cusDeleteConfirm: "سيتم حذف العميل «{name}» نهائياً.",
  cusAddNewTitle: "إضافة عميل جديد",
  cusEditDesc: "عدّل بيانات العميل.",
  cusAddDesc: "أدخل بيانات العميل الجديد.",
  cusNamePlaceholder: "مثال: نور الصباح",
  cusAddressPlaceholder: "المدينة - الحي",
}

export const en_customers: Record<string, string> = {
  // Customers module
  cusAddCustomer: "Add customer",
  cusEditCustomer: "Edit customer",
  cusCustomerName: "Customer name",
  cusCustomerPhone: "Customer phone",
  cusCustomerAddress: "Customer address",
  cusCustomerType: "Customer type",
  cusCustomerTypeRetail: "Retail customer",
  cusCustomerTypeWholesale: "Wholesale customer",
  cusCustomerTypeCorporate: "Corporate customer",
  cusCustomerAdded: "Customer added",
  cusCustomerUpdated: "Customer updated",
  cusCustomerDeleted: "Customer deleted",
  cusNoCustomers: "No customers",
  cusAddFirstCustomer: "Add your first customer",
  cusCustomerNameRequired: "Customer name is required",
  cusCustomerPhoneRequired: "Customer phone is required",
  cusPageTitle: "Customer directory",
  cusPageDesc: "A simple record of customer data: name, phone number, and address.",
  cusSearchPlaceholder: "Search by name, phone or address...",
  cusLoadFailed: "Failed to load customers",
  cusNoMatching: "No matching results",
  cusDateAdded: "Date added",
  cusTotalCountLabel: "Total {count} customer(s)",
  cusDeleteTitle: "Delete customer",
  cusDeleteConfirm: "Customer “{name}” will be permanently deleted.",
  cusAddNewTitle: "Add new customer",
  cusEditDesc: "Edit customer details.",
  cusAddDesc: "Enter the new customer's details.",
  cusNamePlaceholder: "e.g. Noor Al-Sabah",
  cusAddressPlaceholder: "City - District",
}
