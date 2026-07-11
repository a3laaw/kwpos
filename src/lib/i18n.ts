export type Locale = "ar" | "en"

export interface Dict {
  // Direction
  dir: "rtl" | "ltr"

  // Brand
  appName: string
  appTagline: string

  // Nav
  navDashboard: string
  navManagerDashboard: string
  managerDashboardTitle: string
  managerDashboardDesc: string
  navOwnerDashboard: string
  ownerDashboardTitle: string
  ownerDashboardDesc: string
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
  navShifts: string
  navSpotCheck: string
  navExchanges: string
  navPricing: string
  navUsers: string
  // Parent (grouped) nav labels
  navInvoicesReports: string
  navInventoryPurchases: string
  navAccountingCustomers: string
  navSystem: string
  navOperations: string

  // Roles
  roleAdmin: string
  roleOwner: string
  roleManager: string
  roleAccountant: string
  roleSales: string
  roleWarehouse: string
  roleCashier: string

  // Common actions (existing)
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
  noDataDescription: string
  confirmDescription: string
  retry: string
  total: string

  // Common — products
  product: string
  products: string
  productRequired: string
  productName: string
  productNotFound: string
  productDeleted: string
  productUpdated: string
  productAdded: string
  productNameRequired: string
  productImage: string

  // Common — customers
  customer: string
  customers: string
  cashCustomer: string
  customerName: string
  customerPhone: string
  customerNameRequired: string

  // Common — suppliers
  supplier: string
  suppliers: string
  supplierName: string
  supplierNameRequired: string
  supplierNamePlaceholder: string
  contactPerson: string
  supplierRequired: string
  selectSupplier: string
  selectSupplierFirst: string
  supplierDeleted: string
  supplierUpdated: string
  supplierAdded: string

  // Common — quantity / stock
  qty: string
  quantity: string
  qtyRequired: string
  qtyUnavailable: string
  qtyExceedsStock: string
  qtyInsufficient: string
  stockInsufficient: string
  stock: string
  inStock: string
  outOfStock: string
  outOfStockShort: string
  outOfStockFull: string
  lowStock: string
  nearOutOfStock: string
  available: string
  availableFrom: string
  currentQty: string

  // Common — price / barcode
  price: string
  unitPrice: string
  costPrice: string
  salePrice: string
  wholesalePrice: string
  corporatePrice: string
  barcode: string
  barcodeGenerated: string
  barcodeGenerateFailed: string
  autoGenerate: string
  autoGenerateBarcode: string
  selectCategoryFirst: string
  selectCategoryForAuto: string
  generateBarcode: string

  // Common — category
  category: string
  categories: string
  allCategories: string
  allProducts: string
  selectCategory: string
  categoryRequired: string
  categoryName: string
  categoryCode: string
  categoryCodePlaceholder: string

  // Common — date / period
  date: string
  fromDate: string
  toDate: string
  from: string
  to: string
  period: string
  allPeriods: string
  quickRange: string
  last7Days: string
  last30Days: string
  last90Days: string
  lastYear: string

  // Common — status / misc
  status: string
  note: string
  noteOptional: string
  notePlaceholder: string
  optional: string
  required: string
  actions: string
  open: string
  yes: string
  no: string
  all: string
  none: string

  // Common — money
  subtotal: string
  discount: string
  tax: string
  taxPercent: string
  taxRate: string
  totalAmount: string
  amount: string
  amountDue: string
  totalPaid: string
  grandTotal: string
  invoiceTotal: string
  additionalFees: string
  country: string
  currency: string

  // Common — payment
  payment: string
  paymentMethod: string
  paymentMethodShort: string
  cash: string
  card: string
  transfer: string
  cashShort: string
  cardShort: string
  transferShort: string
  payCash: string
  payCard: string
  payTransfer: string

  // Common — unit
  unit: string
  units: string
  unitRequired: string
  selectUnit: string
  piece: string
  pieceDefault: string

  // Common — warehouse
  warehouse: string
  warehouses: string
  warehouseName: string
  warehouseNameRequired: string
  warehouseNamePlaceholder: string
  warehouseCode: string
  warehouseLocation: string
  warehouseDeleted: string
  warehouseUpdated: string
  warehouseAdded: string
  warehouseHasStock: string
  noWarehouses: string
  addWarehouse: string
  addFirstWarehouse: string
  selectWarehouse: string

  // Common — branch
  branch: string
  branchWarehouse: string
  allBranches: string

  // Common — search
  searchPlaceholder: string
  noResults: string
  recentPages: string
  globalSearchHint: string
  searchProductPlaceholder: string
  searchNameBarcode: string
  searchInvoicePlaceholder: string
  searchNameBarcodePlaceholder: string

  // Common — items
  items: string
  itemsCount: string
  itemCount: string
  itemsCountLabel: string
  noItems: string
  noProducts: string
  noProductsToPrint: string
  noMatchingProducts: string
  noDataForPeriod: string
  tryAnotherKeyword: string

  // Common — loading / progress
  reload: string
  loadingPrices: string
  loadingShifts: string
  loadingJournal: string
  loadingStats: string
  loadingAudit: string
  calculatingReport: string
  calculatingMatrix: string
  calculatingFinancialReport: string
  updating: string
  executing: string
  completing: string
  approving: string
  applying: string

  // Common — errors
  loadFailed: string
  productsLoadFailed: string
  invoicesLoadFailed: string
  poLoadFailed: string
  suppliersLoadFailed: string
  reportLoadFailed: string
  pricesLoadFailed: string
  approvalDraftsLoadFailed: string
  auditLoadFailed: string
  dataLoadFailed: string

  // Common — save / export / import
  saveChanges: string
  saveFailed: string
  deleteFailed: string
  addFailed: string
  recordFailed: string
  exportFailed: string
  exportSucceeded: string
  importedToExcel: string
  exportedToExcel: string
  importSucceeded: string
  importFailed: string
  importSummary: string
  uploadExcelFile: string
  downloadEmptyTemplate: string
  imageUploaded: string
  imageUploadFailed: string
  imageTooLarge: string
  imageResizeFailed: string
  changeImage: string
  uploadImage: string
  imageFormatsHint: string

  // Common — filters
  filters: string
  activeFilters: string
  applyFilters: string
  resetFilters: string
  activeLabel: string
  filterBy: string
  source: string
  allSources: string
  posSource: string
  shopifySource: string

  // Common — pagination / nav
  expandAll: string
  collapseAll: string
  previous: string
  next: string
  pageXofY: string
  viewDetails: string
  openItem: string
  fetchInvoice: string
  lookupInvoice: string

  // Common — form fields
  name: string
  namePlaceholder: string
  phone: string
  phonePlaceholder: string
  emailPlaceholder: string
  address: string
  addressPlaceholder: string
  selectPlaceholder: string
  selectItem: string

  // Common — selection actions
  selectProduct: string
  selectProductFirst: string
  addAtLeastOneProduct: string
  addLine: string
  addRow: string
  addProduct: string
  addProductNew: string
  editProduct: string
  addSupplier: string
  addSupplierNew: string
  editSupplier: string
  addWarehouseNew: string
  editWarehouse: string
  addCategory: string
  editCategory: string

  // Common — delete confirmations
  deleteProductTitle: string
  deleteProductConfirm: string
  deleteSupplierTitle: string
  deleteSupplierConfirm: string
  deleteWarehouseTitle: string
  deleteWarehouseConfirm: string
  deleteConfirm: string

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
  shiftsTitle: string
  shiftsDesc: string
  spotCheckTitle: string
  spotCheckDesc: string
  exchangesTitle: string
  exchangesDesc: string
  pricingTitle: string
  pricingDesc: string
  usersTitle: string
  usersDesc: string
  newUser: string
  editUser: string
  newUserDesc: string
  editUserDesc: string
  userDeleted: string
  emailExists: string
  userDeleteConfirm: string
  noUsers: string
  role: string
  you: string
  noAccess: string
  noAccessDesc: string
  noExportPermission: string

  // Theme + language
  darkMode: string
  lightMode: string
  switchLang: string
  logout: string

  // Login
  loginTitle: string
  loginDesc: string
  email: string
  emailOrUsername: string
  password: string
  login: string
  loggingIn: string
  demoAccounts: string
  welcomeBack: string

  // POS module
  cart: string
  cartEmpty: string
  cartEmptyPark: string
  clearCart: string
  tapToAddProduct: string
  checkoutSale: string
  checkoutFailed: string
  saleCompleted: string
  saleCompletedDesc: string
  sessionExpired: string
  pleaseRelogin: string
  park: string
  parked: string
  parkedInvoices: string
  parkedInvoicesCount: string
  noParkedInvoices: string
  parkCurrentInvoice: string
  parkFailed: string
  invoiceParked: string
  holdNo: string
  parkedDeleted: string
  deleteParkedConfirm: string
  replaceCartConfirm: string
  resume: string
  resumeInvoiceFailed: string
  invoiceRestored: string
  unnamed: string
  parkListTitle: string
  customerSection: string
  paymentSection: string
  phoneAutoSearch: string
  existingCustomer: string
  newCustomerAuto: string
  priceTier: string
  tierRetail: string
  tierWholesale: string
  tierCorporate: string
  priceType: string
  basePrice: string
  effectivePrice: string
  promoPrice: string
  promo: string
  promoActive: string
  deliveryRequest: string
  deliveryFee: string
  driverName: string
  driverNamePlaceholder: string
  deliveryFeeLabel: string

  // Exchange module
  fullyReturned: string
  original: string
  returned: string
  returnable: string
  returnQty: string
  returnValue: string
  refundTotal: string
  refundInvoice: string
  refundDialogDesc: string
  refundApproved: string
  refundFailed: string
  refundApprovedSuccess: string
  refundBlocked: string
  exceeded14Days: string
  enable14DayOverride: string
  override14Days: string
  partialRefund: string
  partialRefundReason: string
  fullRefund: string
  refundedFull: string
  refundedPartial: string
  refundedFully: string
  refundMore: string
  creditNote: string
  creditNoteTotal: string
  totalReturns: string
  returns: string
  scanOrTypePlaceholder: string
  perUnit: string
  originalInvoice: string
  originalInvoiceRequired: string
  originalInvoiceNotFound: string
  invoiceExpired14Days: string
  invoiceExpired14DaysLong: string
  invoiceDate: string
  invoiceNo: string
  invoiceNoPlaceholder: string
  invoiceNotFoundRetry: string
  invoiceNumber: string
  originalInvoiceItems: string
  returnableQtyHint: string
  itemNotInOriginalInvoice: string
  itemFullyReturned: string
  scannedQtyExceedsReturnable: string
  returnExceedsRemaining: string
  enterInvoiceNoFirst: string
  fetchOriginalInvoice: string
  mandatory: string
  eligibleForExchange: string
  daysPassed: string
  newExchange: string
  exchangeApproved: string
  exchangeApproveFailed: string
  exchangeApprovedSuccess: string
  exchangeNo: string
  exchangeNotePlaceholder: string
  settlementMethod: string
  returnsTotal: string
  newTotal: string
  returnsByScan: string
  newItems: string
  scanReturnPlaceholder: string
  scanAddsOneHint: string
  scanToAddReturn: string
  remainingAfterReturn: string
  undoLastScan: string
  qtyScanOnly: string
  addAnotherScan: string
  deleteReturnItem: string
  searchNewPlaceholder: string
  noNewItemsSearch: string
  collectFromCustomer: string
  refundToCustomer: string
  exchange: string
  even: string
  evenExchange: string
  approveExchange: string
  confirmExchangeTitle: string
  confirmExchangeDesc: string
  afterApprovalReady: string
  ctrlEnterHint: string
  ctrlEnterShortcut: string
  yesApproveExchange: string
  yesComplete: string
  printReceipt: string
  newSale: string
  thermalPrint: string
  thermalPrint80: string
  a4Print: string
  posAutoPrint: string

  // Promotions / discounts
  discountType: string
  discountValue: string
  discountPercent: string
  discountAmount: string
  discountMustBePositive: string
  discountMax100: string
  percent: string
  fixedAmount: string
  value: string
  valuePlaceholder: string
  fromDate2: string
  toDate2: string
  promotions: string
  promotionsAndDiscounts: string
  newPromotion: string
  createPromotion: string
  promoCreated: string
  promoCreateFailed: string
  promoDeactivated: string
  promoDeactivateFailed: string
  deactivatePromotionConfirm: string
  deactivate: string
  currentPromotions: string
  noPromotions: string
  createFirstPromo: string
  activeNow: string
  scheduled: string
  stopped: string
  createdBy: string
  applyScope: string
  applyToAllDesc: string
  includedCategories: string
  excludedCategories: string
  categoriesSelected: string
  categoriesExcluded: string
  noCategories: string
  scopeProduct: string
  scopeCategory: string
  scopeAll: string
  scopeAllExcept: string
  scopeProductShort: string
  scopeCategoryShort: string
  scopeAllShort: string
  scopeAllExceptShort: string

  // Pricing module
  priceManagement: string
  changeLog: string
  approveAndApplyPrices: string
  approveAndApply: string
  approvePriceChangesTitle: string
  approvePriceChangesDesc: string
  noChangesToApprove: string
  pricesApproved: string
  applyPricesFailed: string
  belowCostTitle: string
  belowCostDesc: string
  belowCostWarning: string
  belowCostWarningDesc: string
  confirmApplyAll: string
  violatingItemsCount: string
  pendingChanges: string
  editCellToEnable: string
  cancelChanges: string
  viewOnlyAdminCanEdit: string
  adminOnlyEdit: string
  editSalePricesInPricing: string
  openPricingScreen: string
  estimatedProfitMargin: string
  zeroMeansRetail: string
  zeroMeansUnspecified: string
  salePriceEditLocked: string
  totalQty: string
  warehousesTotal: string
  distributeQtyAcrossWarehouses: string
  totalAcrossWarehouses: string
  optimalOrderQty: string
  defaultSupplier: string
  selectDefaultSupplier: string
  defaultSupplierHint: string
  reorderLevel: string

  // Pricing module — extended (audit log + promo form + confirm flow strings)
  prcPageTitle: string
  prcSearchAuditPlaceholder: string
  prcAuditReadOnlyNotice: string
  prcNoMatchingLogEntries: string
  prcNewPriceCol: string
  prcAppliedToastDesc: string
  prcApproveCountDesc: string
  prcScopeCategoriesLabel: string
  prcScopeAllExceptLabel: string
  prcScopeAllLabel: string
  prcDiscountValueLabel: string
  prcCreatedByLabel: string
  prcReload: string
  prcSelectOneCategoryMin: string
  prcSelectExcludedCategories: string
  prcDateRangeRequired: string
  prcEndDateAfterStart: string
  prcBelowCostAlertToast: string
  prcBelowCostAlertToastDesc: string
  prcNotePlaceholder: string
  prcDiscountPlaceholderPercent: string
  prcDiscountPlaceholderAmount: string
  prcPendingCountDesc: string
  prcDeactivateConfirm: string
  prcCtrlEnterHint: string
  prcConfirmTooltip: string
  prcCancelChangesCount: string
  prcViewOnlyAdminCanEditBadge: string
  prcInputLockedTitle: string
  prcBack: string
  prcApproveAndApplyNew: string
  prcApproveCountTitle: string
  prcBelowCostTitleFull: string
  prcBelowCostDescFull: string
  prcLoadingAuditShort: string
  prcLoadingPromos: string
  prcCategoriesColon: string
  prcAllItemsExceptColon: string

  // Purchase orders module
  poSupplier: string
  poNote: string
  poProducts: string
  poTotal: string
  poCreated: string
  poCreateFailed: string
  poDetailsTitle: string
  poDetailsDesc: string
  poStatus: string
  poStatusPendingApproval: string
  poStatusApproved: string
  poStatusPending: string
  poStatusReceived: string
  poStatusCancelled: string
  poStatusRejected: string
  poReceived: string
  poReceiveFailed: string
  poCancelled: string
  poCancelFailed: string
  poDeleted: string
  poDeleteFailed: string
  poApproved: string
  poApproveFailed: string
  poEditedAndApproved: string
  poRejected: string
  poRejectFailed: string
  poDraftCreated: string
  poDraftCreateFailed: string
  noItemsNeedReorder: string
  fetchSupplierRequiredItems: string
  autoPoDesc: string
  suggestedQtyFormula: string
  createDraft: string
  newPurchaseOrder: string
  newPoDesc: string
  confirmReceipt: string
  confirmReceiptDesc: string
  confirmPoReceipt: string
  updateCostPrices: string
  updateCostPricesDesc: string
  cancelPoTitle: string
  cancelPoConfirm: string
  cancelOrder: string
  pendingManagementApproval: string
  autoPoDraftsDesc: string
  pendingReview: string
  noApprovalDrafts: string
  noApprovalDraftsDesc: string
  reviewPoDraft: string
  totalAfterEdits: string
  fullReject: string
  approveWithEdits: string
  approveAsIs: string
  editAndAccept: string
  approveAndAccept: string
  editAndApprovePo: string
  approvePo: string
  editAndApproveDesc: string
  approvePoDesc: string
  editAndApprove: string
  approve: string
  reject: string
  rejectPoTitle: string
  rejectReason: string
  rejectReasonPlaceholder: string
  enterRejectReason: string
  confirmReject: string
  orderNo: string
  landedCost: string
  landedCostDesc: string
  landedCostAppliedDesc: string
  landedCostPreviewDesc: string
  customs: string
  shipping: string
  otherFees: string
  invoiceTotal2: string
  suggestedSalePrice: string
  emptyMeansNoChange: string

  // Reports module
  repTotalRevenue: string
  repTotalCost: string
  repGrossProfit: string
  repAvgInvoice: string
  repRevenueTrend: string
  repRevenueTrendDesc: string
  repPaymentMethods: string
  repRevenueDistribution: string
  repRevenueByCategory: string
  repRevenueByCategoryDesc: string
  repProductBreakdown: string
  repProductBreakdownDesc: string
  repRevenue: string
  repProfit: string
  generalReports: string
  performanceMatrix: string
  matrixTitle: string
  matrixLongDesc: string
  reportFilters: string
  calculatingMatrix2: string
  noDataForPeriod2: string
  performanceMatrixCount: string
  matrixClickHint: string
  branchWarehouse2: string
  allSuppliers: string
  matrixKpiRevenue: string
  matrixKpiCost: string
  matrixKpiProfit: string
  matrixKpiTurnover: string
  margin: string
  stagnantDays: string
  colName: string
  colBarcode: string
  colCategory: string
  colQty: string
  colReorderLevel: string
  colCostPrice: string
  colSalePrice: string
  colProduct: string
  colItem: string
  colPrice: string
  colTotal: string
  colSupplier: string
  colDate: string
  colItemsCount: string
  colStatus: string
  colActions: string
  colBook: string
  colActual: string
  colVariance: string
  colUser: string
  colType: string
  colFrom: string
  colTo: string
  colChange: string
  colBy: string
  colNote: string
  colUnit: string
  colOrderNo: string
  totalProducts: string
  totalCategories: string
  exportPrint: string
  noInvoices: string
  noPurchaseOrders: string
  createFirstPo: string

  // Reports module — extended (PageHeader desc, KPI hints, chart titles, table headers)
  repDescFull: string
  repInvoicesCount: string
  repUnitsSoldCount: string
  repMarginPctLabel: string
  repDiscountLabel: string
  repRevenueTrendDaily: string
  repRevenueTrendDailyDesc: string
  repRevenueByCategoryFullDesc: string
  repProductBreakdownFullDesc: string
  repColQty: string
  repColRevenue: string
  repColCost: string
  repColProfit: string

  // Performance matrix — extended (PageHeader, KPI hints, table headers, grand total)
  matrixTitleFull: string
  matrixLongDescFull: string
  matrixStagnantDaysHint: string
  matrixTableTitle: string
  matrixHintFull: string
  matrixColCategoryItem: string
  matrixColNetQty: string
  matrixColSales: string
  matrixColGrossProfit: string
  matrixColMarginPct: string
  matrixColStagnantDays: string
  matrixGrandTotal: string
  matrixNoDataForPeriod: string
  matrixCogsLabel: string

  // Shifts module
  shfOpenNewShift: string
  shfOpenShift: string
  shfNoOpenShift: string
  shfOpenShiftToStart: string
  shfClosedShiftsHistory: string
  shfLastShiftsWithVariances: string
  shfActiveShift: string
  shfOpenedAtHint: string
  shfOpen: string
  shfCash: string
  shfKnet: string
  shfVisaMaster: string
  shfElectronicPaymentVariances: string
  shfVarianceExplanation: string
  shfKnetVariance: string
  shfVisaVariance: string
  shfExpectedBook: string
  shfActualFromMachine: string
  shfVariance: string
  shfCloseShiftAndReconcile: string

  // Shifts module — extended (PageHeader desc, history table, reconcile form)
  shfDescFull: string
  shfLoadFailed: string
  shfNoOpenShiftDesc: string
  shfLastShiftsCount: string
  shfColShiftNo: string
  shfColPeriod: string
  shfColCashVariance: string
  shfColKnetVariance: string
  shfColVisaVariance: string
  shfActiveShiftLabel: string
  shfOpenedAtDesc: string
  shfCashLabel: string
  shfVisaMasterShort: string
  shfNotePlaceholder: string

  // Spot-check module
  spcBlindItemCount: string
  spcSpotCheckDesc: string
  spcItemToCount: string
  spcSelectItemPlaceholder: string
  spcBookQtyHiddenHint: string
  spcActualQtyOnShelf: string
  spcApproveCountAndCalcVariance: string
  spcBook: string
  spcActual: string
  spcShortageCheckRecords: string
  spcSurplusCheckReceipts: string
  spcBlindCountHistory: string
  spcLastCounts: string
  spcNoCountsYet: string

  // Spot-check module — extended (placeholders, history header, result labels)
  spcNotePlaceholder: string
  spcLastCountsCount: string
  spcResultShortageLabel: string
  spcResultSurplusLabel: string

  // Dashboard module
  dshTotalSales: string
  dshTodaySales: string
  dshSinceStartOfDay: string
  dshProductsCount: string
  dshInventoryValue: string
  dshLowStockProducts: string
  dshPendingPurchaseOrders: string
  dshSalesTrend: string
  dshDailySalesTrendDesc: string
  dshNoSalesYet: string
  dshNoSalesYetDesc: string
  dshInventoryValueDistribution: string
  dshByCategory: string
  dshTopSelling: string
  dshByRevenue: string
  dshInventoryAlerts: string
  dshProductsNeedReorder: string
  dshInventoryGood: string
  dshNoLowStockProducts: string
  dshLimit: string
  dshRecentInvoices: string
  dshRecentOperations: string
  dshYouHavePendingPo: string
  dshConfirmReceiptToUpdateStock: string
  dshReviewPurchases: string
  dshLastXDays: string
  dshDataLoadFailedDesc: string
  invoiceCountLabel: string
  pendingPoCountLabel: string
  inventoryValueLabel: string
  dshSales: string
  dshDailySalesTotalDesc: string
  dshLoadingStats: string
  dshDataLoadFailed: string
  dshNoCategories: string
  dshNoInvoices: string

  // Accounting module
  accChartOfAccounts: string
  accExpenses: string
  accJournalEntries: string
  accPnl: string
  accTrialBalance: string
  accAccountingLongDesc: string
  accMainAccount: string
  accNoAccountsYet: string
  accAddSubaccountTitle: string
  accCodeAndNameRequired: string
  accSubaccountAdded: string
  accAccountAdded: string
  accCodeAlreadyUsed: string
  accAddFailed: string
  accAddSubaccountUnder: string
  accAddMainAccount: string
  accEnterNewAccountData: string
  accAccountType: string
  accTypeAsset: string
  accTypeLiability: string
  accTypeEquity: string
  accTypeRevenue: string
  accTypeExpense: string
  accTypeInheritedFromParent: string
  accAdd2: string
  accFromDateOptional: string
  accToDateOptional: string
  accAllPeriods: string
  accPnlExplanation: string
  accNetProfit: string
  accForPeriod: string
  accPnlStatement: string
  accPnlStatementDesc: string
  accTotalRevenue: string
  accCogs: string
  accGrossProfit: string
  accSalaries: string
  accAdminExpenses: string
  accTotalOpex: string
  accExpensesByCategory: string
  accJournalLedger: string
  accJournalDesc: string
  accManualEntry: string
  accLoadingJournal: string
  accNoJournalEntries: string
  accNoJournalEntriesDesc: string
  accSum: string
  accBalanced: string
  accNotBalanced: string
  accTrialBalanceDesc: string
  accNoBalances: string
  accNoBalancesDesc: string
  accCalculatingTrialBalance: string
  accRecordExpense: string
  accUpdatesBalancesImmediately: string
  accSalary: string
  accAdminExpense: string
  accEmployeeName: string
  accEmployeeNameRequired: string
  accEmployeeNamePlaceholder: string
  accAmount: string
  accPaymentDate: string
  accExpenseTitle: string
  accExpenseTitleRequired: string
  accExpenseTitlePlaceholder: string
  accPaymentAccount: string
  accSelectPaymentAccount: string
  accExpenseAccountUndefined: string
  accTotalAmount: string
  accRecordSalary: string
  accCannotDeleteWhileSaving: string
  accExpenseDeletedReversed: string
  accExpensesHistory: string
  accNoExpensesRecorded: string
  accPaidVia: string
  accEnterValidAmount: string
  accSalaryRecorded: string
  accExpenseRecorded: string
  accJournalTypeSale: string
  accJournalTypeExpense: string
  accJournalTypePurchase: string
  accJournalTypeManual: string
  accAccount: string
  accCode: string
  accAccountName: string
  accDebit: string
  accCredit: string
  accPageTitle: string
  accPageDesc: string
  accSalariesAdminHint: string
  accJournalDoubleHint: string
  accPnlHint: string
  accAccountBalances: string
  accChartOfAccountsDesc: string
  accPnlExplanationFull: string
  accPeriodStart: string
  accPeriodEnd: string
  accPnlBreakdown: string
  accPnlStatementFull: string
  accTotalRevenueFull: string
  accCogsFull: string
  accExpenseBreakdownTitle: string
  accUpdatesBalancesImmediately2: string
  accExpenseTitlePlaceholder2: string
  accPaidLabel: string
  accCatRent: string
  accCatUtilities: string
  accCatSubscriptions: string
  accCatMarketing: string
  accCatOther: string
  accJournalLedgerFull: string
  accJournalDescFull: string
  accJournalSourceSale: string
  accJournalSourceExpense: string
  accJournalSourcePurchase: string
  accJournalSourceManual: string
  accTrialBalanceDescFull: string
  accManualEntryTitle: string
  accManualEntryDesc: string
  accDescription: string
  accDescriptionPlaceholder: string
  accDescriptionRequired: string
  accJournalLines: string
  accSelectAccount: string
  accSaveJournal: string
  accAtLeastTwoLines: string
  accJournalCreated: string
  accJournalCreateFailed: string
  // SubNav + Journal flat list + print
  subNavSearch: string
  accJournalEntryDetail: string
  accJournalEntryNo: string
  accJournalSourceType: string
  accJournalCreatedAt: string
  accJournalCreatedBy: string
  accPrintJournal: string
  accExportPdf: string
  accJournalLinesCount: string
  accSearchJournal: string
  cusAddCustomer: string
  cusEditCustomer: string
  cusCustomerName: string
  cusCustomerPhone: string
  cusCustomerAddress: string
  cusCustomerType: string
  cusCustomerTypeRetail: string
  cusCustomerTypeWholesale: string
  cusCustomerTypeCorporate: string
  cusCustomerAdded: string
  cusCustomerUpdated: string
  cusCustomerDeleted: string
  cusNoCustomers: string
  cusAddFirstCustomer: string
  cusCustomerNameRequired: string
  cusCustomerPhoneRequired: string
  cusPageTitle: string
  cusPageDesc: string
  cusSearchPlaceholder: string
  cusLoadFailed: string
  cusNoMatching: string
  cusDateAdded: string
  cusTotalCountLabel: string
  cusDeleteTitle: string
  cusDeleteConfirm: string
  cusAddNewTitle: string
  cusEditDesc: string
  cusAddDesc: string
  cusNamePlaceholder: string
  cusAddressPlaceholder: string

  // Analytics module
  anlAnalyticsCards: string
  anlOverview: string
  anlSalesByDay: string
  anlTopProducts: string
  anlPaymentMethods: string
  anlCategorySales: string
  anlLowStockAnalysis: string
  anlNoData: string
  anlCalculating: string
  anlComprehensiveSummary: string
  anlStagnantItems: string
  anlUnitsSold: string
  anlItemNeverSold: string
  anlCost: string
  anlItemAnalyzed: string
  anlProfitability: string
  anlProfitableItem: string
  anlTotalQtySold: string
  anlUnit: string
  anlTotalRevenue: string
  anlInPeriod: string
  anlStagnantItemsCount: string
  anlValuePrefix: string
  anlAvgMargin: string
  anlAcrossItems: string
  anlTop6Items: string
  anlProfitabilityDistribution: string
  anlDetailedReports: string
  anlDetailedReportsDesc: string
  anlNeverSoldCount: string
  anlTopItem: string
  anlRankByQty: string
  anlNoSales: string
  anlTryWiderRange: string
  anlNeverSoldItems: string
  anlTotalStagnantItems: string
  anlStagnantValue: string
  anlStagnantDesc: string
  anlNoStagnantItems: string
  anlAllSellingWell: string
  anlSold: string
  anlTurnoverRatio: string
  anlStagnantValueCol: string
  anlNeverSold: string
  anlSlow: string
  anlHighestCost: string
  anlLowestCost: string
  anlAvgCost: string
  anlMostExpensive: string
  anlCheapest: string
  anlHighestProfitability: string
  anlProfitableItems: string
  anlProfitMargin: string
  anlMarginPct: string
  anlBreakdownByItem: string

  // Settings module
  setActiveCountry: string
  setCountry: string
  setCurrency: string
  setTaxRate: string
  setUnits: string
  setCategories: string
  setAddUnit: string
  setUnitName: string
  setUnitNamePlaceholder: string
  setUnitAdded: string
  setUnitDeleted: string
  setUnitExists: string
  setAddCategory: string
  setCategoryName: string
  setCategoryCode: string
  setCategoryCodePlaceholder: string
  setCategoryAdded: string
  setCategoryUpdated: string
  setCategoryDeleted: string
  setCategoryInUse: string
  setNoUnits: string
  setNoCategories: string
  setEditCategory: string
  setCategoryNameRequired: string
  setPageDesc: string
  setCurrentCountryLabel: string
  setLocaleCode: string
  setCountryAndCurrency: string
  setCountryPickerDesc: string
  setSaveCountry: string

  // Company / Store info (for invoices)
  companyInfoTitle: string
  companyInfoDesc: string
  companyInfoName: string
  companyInfoNamePlaceholder: string
  companyInfoAddress: string
  companyInfoAddressPlaceholder: string
  companyInfoPhone: string
  companyInfoPhonePlaceholder: string
  companyInfoVatNo: string
  companyInfoVatNoPlaceholder: string
  companyInfoLogo: string
  companyInfoLogoHint: string
  companyInfoSave: string
  companyInfoSaved: string
  companyInfoPreview: string
  setNoCountryChange: string
  setCountryUpdated: string
  setCountryUpdatedDesc: string
  setUnitsDesc: string
  setAddUnitPlaceholder: string
  setNoResults: string
  setUnitDeletedToast: string
  setCategoriesDesc: string
  setCodePlaceholder: string
  setCodeTitle: string
  setAddCategoryPlaceholder: string
  setSearchCategoriesPlaceholder: string
  setCategoryCodeExists: string
  setCategoryDeletedToast: string
  setCategoryInUseDesc: string
  setEditCategoryDesc: string
  setCodeLabel: string

  // Integrations module
  intShopify: string
  intShopifyDesc: string
  intConnect: string
  intDisconnect: string
  intSync: string
  intSyncing: string
  intSynced: string
  intSyncFailed: string
  intNotConnected: string
  intSetupGuide: string
  intStoreDomain: string
  intAccessToken: string
  intSave: string
  intTestConnection: string
  intConnectionOk: string
  intConnectionFailed: string
  intImportProducts: string
  intImportOrders: string
  intProductsImported: string
  intOrdersImported: string
  intImportFailed2: string
  intPageDesc: string
  intConnected: string
  intConnectedTo: string
  intRefreshStatus: string
  intSyncProducts: string
  intSyncProductsDesc: string
  intSyncNow: string
  intImportOrdersDesc: string
  intImporting: string
  intImportNow: string
  intFetched: string
  intCreated: string
  intUpdated: string
  intImported2: string
  intSkipped: string
  intNotes: string
  intEnvHint: string
  intStep1Title: string
  intStep1Desc: string
  intStep1Link: string
  intStep2Title: string
  intStep2Desc: string
  intStep3Title: string
  intStep3Desc: string
  intStep4Title: string
  intStep4Desc: string
  intSetupIntro: string
  intSetupFinalNote: string

  // Login module (extended)
  logInvalidCredentials: string
  logCheckEmailPassword: string
  logLoginSuccess: string
  logWelcomeDesc: string
  logUnexpectedError: string
  logLoginHeroTitle: string
  logLoginHeroDesc: string
  logFeature1: string
  logFeature2: string
  logFeature3: string
  logCopyright: string
  logDemo: string
  logTapToFill: string
  logAppName: string
  logAppTaglineShort: string

  // App-shell
  appFooterDesc: string
  appMadeWith: string
  appForSmallProjects: string

  // ── Sales module (POS + invoices + exchange + refund + confirm dialog) ──
  // Page header / generic
  posTitle: string
  posDesc: string
  invoicesDescFull: string
  newInvoice: string
  searchInvoiceOrCustomer: string
  selectInvoiceHint: string
  salesInvoice: string
  phoneAuto: string
  customerFoundPrefix: string
  newCustomerAutoInline: string
  tierLabel: string
  cartPageLabel: string
  posCheckoutWithTotal: string

  // POS toasts / confirmations
  posItemUnavailable: string
  posItemUnavailableDesc: string
  posQtyUnavailableDesc: string
  posResumeSuccessDesc: string
  posInvoiceParkedDesc: string
  posDeleteParkedConfirm: string
  posParkedDeletedToast: string
  posResumeCartReplaceConfirm: string
  posStockInsufficientDesc: string
  posResumeFailedToast: string
  posParkEmptyToast: string

  // Express POS mode (simplified cashier view)
  expressMode: string
  standardMode: string
  expressBarcodePlaceholder: string
  expressCash: string
  expressCard: string
  expressMoreOptions: string
  expressClearCart: string
  expressClearCartConfirm: string
  expressCartTitle: string
  expressCheckoutCash: string
  expressCheckoutCard: string
  expressNoProducts: string
  expressLowStock: string
  expressUnitPrice: string
  expressCustomerPhone: string
  expressCustomerName: string
  expressDiscount: string
  expressAddress: string
  posPhoneRequired: string
  posAddressRequired: string
  expressTaxRate: string
  expressDelivery: string
  expressDriverName: string
  expressDeliveryFee: string
  expressItemsInCart: string
  expressLogout: string
  expressBarcodeHint: string

  // Receipt dialog
  receiptItemsHeader: string
  receiptQtyHeader: string
  receiptTotalHeader: string
  receiptPaymentMethod: string
  receiptViewSummary: string

  // Invoices view
  invoicesRefundFullBadge: string
  invoicesRefundPartialBadge: string
  invoicesRefundedFullyBadge: string
  invoicesRefundedPartialWithAmount: string
  invoicesAdditionalRefund: string
  invoicesRefundInvoiceAction: string
  invoicesRefundedFullTotalDesc: string
  invoicesRefundedPartialDesc: string
  invoicesPageLabel: string
  invoicesCountLabel: string

  // Refund dialog
  refundSearchPlaceholder: string
  refundItemSelected: string
  refundItemNotFound: string
  refundSelectAtLeastOne: string
  refundApprovedToast: string
  refundApprovedToastDesc: string
  refund14DaysExceededToast: string
  refund14DaysExceededDesc: string
  refundFailedToast: string
  refundDialogTitle: string
  refundPartialDialogDesc: string
  refundSuccessTitle: string
  refundReturnsLabel: string
  refundTaxLabel: string
  refundTotalLabel: string
  refund14DaysWarning: string
  refund14DaysWarningDesc: string
  refundOverrideAdminLabel: string
  refundOriginalLabel: string
  refundReturnedLabel: string
  refundAvailableLabel: string
  refundLineValueLabel: string
  refundReturnsTotalLabel: string
  refundTaxWithRateLabel: string
  refundApproveBtn: string
  refundUnitSuffix: string

  // Exchange view
  excDesc: string
  excNewExchangeBtn: string
  excInvoiceExample: string
  excInvoiceNotFoundShort: string
  excInvoiceEligibleLabel: string
  excInvoiceExpiredLabel: string
  excInvoiceDatePrefix: string
  excOriginalItemsHint: string
  excReturnsByScanTitle: string
  excNewItemsTitle: string
  excScanReturnPlaceholder2: string
  excScanToAddHint: string
  excNoNewItems: string
  excPricePrefix: string
  excRemainingAfterReturnPrefix: string
  excSettlementMethodLabel: string
  excNotePlaceholder: string
  excNetEvenLabel: string
  excApproveExchangeBtn: string
  excExchangeSuccessDesc: string
  excCustomerPrefix: string
  excSettlementPrefix: string
  excConfirmDesc: string
  excReturnExceedsRemainingMsg: string
  excAddItemsFirst: string
  excOriginalInvoiceRequiredDesc: string
  excCtrlEnterConfirmHint: string
  excSearchNewItemsPlaceholder: string

  // Sale confirm dialog
  saleConfirmDialogTitle: string
  saleConfirmDialogDesc: string
  saleConfirmPaymentMethod: string
  saleConfirmGrandTotalLabel: string
  saleConfirmCancelBtn: string
  saleConfirmConfirmBtn: string
  saleConfirmCtrlEnterHint: string
  saleConfirmOrCtrlEnter: string

  // ── Inventory module — page header & misc (IMPL-I18N-INVENTORY-PURCHASES) ──
  invManageTitle: string
  invManageDesc: string
  invItemsTab: string
  printBarcode: string
  openingPrintWindow: string
  barcodeLabelsCount: string
  noLowStockProducts: string
  noLowStockDesc: string
  addFirstProduct: string
  productsCountLabel: string
  deleteProductPermanent: string

  // Product form dialog
  editProductDesc: string
  addProductDesc: string
  productNamePlaceholder: string
  barcodePlaceholder: string
  autoGenerateBarcodeTitle: string
  selectCategoryForAutoHint: string
  unitNotInList: string
  totalQtyLabel: string
  warehouseStockSum: string
  optimalOrderQtyHint: string
  salePriceEditLockedTitle: string
  addProductButton: string

  // Warehouse manager
  warehouseManagerDesc: string
  noWarehousesDesc: string
  warehouseInactive: string
  warehouseUnitsCount: string
  deleteWarehouseConfirmLong: string

  // Warehouse form dialog
  editWarehouseDesc: string
  addWarehouseDesc: string
  warehouseNameInputPlaceholder: string
  warehouseCodePlaceholder: string
  warehouseLocationInputPlaceholder: string

  // Purchases view
  purchasesTitleLong: string
  purchasesDescLong: string
  allStatuses: string
  noPurchaseOrdersDesc: string
  poDetailsDescLong: string
  landedCostSectionTitle: string
  landedCostAppliedLong: string
  landedCostPreviewLongDetail: string
  autoDraftDialogTitle: string
  autoDraftDialogDesc: string
  suggestedQtyFormulaLong: string
  createDraftButton: string
  noItemsNeedReorderForSupplier: string
  noItemsNeedReorderForSupplierDesc: string
  poDraftPendingApprovalDesc: string
  poReceivedWithStockDesc: string
  poReceiveFailedShort: string
  poCancelFailedShort: string
  poDeleteFailedShort: string
  confirmReceiptDescLong: string
  updateCostPricesTitle: string
  updateCostPricesConfirmDesc: string
  proceedQuestion: string
  cancelPoConfirmLong: string

  // Purchase order dialog
  newPoDescLong: string
  createOrder: string
  suggestedSalePriceHint: string
  emptyMeansNoChangeInput: string
  landedCostPreviewLong: string
  additionalFeesShort: string
  grandTotalLong: string

  // PO approval panel
  pendingReviewCount: string
  autoPoDraftsDescLong: string
  noApprovalDraftsDescLong: string
  reviewPoDraftTitle: string
  editAndApprovePoTitle: string
  approvePoTitle: string
  editAndApproveDescLong: string
  approvePoDescLong: string
  afterApprovalReadyDesc: string
  editAndApproveButton: string
  approveButton: string
  rejectPoTitleShort: string
  rejectReasonPlaceholderLong: string
  rejectReasonRequired: string
  confirmRejectButton: string
  approveWithEditsTooltip: string
  approveAsIsTooltip: string

  // Suppliers view
  suppliersDescLong: string
  suppliersLoadFailedShort: string
  noSuppliers: string
  noSuppliersDesc: string
  noContactData: string
  ordersCountLabel: string
  deleteSupplierConfirmLong: string
  cannotDeleteLinkedSupplier: string

  // Supplier form dialog
  editSupplierDesc: string
  addSupplierDesc: string
  supplierNameInputPlaceholder: string
  contactPersonPlaceholder: string
  phoneInputPlaceholder: string
  emailInputPlaceholder: string
  addressInputPlaceholder: string

  // Purchase invoices / GRN
  navPurchaseInvoices: string
  // Supplier payments (سداد الموردين)
  navSupplierPayments: string
  supplierPaymentsTitle: string
  supplierPaymentsDesc: string
  newSupplierPayment: string
  paySupplier: string
  supplierBalance: string
  amountPaid: string
  paymentDateLabel: string
  paymentNoLabel: string
  referenceNo: string
  paymentMethodCash: string
  paymentMethodBank: string
  paymentMethodCheck: string
  noSupplierPayments: string
  supplierPaymentCreated: string
  supplierPaymentDeleted: string
  supplierPaymentCreateFailed: string
  supplierPaymentDeleteFailed: string
  paymentMethodLabel: string
  // Supplier statement (كشف حساب المورد)
  supplierStatement: string
  supplierStatementTitle: string
  supplierStatementDesc: string
  statementFrom: string
  statementTo: string
  statementInvoicesTotal: string
  statementPaymentsTotal: string
  statementReturnsTotal: string
  statementOpeningBalance: string
  statementClosingBalance: string
  statementPrint: string
  statementNoTransactions: string
  statementInvoice: string
  statementPayment: string
  statementReturn: string
  statementDate: string
  statementType: string
  statementDebit: string
  statementCredit: string
  statementBalance: string
  statementReference: string
  statementDescription: string
  // Purchase returns (مرتجعات المشتريات)
  purchaseReturnsTitle: string
  purchaseReturnsDesc: string
  newPurchaseReturn: string
  returnFromPO: string
  returnableQty: string
  returnTotal: string
  returnNo: string
  noPurchaseReturns: string
  purchaseReturnCreated: string
  purchaseReturnCreateFailed: string
  approveReturn: string
  returnOriginalQty: string
  returnAvailable: string
  returnFullyReturned: string
  returnSelectQty: string
  // Stock take (جرد المخزون)
  stockTakeTab: string
  stockTakeTitle: string
  stockTakeDesc: string
  newStockTake: string
  systemQty: string
  actualQty: string
  varianceLabel: string
  varianceValue: string
  shortage: string
  surplus: string
  approveStockTake: string
  stockTakeApproved: string
  noStockTakes: string
  stockTakeCreated: string
  stockTakeCreateFailed: string
  stockTakeApproveFailed: string
  stockTakeWarehouse: string
  stockTakeAllWarehouses: string
  stockTakeConfirmApprove: string
  stockTakeConfirmApproveDesc: string
  // Stock transfers (التحويلات بين المخازن)
  stockTransferTab: string
  stockTransferTitle: string
  stockTransferDesc: string
  newStockTransfer: string
  fromWarehouse: string
  toWarehouse: string
  receiveTransfer: string
  transferOut: string
  transferReceived: string
  transferInTransit: string
  transferCancelled: string
  noStockTransfers: string
  transferCreated: string
  transferCreateFailed: string
  transferReceiveFailed: string
  transferSameWarehouse: string
  // Stock movement report (تقرير حركة المخزون)
  stockMovementTab: string
  stockMovementReport: string
  stockMovementDesc: string
  movementTypeAll: string
  movementQuantityChange: string
  movementUser: string
  movementTypeSale: string
  movementTypeRefund: string
  movementTypeExchange: string
  movementTypePurchaseInvoice: string
  movementTypePurchaseReturn: string
  movementTypeTransferOut: string
  movementTypeTransferIn: string
  movementTypeStockTake: string
  movementTypeSpotCheck: string
  movementNoData: string
  movementExportCsv: string
  // Audit log (سجل التدقيق)
  navAudit: string
  auditTitle: string
  auditDesc: string

  // Bundles (الباقات)
  navBundles: string
  bundlesTitle: string
  bundlesDesc: string
  bundleAddNew: string
  bundleEditTitle: string
  bundleName: string
  bundleNamePlaceholder: string
  bundleDescription: string
  bundleSalePrice: string
  bundleIsActive: string
  bundleStartDate: string
  bundleEndDate: string
  bundleCategory: string
  bundleItems: string
  bundleAddItem: string
  bundleSelectProduct: string
  bundleQuantity: string
  bundleRemoveItem: string
  bundleTotalCost: string
  bundleRetailTotal: string
  bundleProfit: string
  bundleDiscountPct: string
  bundleNoItems: string
  bundleSaveSuccess: string
  bundleDeleteConfirm: string
  bundleActiveOnly: string
  bundleInactive: string
  bundleSearchPlaceholder: string
  bundleSeasonal: string
  bundleNoBundles: string

  // Compositions (التركيبات)
  navCompositions: string
  compositionsTitle: string
  compositionsDesc: string
  compAddNew: string
  compEditTitle: string
  compName: string
  compNamePlaceholder: string
  compDescription: string
  compOutputProduct: string
  compOutputProductHint: string
  compYieldQty: string
  compYieldUnit: string
  compNotes: string
  compNotesPlaceholder: string
  compIsActive: string
  compIngredients: string
  compAddIngredient: string
  compSelectIngredient: string
  compIngredientQty: string
  compIngredientUnit: string
  compIngredientNotes: string
  compRemoveIngredient: string
  compCostPerBatch: string
  compCostPerUnit: string
  compNoIngredients: string
  compProduce: string
  compProduceConfirm: string
  compProduceSuccess: string
  compProduceFailed: string
  compProduceBatchQty: string
  compInsufficientStock: string
  compProduceInsufficientDesc: string
  compSaveSuccess: string
  compDeleteConfirm: string
  compNoCompositions: string
  compSearchPlaceholder: string
  auditLogs: string
  auditVoidRate: string
  auditSuspicious: string
  auditNormal: string
  auditVoidThresholdHint: string
  auditActionVoidItem: string
  auditActionCancelTxn: string
  auditActionRefund: string
  auditActionExchange: string
  auditActionManualDiscount: string
  auditActionDrawerOpen: string
  auditActionHoldBill: string
  auditActionManagerApproval: string
  // Advanced financial reports
  accBalanceSheet: string
  accCashFlow: string
  accCustomerStatement: string
  accVatReport: string
  accAssets: string
  accLiabilities: string
  accEquity: string
  accInflows: string
  accOutflows: string
  accNetCashFlow: string
  accOpeningCash: string
  accClosingCash: string
  accOutputVat: string
  accInputVat: string
  accNetVat: string
  accSalesVatTotal: string
  accPurchasesVatTotal: string
  accBalanceSheetBalanced: string
  accBalanceSheetNotBalanced: string
  // General ledger report (دفتر الأستاذ العام)
  generalLedger: string
  generalLedgerDesc: string
  glSelectAccount: string
  glEntryNo: string
  glRunningBalance: string
  glNoAccountSelected: string
  glNoMovements: string
  glOpeningBalance: string
  glDate: string
  glDescription: string
  // Export toolbar
  exportPDF: string
  exportExcel: string
  exportFailedMsg: string
  exportSucceededMsg: string
  piTitle: string
  piDesc: string
  piNew: string
  piNo: string
  piPost: string
  piSaveDraft: string
  piSavePost: string
  piPostConfirm: string
  piDraft: string
  piPosted: string
  piCancelled: string
  piReceiveFromPO: string
  piImportFromPO: string
  piPostedSuccess: string
  piCreated: string
  piDeleted: string
  piCannotDeletePosted: string
  piSelectSupplier: string
  piSelectWarehouse: string
  piSelectPO: string
  piNoPO: string
  piItems: string
  piAddItem: string
  piSubtotal: string
  piTaxAmount: string
  piTotal: string
  piLandedCost: string
  piNoInvoices: string
}

export const DICTS: Record<Locale, Dict> = {
  ar: {
    dir: "rtl",
    appName: "نظام المتجر",
    appTagline: "إدارة المبيعات والمخازن والمشتريات",
    navDashboard: "لوحة التحكم",
    navManagerDashboard: "لوحة المدير",
    managerDashboardTitle: "لوحة المدير",
    managerDashboardDesc: "نظرة عملياتية سريعة على أداء المتجر",
    navOwnerDashboard: "لوحة المالك",
    ownerDashboardTitle: "لوحة المالك",
    ownerDashboardDesc: "نظرة شاملة على أداء الأعمال والربحية",
    navSales: "نقاط البيع",
    navInvoices: "الفواتير",
    navReports: "التقارير",
    navInventory: "المخزون",
    navPurchases: "المشتريات",
    navSuppliers: "الموردين",
    navCustomers: "العملاء",
    navAnalytics: "تحليلات المبيعات",
    navAccounting: "المحاسبة",
    navIntegrations: "التكاملات",
    navSettings: "الإعدادات",
    navShifts: "الورديات",
    navSpotCheck: "الجرد الأعمى",
    navExchanges: "التبديل",
    navPricing: "إدارة الأسعار",
    navUsers: "المستخدمون",
    navInvoicesReports: "الفواتير والتقارير",
    navInventoryPurchases: "إدارة المخازن والمشتريات",
    navAccountingCustomers: "الحسابات والعملاء",
    navSystem: "الإعدادات",
    navOperations: "العمليات اليومية",
    roleAdmin: "مدير النظام",
    roleOwner: "المالك",
    roleManager: "مدير",
    roleAccountant: "محاسب",
    roleSales: "موظف مبيعات",
    roleWarehouse: "أمين مخزن",
    roleCashier: "كاشير",
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
    noDataDescription: "ستظهر البيانات هنا بمجرد إضافتها.",
    confirmDescription: "هل أنت متأكد؟ لا يمكن التراجع عن هذه العملية.",
    retry: "إعادة المحاولة",
    total: "الإجمالي",

    // Common — products
    product: "المنتج",
    products: "المنتجات",
    productRequired: "المنتج مطلوب",
    productName: "اسم المنتج",
    productNotFound: "المنتج غير موجود",
    productDeleted: "تم حذف المنتج",
    productUpdated: "تم تحديث المنتج",
    productAdded: "تمت إضافة المنتج",
    productNameRequired: "اسم المنتج مطلوب",
    productImage: "صورة المنتج",

    // Common — customers
    customer: "العميل",
    customers: "العملاء",
    cashCustomer: "عميل نقدي",
    customerName: "اسم العميل",
    customerPhone: "هاتف العميل",
    customerNameRequired: "اسم العميل مطلوب",

    // Common — suppliers
    supplier: "المورّد",
    suppliers: "الموردين",
    supplierName: "اسم المورّد",
    supplierNameRequired: "اسم المورّد مطلوب",
    supplierNamePlaceholder: "اكتب اسم المورّد",
    contactPerson: "مسؤول التواصل",
    supplierRequired: "المورّد مطلوب",
    selectSupplier: "اختر المورّد",
    selectSupplierFirst: "اختر المورّد أولاً",
    supplierDeleted: "تم حذف المورّد",
    supplierUpdated: "تم تحديث المورّد",
    supplierAdded: "تمت إضافة المورّد",

    // Common — quantity / stock
    qty: "الكمية",
    quantity: "الكمية",
    qtyRequired: "الكمية مطلوبة",
    qtyUnavailable: "الكمية غير متوفرة",
    qtyExceedsStock: "الكمية تتجاوز المخزون",
    qtyInsufficient: "الكمية غير كافية",
    stockInsufficient: "المخزون غير كافٍ",
    stock: "المخزون",
    inStock: "متوفر",
    outOfStock: "نفد من المخزون",
    outOfStockShort: "نفد",
    outOfStockFull: "نفد من المخزون",
    lowStock: "مخزون منخفض",
    nearOutOfStock: "قارب على النفاد",
    available: "متوفر",
    availableFrom: "متوفر من",
    currentQty: "الكمية الحالية",

    // Common — price / barcode
    price: "السعر",
    unitPrice: "سعر الوحدة",
    costPrice: "سعر التكلفة",
    salePrice: "سعر البيع",
    wholesalePrice: "سعر الجملة",
    corporatePrice: "سعر الشركات",
    barcode: "الباركود",
    barcodeGenerated: "تم توليد الباركود",
    barcodeGenerateFailed: "فشل توليد الباركود",
    autoGenerate: "توليد تلقائي",
    autoGenerateBarcode: "توليد الباركود تلقائياً",
    selectCategoryFirst: "اختر التصنيف أولاً",
    selectCategoryForAuto: "اختر التصنيف للتوليد التلقائي",
    generateBarcode: "توليد الباركود",

    // Common — category
    category: "التصنيف",
    categories: "التصنيفات",
    allCategories: "كل الأقسام",
    allProducts: "كل المنتجات",
    selectCategory: "اختر التصنيف",
    categoryRequired: "التصنيف مطلوب",
    categoryName: "اسم التصنيف",
    categoryCode: "رمز التصنيف",
    categoryCodePlaceholder: "مثال: FOOD",

    // Common — date / period
    date: "التاريخ",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    from: "من",
    to: "إلى",
    period: "الفترة",
    allPeriods: "كل الفترات",
    quickRange: "نطاق سريع",
    last7Days: "آخر 7 أيام",
    last30Days: "آخر 30 يوماً",
    last90Days: "آخر 90 يوماً",
    lastYear: "السنة الماضية",

    // Common — status / misc
    status: "الحالة",
    note: "ملاحظة",
    noteOptional: "ملاحظة (اختياري)",
    notePlaceholder: "أضف ملاحظة...",
    optional: "اختياري",
    required: "مطلوب",
    actions: "إجراءات",
    open: "فتح",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    none: "لا شيء",

    // Common — money
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    tax: "الضريبة",
    taxPercent: "نسبة الضريبة",
    taxRate: "نسبة الضريبة",
    totalAmount: "المبلغ الإجمالي",
    amount: "المبلغ",
    amountDue: "المبلغ المستحق",
    totalPaid: "الإجمالي المدفوع",
    grandTotal: "الإجمالي الكلي",
    invoiceTotal: "إجمالي الفاتورة",
    additionalFees: "رسوم إضافية",
    country: "الدولة",
    currency: "العملة",

    // Common — payment
    payment: "الدفع",
    paymentMethod: "طريقة الدفع",
    paymentMethodShort: "الدفع",
    cash: "نقدي",
    card: "بطاقة",
    transfer: "تحويل",
    cashShort: "نقدي",
    cardShort: "بطاقة",
    transferShort: "تحويل",
    payCash: "دفع نقدي",
    payCard: "دفع بالبطاقة",
    payTransfer: "دفع بالتحويل",

    // Common — unit
    unit: "الوحدة",
    units: "وحدات القياس",
    unitRequired: "الوحدة مطلوبة",
    selectUnit: "اختر الوحدة",
    piece: "قطعة",
    pieceDefault: "قطعة (افتراضي)",

    // Common — warehouse
    warehouse: "المخزن",
    warehouses: "المخازن",
    warehouseName: "اسم المخزن",
    warehouseNameRequired: "اسم المخزن مطلوب",
    warehouseNamePlaceholder: "اكتب اسم المخزن",
    warehouseCode: "رمز المخزن",
    warehouseLocation: "موقع المخزن",
    warehouseDeleted: "تم حذف المخزن",
    warehouseUpdated: "تم تحديث المخزن",
    warehouseAdded: "تمت إضافة المخزن",
    warehouseHasStock: "لا يمكن حذف مخزن يحتوي على مخزون",
    noWarehouses: "لا توجد مخازن",
    addWarehouse: "إضافة مخزن",
    addFirstWarehouse: "أضف مخزنك الأول",
    selectWarehouse: "اختر المخزن",

    // Common — branch
    branch: "الفرع",
    branchWarehouse: "فرع / مخزن",
    allBranches: "كل الفروع",

    // Common — search
    searchPlaceholder: "بحث...",
    noResults: "لا توجد نتائج",
    recentPages: "حديث",
    globalSearchHint: "بحث شامل",
    searchProductPlaceholder: "ابحث عن منتج...",
    searchNameBarcode: "ابحث بالاسم أو الباركود",
    searchInvoicePlaceholder: "ابحث عن فاتورة...",
    searchNameBarcodePlaceholder: "اكتب الاسم أو امسح الباركود...",

    // Common — items
    items: "الأصناف",
    itemsCount: "عدد الأصناف",
    itemCount: "صنف",
    itemsCountLabel: "{count} صنف",
    noItems: "لا توجد أصناف",
    noProducts: "لا توجد منتجات",
    noProductsToPrint: "لا توجد منتجات للطباعة",
    noMatchingProducts: "لا توجد منتجات مطابقة",
    noDataForPeriod: "لا توجد بيانات لهذه الفترة",
    tryAnotherKeyword: "جرّب كلمة بحث أخرى",

    // Common — loading / progress
    reload: "إعادة تحميل",
    loadingPrices: "جارٍ تحميل الأسعار...",
    loadingShifts: "جارٍ تحميل الورديات...",
    loadingJournal: "جارٍ تحميل القيود...",
    loadingStats: "جارٍ تحميل الإحصائيات...",
    loadingAudit: "جارٍ تحميل سجل التدقيق...",
    calculatingReport: "جارٍ حساب التقرير...",
    calculatingMatrix: "جارٍ حساب المصفوفة...",
    calculatingFinancialReport: "جارٍ حساب التقرير المالي...",
    updating: "جارٍ التحديث...",
    executing: "جارٍ التنفيذ...",
    completing: "جارٍ الإتمام...",
    approving: "جارٍ الاعتماد...",
    applying: "جارٍ التطبيق...",

    // Common — errors
    loadFailed: "فشل التحميل",
    productsLoadFailed: "فشل تحميل المنتجات",
    invoicesLoadFailed: "فشل تحميل الفواتير",
    poLoadFailed: "فشل تحميل أوامر الشراء",
    suppliersLoadFailed: "فشل تحميل الموردين",
    reportLoadFailed: "فشل تحميل التقرير",
    pricesLoadFailed: "فشل تحميل الأسعار",
    approvalDraftsLoadFailed: "فشل تحميل مسودات الاعتماد",
    auditLoadFailed: "فشل تحميل سجل التدقيق",
    dataLoadFailed: "فشل تحميل البيانات",

    // Common — save / export / import
    saveChanges: "حفظ التغييرات",
    saveFailed: "فشل الحفظ",
    deleteFailed: "فشل الحذف",
    addFailed: "فشل الإضافة",
    recordFailed: "فشل التسجيل",
    exportFailed: "فشل التصدير",
    exportSucceeded: "تم التصدير بنجاح",
    importedToExcel: "تم الاستيراد إلى Excel",
    exportedToExcel: "تم التصدير إلى Excel",
    importSucceeded: "تم الاستيراد بنجاح",
    importFailed: "فشل الاستيراد",
    importSummary: "جُلب: {total} • أُنشئ: {created} • حُدّث: {updated} • تخطّي: {skipped}",
    uploadExcelFile: "ارفع ملف Excel",
    downloadEmptyTemplate: "تحميل قالب فارغ",
    imageUploaded: "تم رفع الصورة",
    imageUploadFailed: "فشل رفع الصورة",
    imageTooLarge: "حجم الصورة كبير جدًا — الحد الأقصى 2 ميجابايت",
    imageResizeFailed: "تعذّر معالجة الصورة — حاول بصورة أخرى",
    changeImage: "تغيير الصورة",
    uploadImage: "رفع صورة",
    imageFormatsHint: "الصيغ المسموحة: JPG, PNG, WEBP",

    // Common — filters
    filters: "الفلاتر",
    activeFilters: "الفلاتر المفعّلة",
    applyFilters: "تطبيق الفلاتر",
    resetFilters: "إعادة تعيين الفلاتر",
    activeLabel: "مفعّل",
    filterBy: "تصفية حسب",
    source: "المصدر",
    allSources: "كل المصادر",
    posSource: "نقاط البيع",
    shopifySource: "شوبيفاي",

    // Common — pagination / nav
    expandAll: "توسيع الكل",
    collapseAll: "طيّ الكل",
    previous: "السابق",
    next: "التالي",
    pageXofY: "صفحة {x} من {y}",
    viewDetails: "عرض التفاصيل",
    openItem: "فتح العنصر",
    fetchInvoice: "استدعاء الفاتورة",
    lookupInvoice: "البحث عن فاتورة",

    // Common — form fields
    name: "الاسم",
    namePlaceholder: "اكتب الاسم",
    phone: "الهاتف",
    phonePlaceholder: "اكتب رقم الهاتف",
    emailPlaceholder: "name@example.com",
    address: "العنوان",
    addressPlaceholder: "اكتب العنوان",
    selectPlaceholder: "اختر...",
    selectItem: "اختر عنصراً",

    // Common — selection actions
    selectProduct: "اختر المنتج",
    selectProductFirst: "اختر المنتج أولاً",
    addAtLeastOneProduct: "أضف منتجاً واحداً على الأقل",
    addLine: "إضافة سطر",
    addRow: "إضافة صف",
    addProduct: "إضافة منتج",
    addProductNew: "إضافة منتج جديد",
    editProduct: "تعديل المنتج",
    addSupplier: "إضافة مورّد",
    addSupplierNew: "إضافة مورّد جديد",
    editSupplier: "تعديل المورّد",
    addWarehouseNew: "إضافة مخزن جديد",
    editWarehouse: "تعديل المخزن",
    addCategory: "إضافة تصنيف",
    editCategory: "تعديل التصنيف",

    // Common — delete confirmations
    deleteProductTitle: "حذف المنتج",
    deleteProductConfirm: "هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.",
    deleteSupplierTitle: "حذف المورّد",
    deleteSupplierConfirm: "هل أنت متأكد من حذف هذا المورّد؟ لا يمكن التراجع.",
    deleteWarehouseTitle: "حذف المخزن",
    deleteWarehouseConfirm: "هل أنت متأكد من حذف هذا المخزن؟ لا يمكن التراجع.",
    deleteConfirm: "هل أنت متأكد من الحذف؟",

    // Page titles
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
    shiftsTitle: "الورديات وتسوية النقدية",
    shiftsDesc: "فتح/إغلاق الوردية ومطابقة K-Net والفيزا",
    spotCheckTitle: "الجرد الأعمى السريع",
    spotCheckDesc: "جرد مفاجئ للأصناف الحساسة بدون كشف الرصيد الدفتري",
    exchangesTitle: "التبديل والاستبدال",
    exchangesDesc: "تبديل الأصناف وإشعارات الدائن",
    pricingTitle: "التسعير والعروض",
    pricingDesc: "تعديل أسعار البيع وإدارة الخصومات المؤقتة وسجل التغييرات",
    usersTitle: "إدارة المستخدمين",
    usersDesc: "إدارة حسابات المستخدمين والأدوار والصلاحيات",
    newUser: "مستخدم جديد",
    editUser: "تعديل مستخدم",
    newUserDesc: "إنشاء حساب مستخدم جديد",
    editUserDesc: "تحديث بيانات المستخدم والدور",
    userDeleted: "تم حذف المستخدم",
    emailExists: "البريد الإلكتروني مستخدم بالفعل",
    userDeleteConfirm: "حذف المستخدم \'{name}\'؟",
    noUsers: "لا يوجد مستخدمون",
    role: "الدور",
    you: "أنت",
    noAccess: "لا تملك صلاحية الوصول",
    noAccessDesc: "هذه الصفحة غير متاحة لدورك الوظيفي. تواصل مع المدير إذا كنت تعتقد أن هذا خطأ.",
    noExportPermission: "لا تملك صلاحية تصدير هذه البيانات",

    // Theme + language
    darkMode: "الوضع الليلي",
    lightMode: "الوضع النهاري",
    switchLang: "English",
    logout: "تسجيل الخروج",

    // Login
    loginTitle: "تسجيل الدخول",
    loginDesc: "أدخل بيانات حسابك للوصول إلى لوحة التحكم",
    email: "البريد الإلكتروني",
    emailOrUsername: "البريد أو اسم المستخدم",
    password: "كلمة المرور",
    login: "دخول",
    loggingIn: "جارٍ الدخول...",
    demoAccounts: "حسابات تجريبية",
    welcomeBack: "أهلاً بك",

    // POS module
    cart: "السلة",
    cartEmpty: "السلة فارغة",
    cartEmptyPark: "السلة فارغة — لا يمكن التعليق",
    clearCart: "إفراغ السلة",
    tapToAddProduct: "انقر لإضافة منتج",
    checkoutSale: "إتمام البيع",
    checkoutFailed: "فشل إتمام البيع",
    saleCompleted: "تم إتمام البيع",
    saleCompletedDesc: "تم تسجيل الفاتورة بنجاح",
    sessionExpired: "انتهت الجلسة",
    pleaseRelogin: "يرجى إعادة تسجيل الدخول",
    park: "تعليق",
    parked: "معلّقة",
    parkedInvoices: "الفواتير المعلّقة",
    parkedInvoicesCount: "{count} فاتورة معلّقة",
    noParkedInvoices: "لا توجد فواتير معلّقة",
    parkCurrentInvoice: "تعليق الفاتورة الحالية",
    parkFailed: "فشل تعليق الفاتورة",
    invoiceParked: "تم تعليق الفاتورة",
    holdNo: "رقم التعليق",
    parkedDeleted: "تم حذف الفاتورة المعلّقة",
    deleteParkedConfirm: "هل تريد حذف هذه الفاتورة المعلّقة؟",
    replaceCartConfirm: "هل تريد استبدال محتويات السلة الحالية؟",
    resume: "استئناف",
    resumeInvoiceFailed: "فشل استئناف الفاتورة",
    invoiceRestored: "تم استعادة الفاتورة",
    unnamed: "بدون اسم",
    parkListTitle: "الفواتير المعلّقة",
    customerSection: "بيانات العميل",
    paymentSection: "الدفع",
    phoneAutoSearch: "البحث التلقائي بالهاتف",
    existingCustomer: "عميل حالي",
    newCustomerAuto: "عميل جديد تلقائياً",
    priceTier: "فئة السعر",
    tierRetail: "تجزئة",
    tierWholesale: "جملة",
    tierCorporate: "شركات",
    priceType: "نوع السعر",
    basePrice: "السعر الأساسي",
    effectivePrice: "السعر الفعلي",
    promoPrice: "سعر العرض",
    promo: "عرض",
    promoActive: "عرض ساري",
    deliveryRequest: "طلب توصيل",
    deliveryFee: "رسوم التوصيل",
    driverName: "اسم السائق",
    driverNamePlaceholder: "اكتب اسم السائق",
    deliveryFeeLabel: "رسوم التوصيل",

    // Exchange module
    fullyReturned: "مُرتجع بالكامل",
    original: "الأصلية",
    returned: "مُرتجع",
    returnable: "قابل للإرجاع",
    returnQty: "كمية الإرجاع",
    returnValue: "قيمة الإرجاع",
    refundTotal: "إجمالي الاسترداد",
    refundInvoice: "استرداد الفاتورة",
    refundDialogDesc: "هل أنت متأكد من اعتماد استرداد هذه الفاتورة؟",
    refundApproved: "تم اعتماد الاسترداد",
    refundFailed: "فشل اعتماد الاسترداد",
    refundApprovedSuccess: "تم اعتماد الاسترداد بنجاح",
    refundBlocked: "لا يمكن الاسترداد",
    exceeded14Days: "تجاوزت 14 يوماً",
    enable14DayOverride: "تفعيل تجاوز قاعدة 14 يوماً",
    override14Days: "تجاوز قاعدة 14 يوماً",
    partialRefund: "استرداد جزئي",
    partialRefundReason: "سبب الاسترداد الجزئي",
    fullRefund: "استرداد كلي",
    refundedFull: "تم الاسترداد كاملاً",
    refundedPartial: "تم الاسترداد جزئياً",
    refundedFully: "مسترد بالكامل",
    refundMore: "استرداد المزيد",
    creditNote: "إشعار دائن",
    creditNoteTotal: "إجمالي إشعار الدائن",
    totalReturns: "إجمالي المرتجعات",
    returns: "المرتجعات",
    scanOrTypePlaceholder: "امسح أو اكتب...",
    perUnit: "للوحدة",
    originalInvoice: "الفاتورة الأصلية",
    originalInvoiceRequired: "الفاتورة الأصلية مطلوبة",
    originalInvoiceNotFound: "الفاتورة الأصلية غير موجودة",
    invoiceExpired14Days: "انقضت أكثر من 14 يوماً على الفاتورة",
    invoiceExpired14DaysLong: "عذراً، انقضت أكثر من 14 يوماً على هذه الفاتورة — لا يمكن التبديل",
    invoiceDate: "تاريخ الفاتورة",
    invoiceNo: "رقم الفاتورة",
    invoiceNoPlaceholder: "اكتب أو امسح رقم الفاتورة...",
    invoiceNotFoundRetry: "الفاتورة غير موجودة، حاول مرة أخرى",
    invoiceNumber: "رقم الفاتورة",
    originalInvoiceItems: "أصناف الفاتورة الأصلية",
    returnableQtyHint: "الكمية القابلة للإرجاع",
    itemNotInOriginalInvoice: "عذراً، هذا الصنف غير موجود في الفاتورة الأصلية!",
    itemFullyReturned: "عذراً، هذا الصنف تم استبداله أو إرجاعه بالكامل سابقاً من هذه الفاتورة!",
    scannedQtyExceedsReturnable: "الكمية الممسوحة تجاوزت الكمية القابلة للإرجاع",
    returnExceedsRemaining: "الإرجاع يتجاوز الكمية المتبقية",
    enterInvoiceNoFirst: "أدخل رقم الفاتورة أولاً",
    fetchOriginalInvoice: "استدعاء الفاتورة الأصلية",
    mandatory: "إلزامي",
    eligibleForExchange: "صالحة للتبديل",
    daysPassed: "الأيام المنقضية",
    newExchange: "تبديل جديد",
    exchangeApproved: "تم اعتماد التبديل",
    exchangeApproveFailed: "فشل اعتماد التبديل",
    exchangeApprovedSuccess: "تم اعتماد التبديل بنجاح",
    exchangeNo: "رقم التبديل",
    exchangeNotePlaceholder: "ملاحظة (اختياري)",
    settlementMethod: "طريقة التسوية",
    returnsTotal: "إجمالي المرتجع",
    newTotal: "الإجمالي الجديد",
    returnsByScan: "المرتجع بالمسح",
    newItems: "الأصناف الجديدة",
    scanReturnPlaceholder: "امسح باركود الصنف المرجع",
    scanAddsOneHint: "كل مسح يضيف وحدة واحدة. لا يمكن إدخال الكمية يدوياً — فقط بالمسح وزر الإلغاء.",
    scanToAddReturn: "امسح لإضافة مرتجع",
    remainingAfterReturn: "المتبقي بعد الإرجاع",
    undoLastScan: "تراجع عن آخر مسح (−1)",
    qtyScanOnly: "الكمية بالمسح فقط",
    addAnotherScan: "أضف مسحاً آخر",
    deleteReturnItem: "حذف صنف المرتجع",
    searchNewPlaceholder: "ابحث عن صنف جديد...",
    noNewItemsSearch: "لا توجد أصناف مطابقة",
    collectFromCustomer: "تحصيل من العميل",
    refundToCustomer: "رد للعميل",
    exchange: "تبديل",
    even: "متساوي",
    evenExchange: "تبديل متساوي",
    approveExchange: "اعتماد التبديل",
    confirmExchangeTitle: "تأكيد اعتماد التبديل",
    confirmExchangeDesc: "هل أنت متأكد من اعتماد هذا التبديل؟",
    afterApprovalReady: "بعد الاعتماد سيتم تنفيذ التبديل",
    ctrlEnterHint: "Ctrl+Enter للاعتماد",
    ctrlEnterShortcut: "Ctrl+Enter",
    yesApproveExchange: "نعم، اعتماد التبديل",
    yesComplete: "نعم، إتمام",
    printReceipt: "طباعة الإيصال",
    newSale: "بيع جديد",
    thermalPrint: "طباعة حرارية",
    thermalPrint80: "طباعة حرارية 80مم",
    a4Print: "طباعة A4",
    posAutoPrint: "طباعة تلقائية",

    // Promotions / discounts
    discountType: "نوع الخصم",
    discountValue: "قيمة الخصم",
    discountPercent: "نسبة الخصم",
    discountAmount: "مبلغ الخصم",
    discountMustBePositive: "قيمة الخصم يجب أن تكون موجبة",
    discountMax100: "نسبة الخصم لا يمكن أن تتجاوز 100%",
    percent: "نسبة مئوية",
    fixedAmount: "مبلغ ثابت",
    value: "القيمة",
    valuePlaceholder: "أدخل القيمة",
    fromDate2: "من تاريخ",
    toDate2: "إلى تاريخ",
    promotions: "العروض",
    promotionsAndDiscounts: "العروض والخصومات",
    newPromotion: "عرض جديد",
    createPromotion: "إنشاء عرض",
    promoCreated: "تم إنشاء العرض",
    promoCreateFailed: "فشل إنشاء العرض",
    promoDeactivated: "تم إيقاف العرض",
    promoDeactivateFailed: "فشل إيقاف العرض",
    deactivatePromotionConfirm: "هل تريد إيقاف هذا العرض؟",
    deactivate: "إيقاف",
    currentPromotions: "العروض الحالية",
    noPromotions: "لا توجد عروض",
    createFirstPromo: "أنشئ عرضك الأول",
    activeNow: "ساري الآن",
    scheduled: "مجدول",
    stopped: "متوقف",
    createdBy: "أنشأه",
    applyScope: "نطاق التطبيق",
    applyToAllDesc: "يطبّق على كل المنتجات",
    includedCategories: "التصنيفات المشمولة",
    excludedCategories: "التصنيفات المستثناة",
    categoriesSelected: "تصنيفات مختارة",
    categoriesExcluded: "تصنيفات مستثناة",
    noCategories: "لا توجد تصنيفات",
    scopeProduct: "منتج محدد",
    scopeCategory: "تصنيف محدد",
    scopeAll: "كل المنتجات",
    scopeAllExcept: "كل المنتجات عدا",
    scopeProductShort: "منتج",
    scopeCategoryShort: "تصنيف",
    scopeAllShort: "الكل",
    scopeAllExceptShort: "الكل عدا",

    // Pricing module
    priceManagement: "إدارة الأسعار",
    changeLog: "سجل التغييرات",
    approveAndApplyPrices: "اعتماد وتطبيق الأسعار",
    approveAndApply: "اعتماد وتطبيق",
    approvePriceChangesTitle: "اعتماد تغييرات الأسعار",
    approvePriceChangesDesc: "هل تريد اعتماد وتطبيق تغييرات الأسعار؟",
    noChangesToApprove: "لا توجد تغييرات للاعتماد",
    pricesApproved: "تم اعتماد الأسعار",
    applyPricesFailed: "فشل تطبيق الأسعار",
    belowCostTitle: "سعر أقل من التكلفة",
    belowCostDesc: "بعض الأسعار أقل من سعر التكلفة",
    belowCostWarning: "تحذير: سعر أقل من التكلفة",
    belowCostWarningDesc: "بعض الأسعار الجديدة أقل من سعر التكلفة. تأكد قبل الاعتماد.",
    confirmApplyAll: "تأكيد تطبيق الكل",
    violatingItemsCount: "{count} صنف مخالف",
    pendingChanges: "تغييرات معلّقة",
    editCellToEnable: "حرّر الخلية للتفعيل",
    cancelChanges: "إلغاء التغييرات",
    viewOnlyAdminCanEdit: "للعرض فقط — المدير وحده يمكنه التعديل",
    adminOnlyEdit: "المدير وحده يمكنه التعديل",
    editSalePricesInPricing: "تعديل أسعار البيع من شاشة الأسعار",
    openPricingScreen: "فتح شاشة الأسعار",
    estimatedProfitMargin: "هامش الربح المقدّر",
    zeroMeansRetail: "صفر = سعر التجزئة",
    zeroMeansUnspecified: "صفر = غير محدد",
    salePriceEditLocked: "تعديل سعر البيع مقفل",
    totalQty: "إجمالي الكمية",
    warehousesTotal: "إجمالي المخازن",
    distributeQtyAcrossWarehouses: "توزيع الكمية على المخازن",
    totalAcrossWarehouses: "الإجمالي عبر المخازن",
    optimalOrderQty: "الكمية المثلى لإعادة الطلب",
    defaultSupplier: "المورّد الافتراضي",
    selectDefaultSupplier: "اختر المورّد الافتراضي",
    defaultSupplierHint: "المورّد المستخدم في توليد أوامر الشراء التلقائية",
    reorderLevel: "حد إعادة الطلب",

    // Pricing module — extended
    prcPageTitle: "إدارة الأسعار والعروض",
    prcSearchAuditPlaceholder: "ابحث في السجل بالاسم/الباركود/المستخدم...",
    prcAuditReadOnlyNotice: "هذا السجل غير قابل للتعديل أو الحذف",
    prcNoMatchingLogEntries: "لا توجد سجلات مطابقة.",
    prcNewPriceCol: "السعر الجديد",
    prcAppliedToastDesc: "{applied} تغيير، {audits} سجل تدقيق.",
    prcApproveCountDesc: "سيتم اعتماد تغييرات {count} صنف. لا يمكن التراجع بعد التأكيد.",
    prcScopeCategoriesLabel: "أقسام: {names}",
    prcScopeAllExceptLabel: "كل الأصناف باستثناء: {names}",
    prcScopeAllLabel: "كل الأصناف",
    prcDiscountValueLabel: "خصم {value}",
    prcCreatedByLabel: "أنشأه: {name}",
    prcReload: "إعادة التحميل",
    prcSelectOneCategoryMin: "اختر قسماً واحداً على الأقل",
    prcSelectExcludedCategories: "اختر القسم/الأقسام المستثناة",
    prcDateRangeRequired: "حدد تاريخ البداية والنهاية",
    prcEndDateAfterStart: "تاريخ النهاية يجب أن يكون بعد البداية",
    prcBelowCostAlertToast: "تنبيه: بعض الأسعار أقل من التكلفة",
    prcBelowCostAlertToastDesc: "راجع القائمة ثم أكّد التطبيق الشامل.",
    prcNotePlaceholder: "مثال: عرض رمضان",
    prcDiscountPlaceholderPercent: "مثال: 15",
    prcDiscountPlaceholderAmount: "مثال: 0.500",
    prcPendingCountDesc: "لديك {count} تغيير معلّق",
    prcDeactivateConfirm: "إيقاف العرض على \"{label}\"؟",
    prcCtrlEnterHint: "للتأكيد بالاختصار: اضغط Ctrl + Enter",
    prcConfirmTooltip: "اضغط هنا أو استخدم Ctrl+Enter",
    prcCancelChangesCount: "إلغاء التغييرات ({count})",
    prcViewOnlyAdminCanEditBadge: "عرض فقط — تعديل الأسعار متاح للمدير",
    prcInputLockedTitle: "تعديل الأسعار متاح للمدير فقط",
    prcBack: "تراجع",
    prcApproveAndApplyNew: "اعتماد وتطبيق الأسعار الجديدة",
    prcApproveCountTitle: "اعتماد تغييرات الأسعار",
    prcBelowCostTitleFull: "تحذير: أسعار أقل من التكلفة",
    prcBelowCostDescFull: "هذه الأصناف ستُباع بأقل من تكلفتها الحقيقية. أكّد فقط إذا كان ذلك مقصوداً (عرض ترويجي مثلاً).",
    prcLoadingAuditShort: "جارٍ تحميل السجل...",
    prcLoadingPromos: "جارٍ التحميل...",
    prcCategoriesColon: "أقسام: {names}",
    prcAllItemsExceptColon: "كل الأصناف باستثناء: {names}",

    // Purchase orders module
    poSupplier: "المورّد",
    poNote: "ملاحظة أمر الشراء",
    poProducts: "منتجات أمر الشراء",
    poTotal: "إجمالي أمر الشراء",
    poCreated: "تم إنشاء أمر الشراء",
    poCreateFailed: "فشل إنشاء أمر الشراء",
    poDetailsTitle: "تفاصيل أمر الشراء",
    poDetailsDesc: "تفاصيل أمر الشراء وأصنافه",
    poStatus: "حالة أمر الشراء",
    poStatusPendingApproval: "بانتظار الاعتماد",
    poStatusApproved: "معتمد",
    poStatusPending: "معلّق",
    poStatusReceived: "مستلم",
    poStatusCancelled: "ملغى",
    poStatusRejected: "مرفوض",
    poReceived: "تم استلام أمر الشراء",
    poReceiveFailed: "فشل استلام أمر الشراء",
    poCancelled: "تم إلغاء أمر الشراء",
    poCancelFailed: "فشل إلغاء أمر الشراء",
    poDeleted: "تم حذف أمر الشراء",
    poDeleteFailed: "فشل حذف أمر الشراء",
    poApproved: "تم اعتماد أمر الشراء",
    poApproveFailed: "فشل اعتماد أمر الشراء",
    poEditedAndApproved: "تم التعديل والاعتماد",
    poRejected: "تم رفض أمر الشراء",
    poRejectFailed: "فشل رفض أمر الشراء",
    poDraftCreated: "تم إنشاء مسودة أمر الشراء",
    poDraftCreateFailed: "فشل إنشاء مسودة أمر الشراء",
    noItemsNeedReorder: "لا توجد أصناف بحاجة لإعادة الطلب",
    fetchSupplierRequiredItems: "استدعاء الأصناف المطلوبة من المورّد",
    autoPoDesc: "توليد تلقائي لأوامر شراء للأصناف التي وصلت حد إعادة الطلب",
    suggestedQtyFormula: "صيغة الكمية المقترحة",
    createDraft: "إنشاء مسودة",
    newPurchaseOrder: "أمر شراء جديد",
    newPoDesc: "إنشاء أمر شراء جديد للمورّد",
    confirmReceipt: "تأكيد الاستلام",
    confirmReceiptDesc: "هل تريد تأكيد استلام هذا الأمر؟ سيتم تحديث المخزون وأسعار التكلفة.",
    confirmPoReceipt: "تأكيد استلام أمر الشراء",
    updateCostPrices: "تحديث أسعار التكلفة",
    updateCostPricesDesc: "سيتم تحديث أسعار تكلفة المنتجات عند الاستلام",
    cancelPoTitle: "إلغاء أمر الشراء",
    cancelPoConfirm: "هل تريد إلغاء هذا الأمر؟ لا يمكن التراجع.",
    cancelOrder: "إلغاء الأمر",
    pendingManagementApproval: "بانتظار اعتماد الإدارة",
    autoPoDraftsDesc: "مسودات أوامر شراء مولّدة تلقائياً بانتظار المراجعة",
    pendingReview: "بانتظار المراجعة",
    noApprovalDrafts: "لا توجد مسودات للاعتماد",
    noApprovalDraftsDesc: "لا توجد مسودات أوامر شراء بانتظار المراجعة",
    reviewPoDraft: "مراجعة مسودة أمر الشراء",
    totalAfterEdits: "الإجمالي بعد التعديلات",
    fullReject: "رفض كامل",
    approveWithEdits: "اعتماد مع تعديلات",
    approveAsIs: "اعتماد كما هو",
    editAndAccept: "تعديل وقبول",
    approveAndAccept: "اعتماد وقبول",
    editAndApprovePo: "تعديل واعتماد أمر الشراء",
    approvePo: "اعتماد أمر الشراء",
    editAndApproveDesc: "عدّل الكميات والأسعار ثم اعتمد الأمر",
    approvePoDesc: "اعتماد أمر الشراء بالقيم الحالية",
    editAndApprove: "تعديل واعتماد",
    approve: "اعتماد",
    reject: "رفض",
    rejectPoTitle: "رفض أمر الشراء",
    rejectReason: "سبب الرفض",
    rejectReasonPlaceholder: "اكتب سبب الرفض",
    enterRejectReason: "أدخل سبب الرفض",
    confirmReject: "تأكيد الرفض",
    orderNo: "رقم الأمر",
    landedCost: "التكلفة المستلمة",
    landedCostDesc: "تكلفة الشراء + رسوم جمركية + شحن + رسوم أخرى",
    landedCostAppliedDesc: "سيتم توزيع التكلفة المستلمة على الأصناف وتحديث سعر التكلفة",
    landedCostPreviewDesc: "معاينة تأثير التكلفة المستلمة على أسعار التكلفة",
    customs: "جمارك",
    shipping: "شحن",
    otherFees: "رسوم أخرى",
    invoiceTotal2: "إجمالي الفاتورة",
    suggestedSalePrice: "سعر البيع المقترح",
    emptyMeansNoChange: "اتركه فارغاً = بدون تغيير",

    // Reports module
    repTotalRevenue: "إجمالي الإيرادات",
    repTotalCost: "إجمالي التكلفة",
    repGrossProfit: "إجمالي الربح",
    repAvgInvoice: "متوسط الفاتورة",
    repRevenueTrend: "اتجاه الإيرادات",
    repRevenueTrendDesc: "تطور الإيرادات اليومية",
    repPaymentMethods: "طرق الدفع",
    repRevenueDistribution: "توزيع الإيرادات",
    repRevenueByCategory: "الإيرادات حسب التصنيف",
    repRevenueByCategoryDesc: "توزيع الإيرادات على التصنيفات",
    repProductBreakdown: "تفصيل المنتجات",
    repProductBreakdownDesc: "الأداء حسب المنتج",
    repRevenue: "الإيرادات",
    repProfit: "الربح",
    generalReports: "التقارير العامة",
    performanceMatrix: "مصفوفة الأداء",
    matrixTitle: "مصفوفة أداء المنتجات",
    matrixLongDesc: "مصفوفة شاملة لتحليل أداء كل منتج: الإيراد، التكلفة، الربح، معدل الدوران، الهامش، والأيام الراكدة",
    reportFilters: "فلاتر التقرير",
    calculatingMatrix2: "جارٍ حساب المصفوفة...",
    noDataForPeriod2: "لا توجد بيانات لهذه الفترة",
    performanceMatrixCount: "مصفوفة {count} منتج",
    matrixClickHint: "انقر على صف للتفاصيل",
    branchWarehouse2: "فرع / مخزن",
    allSuppliers: "كل الموردين",
    matrixKpiRevenue: "الإيراد",
    matrixKpiCost: "التكلفة",
    matrixKpiProfit: "الربح",
    matrixKpiTurnover: "معدل الدوران",
    margin: "الهامش",
    stagnantDays: "أيام راكدة",
    colName: "الاسم",
    colBarcode: "الباركود",
    colCategory: "التصنيف",
    colQty: "الكمية",
    colReorderLevel: "حد إعادة الطلب",
    colCostPrice: "سعر التكلفة",
    colSalePrice: "سعر البيع",
    colProduct: "المنتج",
    colItem: "الصنف",
    colPrice: "السعر",
    colTotal: "الإجمالي",
    colSupplier: "المورّد",
    colDate: "التاريخ",
    colItemsCount: "عدد الأصناف",
    colStatus: "الحالة",
    colActions: "إجراءات",
    colBook: "الدفتري",
    colActual: "الفعلي",
    colVariance: "الفرق",
    colUser: "المستخدم",
    colType: "النوع",
    colFrom: "من",
    colTo: "إلى",
    colChange: "التغيير",
    colBy: "بواسطة",
    colNote: "ملاحظة",
    colUnit: "الوحدة",
    colOrderNo: "رقم الأمر",
    totalProducts: "إجمالي المنتجات",
    totalCategories: "إجمالي التصنيفات",
    exportPrint: "تصدير وطباعة",
    noInvoices: "لا توجد فواتير",
    noPurchaseOrders: "لا توجد أوامر شراء",
    createFirstPo: "أنشئ أول أمر شراء",

    // Reports module — extended
    repDescFull: "تقارير مبيعات شاملة بفلاتر مرنة — نطاق تاريخ، منتج، فئة، طريقة دفع، مصدر.",
    repInvoicesCount: "{count} فاتورة",
    repUnitsSoldCount: "{count} وحدة مباعة",
    repMarginPctLabel: "هامش {x}%",
    repDiscountLabel: "خصم: {x}",
    repRevenueTrendDaily: "اتجاه الإيرادات اليومي",
    repRevenueTrendDailyDesc: "الإيرادات وعدد الفواتير حسب اليوم",
    repRevenueByCategoryFullDesc: "مقارنة الإيرادات والربح عبر الفئات",
    repProductBreakdownFullDesc: "الكمية، الإيراد، التكلفة، والربح لكل منتج",
    repColQty: "كمية",
    repColRevenue: "إيراد",
    repColCost: "تكلفة",
    repColProfit: "ربح",

    // Performance matrix — extended
    matrixTitleFull: "مصفوفة أداء وربحية الأقسام والمنتجات",
    matrixLongDescFull: "تقرير هجين مجمّع على مستوى الأقسام مع توسّع لتفصيل كل صنف — يشمل الربحية، معدل الدوران، ومتوسط أيام الركود.",
    matrixStagnantDaysHint: "~{x} يوم ركود",
    matrixTableTitle: "مصفوفة الأداء ({count} قسم)",
    matrixHintFull: "اضغط على أي قسم لتوسيع تفاصيل أصنافه — الفرز فوري بضغط رأس العمود",
    matrixColCategoryItem: "القسم / الصنف",
    matrixColNetQty: "صافي الكمية",
    matrixColSales: "المبيعات",
    matrixColGrossProfit: "مجمل الربح",
    matrixColMarginPct: "الهامش %",
    matrixColStagnantDays: "أيام الركود",
    matrixGrandTotal: "الإجمالي ({count} قسم)",
    matrixNoDataForPeriod: "لا توجد بيانات للفترة المحددة",
    matrixCogsLabel: "إجمالي التكلفة (COGS)",

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

    // Spot-check module
    spcBlindItemCount: "جرد أعمى للأصناف",
    spcSpotCheckDesc: "جرد مفاجئ للأصناف الحساسة بدون كشف الرصيد الدفتري",
    spcItemToCount: "الصنف المطلوب جرده",
    spcSelectItemPlaceholder: "اختر صنفاً للجرد",
    spcBookQtyHiddenHint: "الرصيد الدفتري مخفي أثناء الجرد الأعمى",
    spcActualQtyOnShelf: "الكمية الفعلية على الرف",
    spcApproveCountAndCalcVariance: "اعتمد الجردة واحسب الفرق",
    spcBook: "الدفتري",
    spcActual: "الفعلي",
    spcShortageCheckRecords: "تحقق من سجلات النقص",
    spcSurplusCheckReceipts: "تحقق من إيصالات الزيادة",
    spcBlindCountHistory: "سجل الجردات العمياء",
    spcLastCounts: "آخر الجردات",
    spcNoCountsYet: "لا توجد جردات بعد",

    // Spot-check module — extended
    spcNotePlaceholder: "مثال: جرد مسائي مفاجئ",
    spcLastCountsCount: "آخر {count} عملية جرد",
    spcResultShortageLabel: "عجز — راجع التسجيلات",
    spcResultSurplusLabel: "زيادة — راجع الاستلامات",

    // Dashboard module
    dshTotalSales: "إجمالي المبيعات",
    dshTodaySales: "مبيعات اليوم",
    dshSinceStartOfDay: "منذ بداية اليوم",
    dshProductsCount: "عدد المنتجات",
    dshInventoryValue: "قيمة المخزون",
    dshLowStockProducts: "منتجات بمخزون منخفض",
    dshPendingPurchaseOrders: "أوامر شراء معلّقة",
    dshSalesTrend: "اتجاه المبيعات",
    dshDailySalesTrendDesc: "اتجاه المبيعات اليومية",
    dshNoSalesYet: "لا توجد مبيعات بعد",
    dshNoSalesYetDesc: "لم تسجّل أي مبيعات بعد. ابدأ بإنشاء فاتورة جديدة.",
    dshInventoryValueDistribution: "توزيع قيمة المخزون",
    dshByCategory: "حسب التصنيف",
    dshTopSelling: "الأكثر مبيعاً",
    dshByRevenue: "حسب الإيراد",
    dshInventoryAlerts: "تنبيهات المخزون",
    dshProductsNeedReorder: "منتجات بحاجة لإعادة الطلب",
    dshInventoryGood: "المخزون بحالة جيدة",
    dshNoLowStockProducts: "لا توجد منتجات بمخزون منخفض",
    dshLimit: "الحد",
    dshRecentInvoices: "أحدث الفواتير",
    dshRecentOperations: "أحدث العمليات",
    dshYouHavePendingPo: "لديك أوامر شراء معلّقة",
    dshConfirmReceiptToUpdateStock: "أكّد الاستلام لتحديث المخزون",
    dshReviewPurchases: "مراجعة المشتريات",
    dshLastXDays: "آخر {x} يوماً",
    dshDataLoadFailedDesc: "فشل تحميل بيانات لوحة التحكم. حاول مرة أخرى.",
    invoiceCountLabel: "{count} فاتورة",
    pendingPoCountLabel: "{count} أمر شراء معلّق",
    inventoryValueLabel: "قيمة المخزون: {value}",
    dshSales: "المبيعات",
    dshDailySalesTotalDesc: "إجمالي المبيعات اليومية ({symbol}) — {range}",
    dshLoadingStats: "جارٍ تحميل الإحصائيات...",
    dshDataLoadFailed: "تعذّر تحميل البيانات",
    dshNoCategories: "لا توجد فئات",
    dshNoInvoices: "لا توجد فواتير",

    // Accounting module
    accChartOfAccounts: "شجرة الحسابات",
    accExpenses: "المصروفات",
    accJournalEntries: "قيود اليومية",
    accPnl: "قائمة الدخل",
    accTrialBalance: "ميزان المراجعة",
    accAccountingLongDesc: "نظام محاسبي كامل بشجرة حسابات وقيود يومية تلقائية",
    accMainAccount: "حساب رئيسي",
    accNoAccountsYet: "لا توجد حسابات بعد",
    accAddSubaccountTitle: "إضافة حساب فرعي",
    accCodeAndNameRequired: "الرمز والاسم مطلوبان",
    accSubaccountAdded: "تمت إضافة الحساب الفرعي",
    accAccountAdded: "تمت إضافة الحساب",
    accCodeAlreadyUsed: "الرمز مستخدم مسبقاً",
    accAddFailed: "فشل الإضافة",
    accAddSubaccountUnder: "إضافة حساب فرعي تحت",
    accAddMainAccount: "إضافة حساب رئيسي",
    accEnterNewAccountData: "أدخل بيانات الحساب الجديد",
    accAccountType: "نوع الحساب",
    accTypeAsset: "أصول",
    accTypeLiability: "خصوم",
    accTypeEquity: "حقوق ملكية",
    accTypeRevenue: "إيرادات",
    accTypeExpense: "مصروفات",
    accTypeInheritedFromParent: "موروث من الحساب الأب",
    accAdd2: "إضافة",
    accFromDateOptional: "من تاريخ (اختياري)",
    accToDateOptional: "إلى تاريخ (اختياري)",
    accAllPeriods: "كل الفترات",
    accPnlExplanation: "قائمة الدخل تُحسب من الإيرادات ناقص تكلفة البضاعة المباعة ناقص المصروفات التشغيلية",
    accNetProfit: "صافي الربح",
    accForPeriod: "للفترة",
    accPnlStatement: "قائمة الدخل",
    accPnlStatementDesc: "بيان الإيرادات والمصروفات وصافي الربح",
    accTotalRevenue: "إجمالي الإيرادات",
    accCogs: "تكلفة البضاعة المباعة",
    accGrossProfit: "إجمالي الربح",
    accSalaries: "الرواتب",
    accAdminExpenses: "المصروفات الإدارية",
    accTotalOpex: "إجمالي المصروفات التشغيلية",
    accExpensesByCategory: "المصروفات حسب التصنيف",
    accJournalLedger: "دفتر الأستاذ المساعد",
    accJournalDesc: "سجل القيود المحاسبية",
    accManualEntry: "قيد يدوي",
    accLoadingJournal: "جارٍ تحميل القيود...",
    accNoJournalEntries: "لا توجد قيود",
    accNoJournalEntriesDesc: "لم تسجّل أي قيود يومية بعد",
    accSum: "المجموع",
    accBalanced: "متوازن",
    accNotBalanced: "غير متوازن",
    accTrialBalanceDesc: "ميزان المراجعة يعرض أرصدة كل الحسابات",
    accNoBalances: "لا توجد أرصدة",
    accNoBalancesDesc: "لا توجد أرصدة لعرضها",
    accCalculatingTrialBalance: "جارٍ حساب ميزان المراجعة...",
    accRecordExpense: "تسجيل مصروف",
    accUpdatesBalancesImmediately: "يحدّث الأرصدة فوراً",
    accSalary: "راتب",
    accAdminExpense: "مصروف إداري",
    accEmployeeName: "اسم الموظف",
    accEmployeeNameRequired: "اسم الموظف مطلوب",
    accEmployeeNamePlaceholder: "اكتب اسم الموظف",
    accAmount: "المبلغ",
    accPaymentDate: "تاريخ الدفع",
    accExpenseTitle: "عنوان المصروف",
    accExpenseTitleRequired: "عنوان المصروف مطلوب",
    accExpenseTitlePlaceholder: "اكتب عنوان المصروف",
    accPaymentAccount: "حساب الدفع",
    accSelectPaymentAccount: "اختر حساب الدفع",
    accExpenseAccountUndefined: "حساب المصروف غير محدد",
    accTotalAmount: "المبلغ الإجمالي",
    accRecordSalary: "تسجيل راتب",
    accCannotDeleteWhileSaving: "لا يمكن الحذف أثناء الحفظ",
    accExpenseDeletedReversed: "تم حذف المصروف وعكس القيد",
    accExpensesHistory: "سجل المصروفات",
    accNoExpensesRecorded: "لم تسجّل أي مصروفات",
    accPaidVia: "مدفوع عبر",
    accEnterValidAmount: "أدخل مبلغاً صحيحاً",
    accSalaryRecorded: "تم تسجيل الراتب",
    accExpenseRecorded: "تم تسجيل المصروف",
    accJournalTypeSale: "قيد بيع",
    accJournalTypeExpense: "قيد مصروف",
    accJournalTypePurchase: "قيد شراء",
    accJournalTypeManual: "قيد يدوي",
    accAccount: "حساب",
    accCode: "الرمز",
    accAccountName: "اسم الحساب",
    accDebit: "مدين",
    accCredit: "دائن",
    accPageTitle: "المحاسبة والمصروفات",
    accPageDesc: "شجرة الحسابات، القيود المحاسبية المزدوجة، الرواتب والمصروفات، والتقارير المالية.",
    accSalariesAdminHint: "رواتب ومصروفات إدارية",
    accJournalDoubleHint: "دفتر اليومية المزدوج",
    accPnlHint: "قائمة P&L",
    accAccountBalances: "أرصدة الحسابات",
    accChartOfAccountsDesc: "هيكل الحسابات الهرمي مع الأرصدة الحية",
    accPnlExplanationFull: "تُجلب الإيرادات من جميع المبيعات (بما فيها أوامر شوبيفاي المُستوردة)، وتُخصم تكلفة البضاعة المباعة والرواتب والمصروفات الإدارية.",
    accPeriodStart: "البداية",
    accPeriodEnd: "اليوم",
    accPnlBreakdown: "تفصيل الإيرادات والمصروفات",
    accPnlStatementFull: "قائمة الأرباح والخسائر",
    accTotalRevenueFull: "إجمالي الإيرادات (مبيعات + شوبيفاي)",
    accCogsFull: "تكلفة البضاعة المباعة (COGS)",
    accExpenseBreakdownTitle: "تفصيل المصروفات حسب الفئة",
    accUpdatesBalancesImmediately2: "يُحدّث أرصدة الحسابات فوراً عند الحفظ",
    accExpenseTitlePlaceholder2: "مثال: إيجار المحل",
    accPaidLabel: "دفع",
    accCatRent: "إيجار",
    accCatUtilities: "مرافق",
    accCatSubscriptions: "اشتراكات",
    accCatMarketing: "تسويق",
    accCatOther: "أخرى",
    accJournalLedgerFull: "دفتر اليومية (القيود المحاسبية)",
    accJournalDescFull: "قيود مزدوجة (مدين = دائن) — تُولّد تلقائياً عند البيع/المصروف/الاستلام، أو يدوياً",
    accJournalSourceSale: "مبيعات",
    accJournalSourceExpense: "مصروف",
    accJournalSourcePurchase: "مشتريات",
    accJournalSourceManual: "يدوي",
    accTrialBalanceDescFull: "أرصدة جميع الحسابات (مدين / دائن)",
    accManualEntryTitle: "قيد محاسبي يدوي",
    accManualEntryDesc: "أدخل قيداً مزدوجاً متوازناً (مدين = دائن)",
    accDescription: "الوصف",
    accDescriptionPlaceholder: "مثال: تسوية رصيد",
    accDescriptionRequired: "الوصف مطلوب",
    accJournalLines: "سطور القيد",
    accSelectAccount: "اختر الحساب",
    accSaveJournal: "حفظ القيد",
    accAtLeastTwoLines: "أضف سطرين على الأقل",
    accJournalCreated: "تم إنشاء القيد المحاسبي",
    accJournalCreateFailed: "فشل إنشاء القيد",
    subNavSearch: "ابحث في القائمة...",
    accJournalEntryDetail: "تفاصيل القيد المحاسبي",
    accJournalEntryNo: "رقم القيد",
    accJournalSourceType: "نوع المصدر",
    accJournalCreatedAt: "تاريخ الإنشاء",
    accJournalCreatedBy: "أنشأه",
    accPrintJournal: "طباعة القيد",
    accExportPdf: "تصدير PDF",
    accJournalLinesCount: "عدد البنود",
    accSearchJournal: "ابحث برقم القيد أو الوصف...",

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

    // Analytics module
    anlAnalyticsCards: "بطاقات التحليلات",
    anlOverview: "نظرة عامة",
    anlSalesByDay: "المبيعات حسب اليوم",
    anlTopProducts: "أفضل المنتجات",
    anlPaymentMethods: "طرق الدفع",
    anlCategorySales: "مبيعات التصنيفات",
    anlLowStockAnalysis: "تحليل المخزون المنخفض",
    anlNoData: "لا توجد بيانات",
    anlCalculating: "جارٍ حساب التحليلات...",
    anlComprehensiveSummary: "ملخص شامل",
    anlStagnantItems: "الأصناف الراكدة",
    anlUnitsSold: "وحدة مباعة",
    anlItemNeverSold: "صنف لم يُبع",
    anlCost: "التكلفة",
    anlItemAnalyzed: "صنف مُحلّل",
    anlProfitability: "الربحية",
    anlProfitableItem: "صنف رابح",
    anlTotalQtySold: "إجمالي الكمية المباعة",
    anlUnit: "وحدة",
    anlTotalRevenue: "إجمالي الإيراد",
    anlInPeriod: "في الفترة",
    anlStagnantItemsCount: "أصناف راكدة",
    anlValuePrefix: "قيمة",
    anlAvgMargin: "متوسط هامش الربح",
    anlAcrossItems: "عبر الأصناف",
    anlTop6Items: "أعلى ٦ أصناف مبيعاً",
    anlProfitabilityDistribution: "توزيع الربحية",
    anlDetailedReports: "تقارير مفصّلة",
    anlDetailedReportsDesc: "انتقل لتقرير محدد لعرض كل التفاصيل والرسوم",
    anlNeverSoldCount: "{count} لم تُبع",
    anlTopItem: "أعلى صنف مبيعاً",
    anlRankByQty: "ترتيب الأصناف حسب الكمية",
    anlNoSales: "لا توجد مبيعات",
    anlTryWiderRange: "جرّب نطاقاً زمنياً أوسع.",
    anlNeverSoldItems: "أصناف لم تُبع",
    anlTotalStagnantItems: "إجمالي الأصناف الراكدة",
    anlStagnantValue: "قيمة المخزون الراكد",
    anlStagnantDesc: "مرتبة حسب أدنى دوران — قد تحتاج تخفيضات أو تصفية",
    anlNoStagnantItems: "لا توجد أصناف راكدة",
    anlAllSellingWell: "كل الأصناف تبيع جيداً.",
    anlSold: "المبيع",
    anlTurnoverRatio: "نسبة الدوران",
    anlStagnantValueCol: "القيمة الراكدة",
    anlNeverSold: "لم يُبع",
    anlSlow: "بطيء",
    anlHighestCost: "أعلى تكلفة",
    anlLowestCost: "أقل تكلفة",
    anlAvgCost: "متوسط التكلفة",
    anlMostExpensive: "الأكثر تكلفة",
    anlCheapest: "الأقل تكلفة",
    anlHighestProfitability: "أعلى ربحية",
    anlProfitableItems: "أصناف رابحة",
    anlProfitMargin: "هامش الربح",
    anlMarginPct: "الهامش %",
    anlBreakdownByItem: "تفصيل {metric} حسب الصنف",

    // Settings module
    setActiveCountry: "تعيين الدولة الفعّالة",
    setCountry: "الدولة",
    setCurrency: "العملة",
    setTaxRate: "نسبة الضريبة",
    setUnits: "وحدات القياس",
    setCategories: "التصنيفات",
    setAddUnit: "إضافة وحدة",
    setUnitName: "اسم الوحدة",
    setUnitNamePlaceholder: "مثال: كيلوغرام",
    setUnitAdded: "تمت إضافة الوحدة",
    setUnitDeleted: "تم حذف الوحدة",
    setUnitExists: "الوحدة موجودة مسبقاً",
    setAddCategory: "إضافة تصنيف",
    setCategoryName: "اسم التصنيف",
    setCategoryCode: "رمز التصنيف",
    setCategoryCodePlaceholder: "مثال: FOOD",
    setCategoryAdded: "تمت إضافة التصنيف",
    setCategoryUpdated: "تم تحديث التصنيف",
    setCategoryDeleted: "تم حذف التصنيف",
    setCategoryInUse: "لا يمكن حذف تصنيف مستخدم بمنتجات",
    setNoUnits: "لا توجد وحدات قياس",
    setNoCategories: "لا توجد تصنيفات",
    setEditCategory: "تعديل التصنيف",
    setCategoryNameRequired: "اسم التصنيف مطلوب",
    setPageDesc: "إدارة الدولة والعملة والوحدات والتصنيفات.",
    setCurrentCountryLabel: "الدولة الحالية",
    setLocaleCode: "رمز اللغة",
    setCountryAndCurrency: "الدولة والعملة",
    setCountryPickerDesc: "اختر الدولة لتحديث العملة والضريبة تلقائياً",
    setSaveCountry: "حفظ الدولة",

    // Company / Store info (for invoices)
    companyInfoTitle: "بيانات الشركة للمستندات",
    companyInfoDesc: "تظهر هذه البيانات في ترويسة الفواتير والإيصالات المطبوعة",
    companyInfoName: "اسم الشركة / المتجر",
    companyInfoNamePlaceholder: "مثال: متجر العطور الفاخرة",
    companyInfoAddress: "العنوان",
    companyInfoAddressPlaceholder: "المدينة - الحي - الشارع",
    companyInfoPhone: "الهاتف",
    companyInfoPhonePlaceholder: "+965 XXXXXXXX",
    companyInfoVatNo: "الرقم الضريبي",
    companyInfoVatNoPlaceholder: "إن وجد",
    companyInfoLogo: "شعار الشركة",
    companyInfoLogoHint: "يظهر بجانب اسم الشركة في الفاتورة",
    companyInfoSave: "حفظ البيانات",
    companyInfoSaved: "تم حفظ بيانات الشركة",
    companyInfoPreview: "معاينة الفاتورة",
    setNoCountryChange: "لم تقم بتغيير الدولة",
    setCountryUpdated: "تم تحديث الدولة",
    setCountryUpdatedDesc: "أعد تحميل الصفحة لتحديث كل التنسيقات.",
    setUnitsDesc: "وحدات القياس المتاحة عند إضافة المنتجات",
    setAddUnitPlaceholder: "أضف وحدة جديدة (مثال: علبة)",
    setNoResults: "لا توجد نتائج",
    setUnitDeletedToast: "تم حذف وحدة «{name}»",
    setCategoriesDesc: "فئات المنتجات المتاحة في المخازن. الرمز القصير يُستخدم لتوليد الباركود تلقائياً.",
    setCodePlaceholder: "الرمز (مثال: 03)",
    setCodeTitle: "رمز قصير (حتى 4 أحرف) يُستخدم كبادئة للباركود",
    setAddCategoryPlaceholder: "أضف تصنيف جديد (مثال: إلكترونيات)",
    setSearchCategoriesPlaceholder: "بحث في التصنيفات...",
    setCategoryCodeExists: "رمز التصنيف مستخدم مسبقاً",
    setCategoryDeletedToast: "تم حذف تصنيف «{name}»",
    setCategoryInUseDesc: "لا يزال مرتبطاً بمنتجات.",
    setEditCategoryDesc: "عدّل اسم التصنيف ورمزه القصير المستخدم لتوليد الباركود.",
    setCodeLabel: "الرمز (حتى 4 أحرف)",

    // Integrations module
    intShopify: "شوبيفاي",
    intShopifyDesc: "ربط متجرك مع شوبيفاي لمزامنة المنتجات والطلبات",
    intConnect: "ربط",
    intDisconnect: "قطع الربط",
    intSync: "مزامنة",
    intSyncing: "جارٍ المزامنة...",
    intSynced: "تمت المزامنة",
    intSyncFailed: "فشلت المزامنة",
    intNotConnected: "غير مربوط",
    intSetupGuide: "دليل الإعداد",
    intStoreDomain: "نطاق المتجر",
    intAccessToken: "رمز الوصول (Access Token)",
    intSave: "حفظ",
    intTestConnection: "اختبار الاتصال",
    intConnectionOk: "الاتصال ناجح",
    intConnectionFailed: "فشل الاتصال",
    intImportProducts: "استيراد المنتجات",
    intImportOrders: "استيراد الطلبات",
    intProductsImported: "تم استيراد المنتجات",
    intOrdersImported: "تم استيراد الطلبات",
    intImportFailed2: "فشل الاستيراد",
    intPageDesc: "اربط النظام بمتجرك الإلكتروني على شوبيفاي لمزامنة المنتجات واستيراد الطلبات.",
    intConnected: "متصل",
    intConnectedTo: "متصل بـ {domain}",
    intRefreshStatus: "تحديث الحالة",
    intSyncProducts: "مزامنة المنتجات",
    intSyncProductsDesc: "جلب المنتجات من شوبيفاي وإضافتها أو تحديثها في المخزون. المطابقة بالباركود/SKU أو الاسم.",
    intSyncNow: "مزامنة الآن",
    intImportOrdersDesc: "جلب آخر ٥٠ طلب من شوبيفاي وإنشائها كفواتير مبيعات. تُتجاوز الطلبات المُستوردة سابقاً.",
    intImporting: "جارٍ الاستيراد...",
    intImportNow: "استيراد الآن",
    intFetched: "جُلب",
    intCreated: "أُنشئ",
    intUpdated: "حُدّث",
    intImported2: "أُستورد",
    intSkipped: "تخطّي",
    intNotes: "ملاحظات:",
    intEnvHint: "لتحديث بيانات الاعتماد أو المفتاح، عدّل ملف .env ثم أعد تشغيل الخادم.",
    intStep1Title: "افتح إعدادات شوبيفاي",
    intStep1Desc: "من لوحة تحكم شوبيفاي، اذهب إلى: Apps ← Develop apps.",
    intStep1Link: "فتح صفحة التطبيقات",
    intStep2Title: "أنشئ تطبيقاً مخصصاً",
    intStep2Desc: "اضغط Create an app، أعطه اسماً، ثم من Configuration أضف الصلاحيات التالية: read_products، read_orders.",
    intStep3Title: "ثبّت التطبيق واحصل على المفتاح",
    intStep3Desc: "اضغط Install app، ثم انسخ Admin API access token (يبدأ بشك معيّن ويظهر مرة واحدة فقط).",
    intStep4Title: "أضف البيانات إلى ملف .env",
    intStep4Desc: "في جذر المشروع، املأ المتغيرين التاليين ثم أعد تشغيل الخادم.",
    intSetupIntro: "التكامل مع شوبيفاي اختياري. عند تفعيله تستطيع مزامنة منتجات متجرك الإلكتروني مع مخزونك، واستيراد الطلبات تلقائياً كفواتير مبيعات.",
    intSetupFinalNote: "بعد تعبئة المتغيرات، أعد تشغيل الخادم ثم أعد تحميل هذه الصفحة.",

    // Login module (extended)
    logInvalidCredentials: "بيانات الدخول غير صحيحة",
    logCheckEmailPassword: "تحقق من البريد الإلكتروني وكلمة المرور",
    logLoginSuccess: "تم تسجيل الدخول بنجاح",
    logWelcomeDesc: "مرحباً بك في نظام إدارة المتجر",
    logUnexpectedError: "حدث خطأ غير متوقع",
    logLoginHeroTitle: "نظام إدارة شامل لمتجرك",
    logLoginHeroDesc: "المبيعات والمخازن والمشتريات والمحاسبة في منصة واحدة",
    logFeature1: "نقاط بيع سريعة مع تعليق الفواتير",
    logFeature2: "إدارة مخزون متعدد المخازن وأوامر شراء تلقائية",
    logFeature3: "محاسبة كاملة بشجرة حسابات وقيود تلقائية",
    logCopyright: "جميع الحقوق محفوظة",
    logDemo: "تجريبي",
    logTapToFill: "انقر للتعبئة",
    logAppName: "نظام المتجر",
    logAppTaglineShort: "ERP للمتاجر الصغيرة",

    // App-shell
    appFooterDesc: "نظام إدارة المبيعات والمخازن والمشتريات",
    appMadeWith: "صُنع بكل حب",
    appForSmallProjects: "للمشاريع الصغيرة",

    // ── Sales module (POS + invoices + exchange + refund + confirm dialog) ──
    // Page header / generic
    posTitle: "نقاط البيع (POS)",
    posDesc: "أنشئ فاتورة مبيعات جديدة — ابحث عن المنتجات وأضفها للسلة، احسب الإجمالي والضريبة والخصم تلقائياً.",
    invoicesDescFull: "سجل فواتير المبيعات — تصفّح، اطبع، وأدِر المرتجعات.",
    newInvoice: "فاتورة جديدة",
    searchInvoiceOrCustomer: "ابحث برقم الفاتورة أو اسم العميل...",
    selectInvoiceHint: "اختر فاتورة من القائمة لعرض تفاصيلها",
    salesInvoice: "فاتورة مبيعات",
    phoneAuto: "هاتف (بحث تلقائي)",
    customerFoundPrefix: "عميل موجود:",
    newCustomerAutoInline: "عميل جديد — يُسجّل تلقائياً",
    tierLabel: "تصنيف السعر:",
    cartPageLabel: "{x} / {y} — {count} صنف",
    posCheckoutWithTotal: "إتمام البيع — {total}",

    // POS toasts / confirmations
    posItemUnavailable: "عذراً، الصنف غير متوفر بالمخزن",
    posItemUnavailableDesc: "{name} — الكمية الحالية: {qty}",
    posQtyUnavailableDesc: "المتاح من {name}: {qty} {unit}",
    posResumeSuccessDesc: "{count} صنف، الإجمالي {total}",
    posInvoiceParkedDesc: "رقم التعليق: {holdNo}",
    posDeleteParkedConfirm: "حذف الفاتورة المعلّقة {holdNo}؟",
    posParkedDeletedToast: "حُذفت الفاتورة {holdNo}",
    posResumeCartReplaceConfirm: "السلة الحالية غير فارغة. سيتم استبدالها بمحتويات الفاتورة المعلّقة. متابعة؟",
    posStockInsufficientDesc: "الرصيد المتاح من {name} لا يكفي. تم تحديث الكميات.",
    posResumeFailedToast: "تعذّر استرجاع الفاتورة المعلّقة",
    posParkEmptyToast: "السلة فارغة — لا شيء لتعليقه",

    // Express POS mode (simplified cashier view)
    expressMode: "الوضع السريع",
    standardMode: "الوضع العادي",
    expressBarcodePlaceholder: "امسح الباركود أو ابحث...",
    expressCash: "نقدي",
    expressCard: "بطاقة",
    expressMoreOptions: "خيارات أكثر",
    expressClearCart: "تفريغ السلة",
    expressClearCartConfirm: "هل تريد تفريغ السلة؟ سيتم حذف جميع الأصناف.",
    expressCartTitle: "السلة",
    expressCheckoutCash: "نقدي",
    expressCheckoutCard: "بطاقة",
    expressNoProducts: "لا توجد منتجات",
    expressLowStock: "مخزون منخفض",
    expressUnitPrice: "سعر الوحدة",
    expressCustomerPhone: "هاتف العميل",
    expressCustomerName: "اسم العميل",
    expressDiscount: "خصم",
    expressAddress: "العنوان",
    posPhoneRequired: "رقم الهاتف مطلوب",
    posAddressRequired: "العنوان مطلوب للتوصيل",
    expressTaxRate: "نسبة الضريبة %",
    expressDelivery: "طلب توصيل",
    expressDriverName: "اسم السائق",
    expressDeliveryFee: "رسوم التوصيل",
    expressItemsInCart: "{count} صنف في السلة",
    expressLogout: "خروج",
    expressBarcodeHint: "Enter: إضافة بالباركود • F2 أو Ctrl+Enter: إتمام • Esc: تفريغ",

    // Receipt dialog
    receiptItemsHeader: "الصنف",
    receiptQtyHeader: "كمية",
    receiptTotalHeader: "إجمالي",
    receiptPaymentMethod: "طريقة الدفع:",
    receiptViewSummary: "عرض ملخص الفاتورة المُنشأة حديثاً.",

    // Invoices view
    invoicesRefundFullBadge: "مرتجع كامل",
    invoicesRefundPartialBadge: "مرتجع جزئي",
    invoicesRefundedFullyBadge: "مرتجعة بالكامل",
    invoicesRefundedPartialWithAmount: "مرتجع جزئي — {amount}",
    invoicesAdditionalRefund: "مرتجع إضافي",
    invoicesRefundInvoiceAction: "مرتجع الفاتورة",
    invoicesRefundedFullTotalDesc: "مرتجعة بالكامل — إجمالي المرتجع {total}",
    invoicesRefundedPartialDesc: "مرتجع جزئي سابق: {amount} — يمكن إرجاع المتبقي",
    invoicesPageLabel: "صفحة {x} من {y} ({total} فاتورة)",
    invoicesCountLabel: "{total} فاتورة",

    // Refund dialog
    refundSearchPlaceholder: "امسح باركود الصنف أو اكتب اسمه للبحث السريع...",
    refundItemSelected: "تم تحديد: {name}",
    refundItemNotFound: "لم يتم العثور على الصنف",
    refundSelectAtLeastOne: "حدد كمية مرتجعة لصنف واحد على الأقل",
    refundApprovedToast: "تم اعتماد المرتجع",
    refundApprovedToastDesc: "إشعار دائن: {creditNoteNo} — {total}",
    refund14DaysExceededToast: "تجاوز ١٤ يوماً",
    refund14DaysExceededDesc: "فعّل خيار تجاوز شرط الـ١٤ يوماً (للمدير فقط)",
    refundFailedToast: "فشل المرتجع",
    refundDialogTitle: "مرتجع فاتورة {invoiceNo}",
    refundPartialDialogDesc: "حدد الكميات المرتجعة لكل صنف. يتم إنشاء إشعار دائن تلقائياً.",
    refundSuccessTitle: "تم اعتماد المرتجع بنجاح",
    refundReturnsLabel: "مردودات",
    refundTaxLabel: "ضريبة",
    refundTotalLabel: "إجمالي المرتجع",
    refund14DaysWarning: "هذه الفاتورة تجاوزت {maxDays} يوماً (مرّت {daysSince} يوماً)",
    refund14DaysWarningDesc: "المرتجع محظور بعد ١٤ يوماً. المدير فقط يمكنه تجاوز هذا الشرط.",
    refundOverrideAdminLabel: "تجاوز شرط الـ١٤ يوماً (صلاحية مدير)",
    refundOriginalLabel: "الأصلي:",
    refundReturnedLabel: "المرتجع:",
    refundAvailableLabel: "المتاح:",
    refundLineValueLabel: "قيمة المرتجع:",
    refundReturnsTotalLabel: "إجمالي المردودات",
    refundTaxWithRateLabel: "ضريبة ({rate}%)",
    refundApproveBtn: "اعتماد المرتجع",
    refundUnitSuffix: "وحدة",

    // Exchange view
    excDesc: "تبديل الأصناف بناءً على فاتورة أصلية — استدعِ الفاتورة، امسح باركود المرتجع، ثم اختر الأصناف الجديدة.",
    excNewExchangeBtn: "تبديل جديد",
    excInvoiceExample: "اكتب أو امسح رقم الفاتورة (مثال: INV-00021)...",
    excInvoiceNotFoundShort: "الفاتورة غير موجودة — تأكد من رقم الفاتورة وحاول مجدداً.",
    excInvoiceEligibleLabel: "صالحة للتبديل · {days} يوم",
    excInvoiceExpiredLabel: "انقضت {days} يوماً",
    excInvoiceDatePrefix: "تاريخ الفاتورة:",
    excOriginalItemsHint: "الكمية القابلة للإرجاع موضحة لكل صنف",
    excReturnsByScanTitle: "المرتجع — بالمسح",
    excNewItemsTitle: "الجديد",
    excScanReturnPlaceholder2: "امسح باركود الصنف المرجع (أو اكتب الاسم)...",
    excScanToAddHint: "امسح باركود الصنف لإضافته للمرتجع",
    excNoNewItems: "لا توجد أصناف جديدة — ابحث لإضافة صنف",
    excPricePrefix: "السعر:",
    excRemainingAfterReturnPrefix: "متبقٍ بعد الإرجاع:",
    excSettlementMethodLabel: "طريقة تسوية الفرق",
    excNotePlaceholder: "سبب التبديل أو ملاحظة إدارية...",
    excNetEvenLabel: "متعادل",
    excApproveExchangeBtn: "اعتماد التبديل — {count} صنف",
    excExchangeSuccessDesc: "عرض ملخص فاتورة التبديل المُنشأة حديثاً.",
    excCustomerPrefix: "العميل:",
    excSettlementPrefix: "طريقة التسوية:",
    excConfirmDesc: "راجع تفاصيل التبديل قبل الاعتماد — لا يمكن التراجع بعد التأكيد.",
    excReturnExceedsRemainingMsg: "عذراً، الكمية المطلوب إرجاعها تتجاوز الكمية المتبقية في الفاتورة!",
    excAddItemsFirst: "أضف أصنافاً للمرتجع أو الجديد أولاً",
    excOriginalInvoiceRequiredDesc: "يجب استدعاء فاتورة أصلية قبل الاعتماد.",
    excCtrlEnterConfirmHint: "للاعتماد بالاختصار: اضغط",
    excSearchNewItemsPlaceholder: "ابحث بالاسم أو الباركود لإضافة صنف جديد...",

    // Sale confirm dialog
    saleConfirmDialogTitle: "تأكيد إتمام عملية البيع",
    saleConfirmDialogDesc: "راجع تفاصيل الفاتورة قبل الاعتماد — لا يمكن التراجع بعد التأكيد.",
    saleConfirmPaymentMethod: "طريقة السداد",
    saleConfirmGrandTotalLabel: "إجمالي المبلغ المستحق",
    saleConfirmCancelBtn: "تراجع",
    saleConfirmConfirmBtn: "نعم، إتمام",
    saleConfirmCtrlEnterHint: "للإتمام بالاختصار: اضغط",
    saleConfirmOrCtrlEnter: "اضغط هنا أو استخدم Ctrl+Enter",

    // ── Inventory module — page header & misc ──
    invManageTitle: "إدارة المخازن",
    invManageDesc: "عرض المنتجات وإدارتها، البحث والفلترة، ومتابعة كميات المخزون.",
    invItemsTab: "الأصناف",
    printBarcode: "طباعة باركود",
    openingPrintWindow: "جارٍ فتح نافذة الطباعة",
    barcodeLabelsCount: "{count} ملصق باركود",
    noLowStockProducts: "لا توجد منتجات قريبة من النفاذ",
    noLowStockDesc: "جميع المنتجات ضمن الحدود الآمنة.",
    addFirstProduct: "ابدأ بإضافة منتجك الأول إلى المخزون.",
    productsCountLabel: "إجمالي {count} منتج",
    deleteProductPermanent: "سيتم حذف المنتج «{name}» نهائياً. لا يمكن التراجع عن هذه العملية.",

    // Product form dialog
    editProductDesc: "عدّل بيانات المنتج ثم احفظ التغييرات.",
    addProductDesc: "أدخل بيانات المنتج الجديد لإضافته إلى المخزون.",
    productNamePlaceholder: "مثال: أرز بسمتي 5كجم",
    barcodePlaceholder: "6281000...",
    autoGenerateBarcodeTitle: "توليد الباركود تلقائياً من رمز القسم",
    selectCategoryForAutoHint: "اختر القسم أولاً لتفعيل التوليد التلقائي.",
    unitNotInList: "«{unit}» غير موجودة في قائمة الوحدات — أضفها من الإعدادات",
    totalQtyLabel: "الكمية الإجمالية",
    warehouseStockSum: "مجموع المخازن: {total}",
    optimalOrderQtyHint: "(0 = غير محدد)",
    salePriceEditLockedTitle: "تعديل أسعار البيع متاح من شاشة إدارة الأسعار",
    addProductButton: "إضافة المنتج",

    // Warehouse manager
    warehouseManagerDesc: "إدارة مخازن متعددة — كل مخزن له كود وموقع وكمياته الخاصة.",
    noWarehousesDesc: "أضف مخزناً أول لتنظيم الأصناف.",
    warehouseInactive: "غير مفعّل",
    warehouseUnitsCount: "{count} وحدة",
    deleteWarehouseConfirmLong: "سيتم حذف المخزن «{name}».",

    // Warehouse form dialog
    editWarehouseDesc: "عدّل بيانات المخزن.",
    addWarehouseDesc: "أضف مخزناً جديداً لإدارة أصناف متعددة.",
    warehouseNameInputPlaceholder: "مثال: المخزن الرئيسي",
    warehouseCodePlaceholder: "WH-01",
    warehouseLocationInputPlaceholder: "المقر الرئيسي",

    // Purchases view
    purchasesTitleLong: "المشتريات وأوامر الشراء",
    purchasesDescLong: "إنشاء أوامر شراء لتزويد المخزن وتأكيد الاستلام لتحديث الكميات تلقائياً.",
    allStatuses: "كل الحالات",
    noPurchaseOrdersDesc: "أنشئ أول أمر شراء لتزويد المخزن بالمنتجات.",
    poDetailsDescLong: "عرض أصناف أمر الشراء والإجمالي.",
    landedCostSectionTitle: "المصاريف الإضافية (تكلفة الوصول)",
    landedCostAppliedLong: "تم تحديث أسعار التكلفة بناءً على هذه المصاريف — موزّعة على الأصناف بنسبة قيمتها وفق طريقة المتوسط المرجح.",
    landedCostPreviewLongDetail: "ستُوزَّع هذه المصاريف على الأصناف بنسبة قيمتها عند الاستلام، ويتم تحديث أسعار التكلفة وفق طريقة المتوسط المرجح.",
    autoDraftDialogTitle: "استدعاء الأصناف المطلوبة للمورّد",
    autoDraftDialogDesc: "ينشئ مسودة طلب شراء تلقائية لكل أصناف المورّد الموجودة عند أو تحت حد إعادة الطلب، بانتظار موافقة الإدارة قبل الإرسال.",
    suggestedQtyFormulaLong: "الكمية المقترحة لكل صنف = الكمية المثالية لإعادة الطلب إن وُجدت، وإلا فـ (حد إعادة الطلب × 2 − الكمية الحالية). سعر الوحدة = سعر التكلفة الحالي للصنف.",
    createDraftButton: "إنشاء المسودة",
    noItemsNeedReorderForSupplier: "لا توجد أصناف بحاجة لإعادة طلب لهذا المورّد",
    noItemsNeedReorderForSupplierDesc: "كل أصناف هذا المورّد أعلى من حد إعادة الطلب.",
    poDraftPendingApprovalDesc: "برقم {poLabel} — بانتظار موافقة الإدارة.",
    poReceivedWithStockDesc: "أُضيفت الكميات إلى المنتجات تلقائياً.",
    poReceiveFailedShort: "فشل تأكيد الاستلام",
    poCancelFailedShort: "فشل الإلغاء",
    poDeleteFailedShort: "فشل الحذف",
    confirmReceiptDescLong: "سيتم تحويل الأمر إلى «مستلم» وإضافة الكميات إلى المخزون. لا يمكن التراجع عن هذه العملية.",
    updateCostPricesTitle: "تحديث أسعار التكلفة",
    updateCostPricesConfirmDesc: "سيقوم اعتماد الفاتورة بتحديث أسعار التكلفة للأصناف في كارت الصنف بناءً على مصاريف الجمارك والشحن المضافة (طريقة المتوسط المرجح).",
    proceedQuestion: "هل تريد المتابعة؟",
    cancelPoConfirmLong: "سيتم إلغاء أمر الشراء من «{supplier}».",

    // Purchase order dialog
    newPoDescLong: "أنشئ أمر شراء لتزويد المخزن بالمنتجات. لن تتأثر الكميات حتى تأكيد الاستلام.",
    createOrder: "إنشاء الأمر",
    suggestedSalePriceHint: "سعر البيع المقترح ({symbol}) — اختياري",
    emptyMeansNoChangeInput: "اتركه فارغاً = لا تغيير",
    landedCostPreviewLong: "تُوزَّع هذه المصاريف على الأصناف عند الاستلام بنسبة قيمة كل صنف، وتُحدَّث أسعار التكلفة وفق طريقة المتوسط المرجح.",
    additionalFeesShort: "المصاريف الإضافية",
    grandTotalLong: "إجمالي أمر الشراء",

    // PO approval panel
    pendingReviewCount: "{count} قيد المراجعة",
    autoPoDraftsDescLong: "مسودات أوامر الشراء التلقائية — راجع الأصناف ثم اعتمد أو ارفض.",
    noApprovalDraftsDescLong: "عند إنشاء مسودة طلب شراء تلقائية ستظهر هنا للمراجعة.",
    reviewPoDraftTitle: "مراجعة مسودة أمر الشراء",
    editAndApprovePoTitle: "تعديل واعتماد أمر الشراء",
    approvePoTitle: "اعتماد أمر الشراء",
    editAndApproveDescLong: "سيتم تطبيق تعديلاتك على الأصناف ثم اعتماد أمر الشراء.",
    approvePoDescLong: "سيتم اعتماد أمر الشراء كما هو (بدون تعديلات).",
    afterApprovalReadyDesc: "بعد الاعتماد يصبح الأمر جاهزاً للاستلام من المورّد.",
    editAndApproveButton: "تعديل واعتماد",
    approveButton: "اعتماد",
    rejectPoTitleShort: "رفض أمر الشراء",
    rejectReasonPlaceholderLong: "اكتب سبب الرفض (إلزامي)…",
    rejectReasonRequired: "أدخل سبب الرفض",
    confirmRejectButton: "تأكيد الرفض",
    approveWithEditsTooltip: "اعتماد مع تطبيق التعديلات",
    approveAsIsTooltip: "اعتماد كما هو (لم تُطبَّق تعديلات)",

    // Suppliers view
    suppliersDescLong: "قائمة الموردين وبيانات الاتصال بهم.",
    suppliersLoadFailedShort: "تعذّر تحميل الموردين",
    noSuppliers: "لا يوجد مورّدون",
    noSuppliersDesc: "ابدأ بإضافة أول مورّد لإدارة المشتريات.",
    noContactData: "لا توجد بيانات اتصال",
    ordersCountLabel: "{count} أمر شراء",
    deleteSupplierConfirmLong: "سيتم حذف المورّد «{name}».",
    cannotDeleteLinkedSupplier: "لا يمكن حذف مورّد مرتبط بمنتجات أو أوامر شراء",

    // Supplier form dialog
    editSupplierDesc: "عدّل بيانات المورّد.",
    addSupplierDesc: "أدخل بيانات المورّد الجديد.",
    supplierNameInputPlaceholder: "مثال: شركة الوطنية للأغذية",
    contactPersonPlaceholder: "الاسم",
    phoneInputPlaceholder: "05xxxxxxxx",
    emailInputPlaceholder: "info@supplier.sa",
    addressInputPlaceholder: "المدينة - الحي",

    // Purchase invoices / GRN
    navPurchaseInvoices: "فواتير المشتريات",
    navSupplierPayments: "مدفوعات الموردين",
    supplierPaymentsTitle: "مدفوعات الموردين",
    supplierPaymentsDesc: "تسجيل المدفوعات للموردين وتحديث الأرصدة المحاسبية تلقائيًا",
    newSupplierPayment: "سداد جديد",
    paySupplier: "سداد",
    supplierBalance: "الرصيد المستحق",
    amountPaid: "المبلغ المدفوع",
    paymentDateLabel: "تاريخ السداد",
    paymentNoLabel: "رقم السداد",
    referenceNo: "الرقم المرجعي",
    paymentMethodCash: "نقدية",
    paymentMethodBank: "تحويل بنكي",
    paymentMethodCheck: "شيك",
    noSupplierPayments: "لا توجد سدادات مسجلة بعد",
    supplierPaymentCreated: "تم تسجيل السداد بنجاح",
    supplierPaymentDeleted: "تم حذف السداد",
    supplierPaymentCreateFailed: "فشل تسجيل السداد",
    supplierPaymentDeleteFailed: "فشل حذف السداد",
    paymentMethodLabel: "طريقة الدفع",
    supplierStatement: "كشف حساب",
    supplierStatementTitle: "كشف حساب المورد",
    supplierStatementDesc: "عرض فواتير المشتريات والسدادات والرصيد الجاري للمورد",
    statementFrom: "من تاريخ",
    statementTo: "إلى تاريخ",
    statementInvoicesTotal: "إجمالي الفواتير",
    statementPaymentsTotal: "إجمالي السدادات",
    statementReturnsTotal: "إجمالي المرتجعات",
    statementOpeningBalance: "رصيد افتتاحي",
    statementClosingBalance: "الرصيد الختامي",
    statementPrint: "طباعة",
    statementNoTransactions: "لا توجد معاملات في هذه الفترة",
    statementInvoice: "فاتورة",
    statementPayment: "سداد",
    statementReturn: "مرتجع",
    statementDate: "التاريخ",
    statementType: "النوع",
    statementDebit: "مدين",
    statementCredit: "دائن",
    statementBalance: "الرصيد",
    statementReference: "المرجع",
    statementDescription: "البيان",
    purchaseReturnsTitle: "مرتجعات المشتريات",
    purchaseReturnsDesc: "إرجاع بضاعة لمورد مقابل أمر شراء مستلم — يخصم المخزون وينشئ قيدًا محاسبيًا عكسيًا",
    newPurchaseReturn: "مرتجع جديد",
    returnFromPO: "مرتجع من أمر شراء",
    returnableQty: "الكمية المتاحة للإرجاع",
    returnTotal: "إجمالي المرتجع",
    returnNo: "رقم المرتجع",
    noPurchaseReturns: "لا توجد مرتجعات مشتريات بعد",
    purchaseReturnCreated: "تم اعتماد مرتجع المشتريات",
    purchaseReturnCreateFailed: "فشل اعتماد المرتجع",
    approveReturn: "اعتماد المرتجع",
    returnOriginalQty: "الأصلي",
    returnAvailable: "المتاح",
    returnFullyReturned: "مرتجع كامل",
    returnSelectQty: "حدد كمية مرتجعة",
    stockTakeTab: "جرد",
    stockTakeTitle: "جرد المخزون",
    stockTakeDesc: "إنشاء أمر جرد، إدخال الكميات الفعلية، وتسوية الفروقات محاسبياً",
    newStockTake: "جرد جديد",
    systemQty: "دفتري",
    actualQty: "فعلي",
    varianceLabel: "الفرق",
    varianceValue: "قيمة الفرق",
    shortage: "عجز",
    surplus: "فائض",
    approveStockTake: "اعتماد الجرد",
    stockTakeApproved: "تم اعتماد الجرد",
    noStockTakes: "لا توجد عمليات جرد بعد",
    stockTakeCreated: "تم إنشاء أمر الجرد",
    stockTakeCreateFailed: "فشل إنشاء الجرد",
    stockTakeApproveFailed: "فشل اعتماد الجرد",
    stockTakeWarehouse: "المخزن",
    stockTakeAllWarehouses: "كل المخازن",
    stockTakeConfirmApprove: "اعتماد الجرد",
    stockTakeConfirmApproveDesc: "سيتم تعديل كميات المخزون وإنشاء القيود المحاسبية للعجز/الفائض",
    stockTransferTab: "تحويلات",
    stockTransferTitle: "التحويلات بين المخازن",
    stockTransferDesc: "إنشاء تحويل (إرسال) من مخزن لآخر، ثم استلام البضاعة عند الوصول",
    newStockTransfer: "تحويل جديد",
    fromWarehouse: "من مخزن",
    toWarehouse: "إلى مخزن",
    receiveTransfer: "استلام",
    transferOut: "بالطريق",
    transferReceived: "مستلم",
    transferInTransit: "بضاعة بالطريق",
    transferCancelled: "ملغي",
    noStockTransfers: "لا توجد تحويلات بعد",
    transferCreated: "تم إنشاء التحويل",
    transferCreateFailed: "فشل إنشاء التحويل",
    transferReceiveFailed: "فشل استلام التحويل",
    transferSameWarehouse: "لا يمكن التحويل لنفس المخزن",
    stockMovementTab: "حركة المخزون",
    stockMovementReport: "تقرير حركة المخزون",
    stockMovementDesc: "تتبع جميع حركات المخزون (مبيعات، مرتجعات، مشتريات، تحويلات، جرد)",
    movementTypeAll: "كل الأنواع",
    movementQuantityChange: "التغير في الكمية",
    movementUser: "المستخدم",
    movementTypeSale: "بيع",
    movementTypeRefund: "مرتجع مبيعات",
    movementTypeExchange: "تبديل",
    movementTypePurchaseInvoice: "فاتورة مشتريات",
    movementTypePurchaseReturn: "مرتجع مشتريات",
    movementTypeTransferOut: "تحويل صادر",
    movementTypeTransferIn: "تحويل وارد",
    movementTypeStockTake: "جرد",
    movementTypeSpotCheck: "جرد أعمى",
    movementNoData: "لا توجد حركات في هذه الفترة",
    movementExportCsv: "تصدير CSV",
    navAudit: "التدقيق",
    auditTitle: "سجل التدقيق والرقابة",
    auditDesc: "مراقبة الحركات المشبوهة للكاشير، نسب الحذف، والإجراءات الاستثنائية",

    // Bundles (الباقات)
    navBundles: "الباقات والعروض",
    bundlesTitle: "الباقات والعروض",
    bundlesDesc: "إنشاء باقات ومنتجات تُباع معًا بسعر مخفّض — مثال: عطر + بخور + مبخرة",
    bundleAddNew: "إضافة باقة",
    bundleEditTitle: "تعديل الباقة",
    bundleName: "اسم الباقة",
    bundleNamePlaceholder: "مثال: باقة العيد الفاخرة",
    bundleDescription: "وصف الباقة",
    bundleSalePrice: "سعر الباقة",
    bundleIsActive: "مفعّلة",
    bundleStartDate: "تاريخ البدء",
    bundleEndDate: "تاريخ الانتهاء",
    bundleCategory: "التصنيف",
    bundleItems: "مكونات الباقة",
    bundleAddItem: "إضافة منتج",
    bundleSelectProduct: "اختر منتجًا",
    bundleQuantity: "الكمية",
    bundleRemoveItem: "إزالة",
    bundleTotalCost: "إجمالي التكلفة",
    bundleRetailTotal: "سعر المكونات منفردة",
    bundleProfit: "الربح",
    bundleDiscountPct: "نسبة الخصم",
    bundleNoItems: "لا توجد مكونات — أضف منتجات للباقة",
    bundleSaveSuccess: "تم حفظ الباقة",
    bundleDeleteConfirm: "هل تريد حذف هذه الباقة؟",
    bundleActiveOnly: "النشطة فقط",
    bundleInactive: "غير مفعّلة",
    bundleSearchPlaceholder: "ابحث باسم الباقة...",
    bundleSeasonal: "موسمية",
    bundleNoBundles: "لا توجد باقات بعد",

    // Compositions (التركيبات)
    navCompositions: "التركيبات",
    compositionsTitle: "التركيبات والخلطات",
    compositionsDesc: "خلط مكوّنات خام بنسب محددة لإنتاج منتج جديد — مثال: دهن عود + بخور = عود ملكي",
    compAddNew: "إضافة تركيبة",
    compEditTitle: "تعديل التركيبة",
    compName: "اسم التركيبة",
    compNamePlaceholder: "مثال: عود ملكي فاخر",
    compDescription: "وصف التركيبة",
    compOutputProduct: "المنتج الناتج",
    compOutputProductHint: "المنتج الذي سيُنتج عند تنفيذ التركيبة",
    compYieldQty: "كمية الإنتاج",
    compYieldUnit: "وحدة الإنتاج",
    compNotes: "ملاحظات التحضير",
    compNotesPlaceholder: "مثال: تُخلط المكونات بالتدريج مع التقليب البطيء",
    compIsActive: "مفعّلة",
    compIngredients: "المكونات الخام",
    compAddIngredient: "إضافة مكوّن",
    compSelectIngredient: "اختر مكوّنًا",
    compIngredientQty: "الكمية",
    compIngredientUnit: "الوحدة",
    compIngredientNotes: "ملاحظات",
    compRemoveIngredient: "إزالة",
    compCostPerBatch: "تكلفة الدفعة",
    compCostPerUnit: "تكلفة الوحدة",
    compNoIngredients: "لا توجد مكونات — أضف مكوّنات خام",
    compProduce: "إنتاج دفعة",
    compProduceConfirm: "تأكيد الإنتاج",
    compProduceSuccess: "تم إنتاج الدفعة بنجاح",
    compProduceFailed: "فشل الإنتاج",
    compProduceBatchQty: "عدد الدفعات",
    compInsufficientStock: "مخزون غير كافٍ",
    compProduceInsufficientDesc: "بعض المكونات لا يوجد منها كمية كافية في المخزون",
    compSaveSuccess: "تم حفظ التركيبة",
    compDeleteConfirm: "هل تريد حذف هذه التركيبة؟",
    compNoCompositions: "لا توجد تركيبات بعد",
    compSearchPlaceholder: "ابحث باسم التركيبة...",
    auditLogs: "سجل الحركات",
    auditVoidRate: "نسبة الحذف لكل كاشير",
    auditSuspicious: "مشبوه",
    auditNormal: "طبيعي",
    auditVoidThresholdHint: "الحد الآمن: ≤ ٣٪ — ما يفوقه يُعتبر مشبوهاً",
    auditActionVoidItem: "حذف صنف",
    auditActionCancelTxn: "إلغاء فاتورة",
    auditActionRefund: "مرتجع",
    auditActionExchange: "تبديل",
    auditActionManualDiscount: "خصم يدوي",
    auditActionDrawerOpen: "فتح درج",
    auditActionHoldBill: "تعليق فاتورة",
    auditActionManagerApproval: "موافقة مشرف",
    accBalanceSheet: "الميزانية العمومية",
    accCashFlow: "التدفقات النقدية",
    accCustomerStatement: "كشف حساب عميل",
    accVatReport: "تقرير ضريبة القيمة المضافة",
    accAssets: "الأصول",
    accLiabilities: "الخصوم",
    accEquity: "حقوق الملكية",
    accInflows: "تدفقات داخلة",
    accOutflows: "تدفقات خارجة",
    accNetCashFlow: "صافي التدفق النقدي",
    accOpeningCash: "رصيد نقدي افتتاحي",
    accClosingCash: "رصيد نقدي ختامي",
    accOutputVat: "ضريبة المبيعات",
    accInputVat: "ضريبة المشتريات",
    accNetVat: "صافي الضريبة المستحقة",
    accSalesVatTotal: "إجمالي المبيعات",
    accPurchasesVatTotal: "إجمالي المشتريات",
    accBalanceSheetBalanced: "الميزانية متوازنة ✓",
    accBalanceSheetNotBalanced: "الميزانية غير متوازنة ✗",
    generalLedger: "دفتر الأستاذ العام",
    generalLedgerDesc: "عرض جميع القيود المحاسبية لحساب معين خلال فترة محددة",
    glSelectAccount: "اختر الحساب",
    glEntryNo: "رقم القيد",
    glRunningBalance: "الرصيد الجاري",
    glNoAccountSelected: "يرجى اختيار حساب لعرض القيود",
    glNoMovements: "لا توجد قيود لهذا الحساب في الفترة المحددة",
    glOpeningBalance: "رصيد افتتاحي",
    glDate: "التاريخ",
    glDescription: "البيان",
    exportPDF: "تصدير PDF",
    exportExcel: "تصدير Excel",
    exportFailedMsg: "فشل التصدير",
    exportSucceededMsg: "تم التصدير بنجاح",
    piTitle: "فواتير المشتريات",
    piDesc: "فواتير المشتريات وسندات استلام البضاعة",
    piNew: "فاتورة جديدة",
    piNo: "رقم الفاتورة",
    piPost: "اعتماد",
    piSaveDraft: "حفظ كمسودة",
    piSavePost: "حفظ واعتماد",
    piPostConfirm: "سيتم تحديث المخزون وإنشاء قيد محاسبي. متابعة؟",
    piDraft: "مسودة",
    piPosted: "معتمدة",
    piCancelled: "ملغاة",
    piReceiveFromPO: "استلام وإنشاء فاتورة",
    piImportFromPO: "استيراد من أمر شراء",
    piPostedSuccess: "تم اعتماد الفاتورة وتحديث المخزون",
    piCreated: "تم إنشاء الفاتورة",
    piDeleted: "تم حذف المسودة",
    piCannotDeletePosted: "لا يمكن حذف فاتورة معتمدة",
    piSelectSupplier: "اختر المورد",
    piSelectWarehouse: "اختر المستودع",
    piSelectPO: "اختر أمر الشراء",
    piNoPO: "بدون أمر شراء",
    piItems: "الأصناف",
    piAddItem: "إضافة صنف",
    piSubtotal: "المجموع الفرعي",
    piTaxAmount: "قيمة الضريبة",
    piTotal: "الإجمالي",
    piLandedCost: "تكلفة الوصول",
    piNoInvoices: "لا توجد فواتير مشتريات",
  },
  en: {
    dir: "ltr",
    appName: "Store Manager",
    appTagline: "Sales, Inventory & Purchasing",
    navDashboard: "Dashboard",
    navManagerDashboard: "Manager Dashboard",
    managerDashboardTitle: "Manager Dashboard",
    managerDashboardDesc: "Quick operational overview of store performance",
    navOwnerDashboard: "Owner Dashboard",
    ownerDashboardTitle: "Owner Dashboard",
    ownerDashboardDesc: "Comprehensive business performance overview",
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
    navShifts: "Shifts",
    navSpotCheck: "Spot-Check",
    navExchanges: "Exchange",
    navPricing: "Pricing",
    navUsers: "Users",
    navInvoicesReports: "Invoices & Reports",
    navInventoryPurchases: "Inventory & Purchases",
    navAccountingCustomers: "Accounting & Customers",
    navSystem: "Settings",
    navOperations: "Daily Operations",
    roleAdmin: "Administrator",
    roleOwner: "Owner",
    roleManager: "Manager",
    roleAccountant: "Accountant",
    roleSales: "Sales Clerk",
    roleWarehouse: "Warehouse Keeper",
    roleCashier: "Cashier",
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
    noDataDescription: "Data will appear here once added.",
    confirmDescription: "Are you sure? This action cannot be undone.",
    retry: "Retry",
    total: "Total",

    // Common — products
    product: "Product",
    products: "Products",
    productRequired: "Product is required",
    productName: "Product name",
    productNotFound: "Product not found",
    productDeleted: "Product deleted",
    productUpdated: "Product updated",
    productAdded: "Product added",
    productNameRequired: "Product name is required",
    productImage: "Product image",

    // Common — customers
    customer: "Customer",
    customers: "Customers",
    cashCustomer: "Cash customer",
    customerName: "Customer name",
    customerPhone: "Customer phone",
    customerNameRequired: "Customer name is required",

    // Common — suppliers
    supplier: "Supplier",
    suppliers: "Suppliers",
    supplierName: "Supplier name",
    supplierNameRequired: "Supplier name is required",
    supplierNamePlaceholder: "Enter supplier name",
    contactPerson: "Contact person",
    supplierRequired: "Supplier is required",
    selectSupplier: "Select supplier",
    selectSupplierFirst: "Select a supplier first",
    supplierDeleted: "Supplier deleted",
    supplierUpdated: "Supplier updated",
    supplierAdded: "Supplier added",

    // Common — quantity / stock
    qty: "Qty",
    quantity: "Quantity",
    qtyRequired: "Quantity is required",
    qtyUnavailable: "Quantity unavailable",
    qtyExceedsStock: "Quantity exceeds stock",
    qtyInsufficient: "Insufficient quantity",
    stockInsufficient: "Insufficient stock",
    stock: "Stock",
    inStock: "In stock",
    outOfStock: "Out of stock",
    outOfStockShort: "Out",
    outOfStockFull: "Out of stock",
    lowStock: "Low stock",
    nearOutOfStock: "Near out of stock",
    available: "Available",
    availableFrom: "Available from",
    currentQty: "Current quantity",

    // Common — price / barcode
    price: "Price",
    unitPrice: "Unit price",
    costPrice: "Cost price",
    salePrice: "Sale price",
    wholesalePrice: "Wholesale price",
    corporatePrice: "Corporate price",
    barcode: "Barcode",
    barcodeGenerated: "Barcode generated",
    barcodeGenerateFailed: "Barcode generation failed",
    autoGenerate: "Auto-generate",
    autoGenerateBarcode: "Auto-generate barcode",
    selectCategoryFirst: "Select a category first",
    selectCategoryForAuto: "Select category for auto-generation",
    generateBarcode: "Generate barcode",

    // Common — category
    category: "Category",
    categories: "Categories",
    allCategories: "All categories",
    allProducts: "All products",
    selectCategory: "Select category",
    categoryRequired: "Category is required",
    categoryName: "Category name",
    categoryCode: "Category code",
    categoryCodePlaceholder: "e.g. FOOD",

    // Common — date / period
    date: "Date",
    fromDate: "From date",
    toDate: "To date",
    from: "From",
    to: "To",
    period: "Period",
    allPeriods: "All periods",
    quickRange: "Quick range",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    lastYear: "Last year",

    // Common — status / misc
    status: "Status",
    note: "Note",
    noteOptional: "Note (optional)",
    notePlaceholder: "Add a note...",
    optional: "Optional",
    required: "Required",
    actions: "Actions",
    open: "Open",
    yes: "Yes",
    no: "No",
    all: "All",
    none: "None",

    // Common — money
    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    taxPercent: "Tax %",
    taxRate: "Tax rate",
    totalAmount: "Total amount",
    amount: "Amount",
    amountDue: "Amount due",
    totalPaid: "Total paid",
    grandTotal: "Grand total",
    invoiceTotal: "Invoice total",
    additionalFees: "Additional fees",
    country: "Country",
    currency: "Currency",

    // Common — payment
    payment: "Payment",
    paymentMethod: "Payment method",
    paymentMethodShort: "Payment",
    cash: "Cash",
    card: "Card",
    transfer: "Transfer",
    cashShort: "Cash",
    cardShort: "Card",
    transferShort: "Transfer",
    payCash: "Pay cash",
    payCard: "Pay by card",
    payTransfer: "Pay by transfer",

    // Common — unit
    unit: "Unit",
    units: "Units",
    unitRequired: "Unit is required",
    selectUnit: "Select unit",
    piece: "Piece",
    pieceDefault: "Piece (default)",

    // Common — warehouse
    warehouse: "Warehouse",
    warehouses: "Warehouses",
    warehouseName: "Warehouse name",
    warehouseNameRequired: "Warehouse name is required",
    warehouseNamePlaceholder: "Enter warehouse name",
    warehouseCode: "Warehouse code",
    warehouseLocation: "Warehouse location",
    warehouseDeleted: "Warehouse deleted",
    warehouseUpdated: "Warehouse updated",
    warehouseAdded: "Warehouse added",
    warehouseHasStock: "Cannot delete a warehouse that has stock",
    noWarehouses: "No warehouses",
    addWarehouse: "Add warehouse",
    addFirstWarehouse: "Add your first warehouse",
    selectWarehouse: "Select warehouse",

    // Common — branch
    branch: "Branch",
    branchWarehouse: "Branch / warehouse",
    allBranches: "All branches",

    // Common — search
    searchPlaceholder: "Search...",
    noResults: "No results",
    recentPages: "Recent",
    globalSearchHint: "Global search",
    searchProductPlaceholder: "Search for a product...",
    searchNameBarcode: "Search by name or barcode",
    searchInvoicePlaceholder: "Search for an invoice...",
    searchNameBarcodePlaceholder: "Type name or scan barcode...",

    // Common — items
    items: "Items",
    itemsCount: "Items count",
    itemCount: "item",
    itemsCountLabel: "{count} items",
    noItems: "No items",
    noProducts: "No products",
    noProductsToPrint: "No products to print",
    noMatchingProducts: "No matching products",
    noDataForPeriod: "No data for this period",
    tryAnotherKeyword: "Try another keyword",

    // Common — loading / progress
    reload: "Reload",
    loadingPrices: "Loading prices...",
    loadingShifts: "Loading shifts...",
    loadingJournal: "Loading journal...",
    loadingStats: "Loading stats...",
    loadingAudit: "Loading audit log...",
    calculatingReport: "Calculating report...",
    calculatingMatrix: "Calculating matrix...",
    calculatingFinancialReport: "Calculating financial report...",
    updating: "Updating...",
    executing: "Executing...",
    completing: "Completing...",
    approving: "Approving...",
    applying: "Applying...",

    // Common — errors
    loadFailed: "Load failed",
    productsLoadFailed: "Failed to load products",
    invoicesLoadFailed: "Failed to load invoices",
    poLoadFailed: "Failed to load purchase orders",
    suppliersLoadFailed: "Failed to load suppliers",
    reportLoadFailed: "Failed to load report",
    pricesLoadFailed: "Failed to load prices",
    approvalDraftsLoadFailed: "Failed to load approval drafts",
    auditLoadFailed: "Failed to load audit log",
    dataLoadFailed: "Failed to load data",

    // Common — save / export / import
    saveChanges: "Save changes",
    saveFailed: "Save failed",
    deleteFailed: "Delete failed",
    addFailed: "Add failed",
    recordFailed: "Record failed",
    exportFailed: "Export failed",
    exportSucceeded: "Exported successfully",
    importedToExcel: "Imported to Excel",
    exportedToExcel: "Exported to Excel",
    importSucceeded: "Imported successfully",
    importFailed: "Import failed",
    importSummary: "Fetched: {total} • Created: {created} • Updated: {updated} • Skipped: {skipped}",
    uploadExcelFile: "Upload Excel file",
    downloadEmptyTemplate: "Download empty template",
    imageUploaded: "Image uploaded",
    imageUploadFailed: "Image upload failed",
    imageTooLarge: "Image is too large — max 2 MB",
    imageResizeFailed: "Could not process the image — try another one",
    changeImage: "Change image",
    uploadImage: "Upload image",
    imageFormatsHint: "Allowed formats: JPG, PNG, WEBP",

    // Common — filters
    filters: "Filters",
    activeFilters: "Active filters",
    applyFilters: "Apply filters",
    resetFilters: "Reset filters",
    activeLabel: "Active",
    filterBy: "Filter by",
    source: "Source",
    allSources: "All sources",
    posSource: "Point of Sale",
    shopifySource: "Shopify",

    // Common — pagination / nav
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    previous: "Previous",
    next: "Next",
    pageXofY: "Page {x} of {y}",
    viewDetails: "View details",
    openItem: "Open item",
    fetchInvoice: "Fetch invoice",
    lookupInvoice: "Look up invoice",

    // Common — form fields
    name: "Name",
    namePlaceholder: "Enter name",
    phone: "Phone",
    phonePlaceholder: "Enter phone number",
    emailPlaceholder: "name@example.com",
    address: "Address",
    addressPlaceholder: "Enter address",
    selectPlaceholder: "Select...",
    selectItem: "Select an item",

    // Common — selection actions
    selectProduct: "Select product",
    selectProductFirst: "Select a product first",
    addAtLeastOneProduct: "Add at least one product",
    addLine: "Add line",
    addRow: "Add row",
    addProduct: "Add product",
    addProductNew: "Add new product",
    editProduct: "Edit product",
    addSupplier: "Add supplier",
    addSupplierNew: "Add new supplier",
    editSupplier: "Edit supplier",
    addWarehouseNew: "Add new warehouse",
    editWarehouse: "Edit warehouse",
    addCategory: "Add category",
    editCategory: "Edit category",

    // Common — delete confirmations
    deleteProductTitle: "Delete product",
    deleteProductConfirm: "Are you sure you want to delete this product? This cannot be undone.",
    deleteSupplierTitle: "Delete supplier",
    deleteSupplierConfirm: "Are you sure you want to delete this supplier? This cannot be undone.",
    deleteWarehouseTitle: "Delete warehouse",
    deleteWarehouseConfirm: "Are you sure you want to delete this warehouse? This cannot be undone.",
    deleteConfirm: "Are you sure you want to delete?",

    // Page titles
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
    shiftsTitle: "Shifts & Cash Reconciliation",
    shiftsDesc: "Open/close shifts, reconcile K-Net & Visa",
    spotCheckTitle: "Blind Spot-Check",
    spotCheckDesc: "Surprise count of sensitive items without book qty",
    exchangesTitle: "Exchange Invoice",
    exchangesDesc: "Item swaps with credit notes",
    pricingTitle: "Pricing & Promotions",
    pricingDesc: "Manage sale prices, temporary promotions, and price-change audit log",
    usersTitle: "User Management",
    usersDesc: "Manage user accounts, roles, and permissions",
    newUser: "New User",
    editUser: "Edit User",
    newUserDesc: "Create a new user account",
    editUserDesc: "Update user details and role",
    userDeleted: "User deleted",
    emailExists: "Email already exists",
    userDeleteConfirm: "Delete user \'{name}\'?",
    noUsers: "No users",
    role: "Role",
    you: "You",
    noAccess: "No access",
    noAccessDesc: "This page is not available for your role. Contact the manager if you believe this is an error.",
    noExportPermission: "You don't have permission to export this data",

    // Theme + language
    darkMode: "Dark mode",
    lightMode: "Light mode",
    switchLang: "العربية",
    logout: "Log out",

    // Login
    loginTitle: "Sign in",
    loginDesc: "Enter your credentials to access the dashboard",
    email: "Email",
    emailOrUsername: "Email or Username",
    password: "Password",
    login: "Sign in",
    loggingIn: "Signing in...",
    demoAccounts: "Demo accounts",
    welcomeBack: "Welcome back",

    // POS module
    cart: "Cart",
    cartEmpty: "Cart is empty",
    cartEmptyPark: "Cart is empty — cannot park",
    clearCart: "Clear cart",
    tapToAddProduct: "Tap to add a product",
    checkoutSale: "Checkout sale",
    checkoutFailed: "Checkout failed",
    saleCompleted: "Sale completed",
    saleCompletedDesc: "Invoice recorded successfully",
    sessionExpired: "Session expired",
    pleaseRelogin: "Please sign in again",
    park: "Park",
    parked: "Parked",
    parkedInvoices: "Parked invoices",
    parkedInvoicesCount: "{count} parked invoices",
    noParkedInvoices: "No parked invoices",
    parkCurrentInvoice: "Park current invoice",
    parkFailed: "Failed to park invoice",
    invoiceParked: "Invoice parked",
    holdNo: "Hold no.",
    parkedDeleted: "Parked invoice deleted",
    deleteParkedConfirm: "Delete this parked invoice?",
    replaceCartConfirm: "Replace current cart contents?",
    resume: "Resume",
    resumeInvoiceFailed: "Failed to resume invoice",
    invoiceRestored: "Invoice restored",
    unnamed: "Unnamed",
    parkListTitle: "Parked invoices",
    customerSection: "Customer details",
    paymentSection: "Payment",
    phoneAutoSearch: "Auto-search by phone",
    existingCustomer: "Existing customer",
    newCustomerAuto: "New customer (auto)",
    priceTier: "Price tier",
    tierRetail: "Retail",
    tierWholesale: "Wholesale",
    tierCorporate: "Corporate",
    priceType: "Price type",
    basePrice: "Base price",
    effectivePrice: "Effective price",
    promoPrice: "Promo price",
    promo: "Promo",
    promoActive: "Active promo",
    deliveryRequest: "Delivery request",
    deliveryFee: "Delivery fee",
    driverName: "Driver name",
    driverNamePlaceholder: "Enter driver name",
    deliveryFeeLabel: "Delivery fee",

    // Exchange module
    fullyReturned: "Fully returned",
    original: "Original",
    returned: "Returned",
    returnable: "Returnable",
    returnQty: "Return qty",
    returnValue: "Return value",
    refundTotal: "Refund total",
    refundInvoice: "Refund invoice",
    refundDialogDesc: "Are you sure you want to approve this refund?",
    refundApproved: "Refund approved",
    refundFailed: "Refund failed",
    refundApprovedSuccess: "Refund approved successfully",
    refundBlocked: "Refund blocked",
    exceeded14Days: "Exceeded 14 days",
    enable14DayOverride: "Enable 14-day override",
    override14Days: "Override 14-day rule",
    partialRefund: "Partial refund",
    partialRefundReason: "Partial refund reason",
    fullRefund: "Full refund",
    refundedFull: "Refunded in full",
    refundedPartial: "Refunded partially",
    refundedFully: "Fully refunded",
    refundMore: "Refund more",
    creditNote: "Credit note",
    creditNoteTotal: "Credit note total",
    totalReturns: "Total returns",
    returns: "Returns",
    scanOrTypePlaceholder: "Scan or type...",
    perUnit: "Per unit",
    originalInvoice: "Original invoice",
    originalInvoiceRequired: "Original invoice is required",
    originalInvoiceNotFound: "Original invoice not found",
    invoiceExpired14Days: "Invoice is older than 14 days",
    invoiceExpired14DaysLong: "Sorry, this invoice is older than 14 days — exchange is not allowed",
    invoiceDate: "Invoice date",
    invoiceNo: "Invoice no.",
    invoiceNoPlaceholder: "Type or scan invoice number...",
    invoiceNotFoundRetry: "Invoice not found, try again",
    invoiceNumber: "Invoice number",
    originalInvoiceItems: "Original invoice items",
    returnableQtyHint: "Returnable quantity",
    itemNotInOriginalInvoice: "Sorry, this item is not in the original invoice!",
    itemFullyReturned: "Sorry, this item has already been fully exchanged or returned from this invoice!",
    scannedQtyExceedsReturnable: "Scanned quantity exceeds returnable quantity",
    returnExceedsRemaining: "Return exceeds remaining quantity",
    enterInvoiceNoFirst: "Enter the invoice number first",
    fetchOriginalInvoice: "Fetch original invoice",
    mandatory: "Mandatory",
    eligibleForExchange: "Eligible for exchange",
    daysPassed: "Days passed",
    newExchange: "New exchange",
    exchangeApproved: "Exchange approved",
    exchangeApproveFailed: "Failed to approve exchange",
    exchangeApprovedSuccess: "Exchange approved successfully",
    exchangeNo: "Exchange no.",
    exchangeNotePlaceholder: "Note (optional)",
    settlementMethod: "Settlement method",
    returnsTotal: "Returns total",
    newTotal: "New total",
    returnsByScan: "Returns by scan",
    newItems: "New items",
    scanReturnPlaceholder: "Scan return item barcode",
    scanAddsOneHint: "Each scan adds one unit. Quantity cannot be entered manually — only via scan and the undo button.",
    scanToAddReturn: "Scan to add return",
    remainingAfterReturn: "Remaining after return",
    undoLastScan: "Undo last scan (−1)",
    qtyScanOnly: "Scan-only quantity",
    addAnotherScan: "Add another scan",
    deleteReturnItem: "Delete return item",
    searchNewPlaceholder: "Search for a new item...",
    noNewItemsSearch: "No matching items",
    collectFromCustomer: "Collect from customer",
    refundToCustomer: "Refund to customer",
    exchange: "Exchange",
    even: "Even",
    evenExchange: "Even exchange",
    approveExchange: "Approve exchange",
    confirmExchangeTitle: "Confirm exchange approval",
    confirmExchangeDesc: "Are you sure you want to approve this exchange?",
    afterApprovalReady: "After approval, the exchange will be executed",
    ctrlEnterHint: "Ctrl+Enter to approve",
    ctrlEnterShortcut: "Ctrl+Enter",
    yesApproveExchange: "Yes, approve exchange",
    yesComplete: "Yes, complete",
    printReceipt: "Print receipt",
    newSale: "New sale",
    thermalPrint: "Thermal print",
    thermalPrint80: "Thermal print 80mm",
    a4Print: "A4 print",
    posAutoPrint: "Auto Print",

    // Promotions / discounts
    discountType: "Discount type",
    discountValue: "Discount value",
    discountPercent: "Discount %",
    discountAmount: "Discount amount",
    discountMustBePositive: "Discount value must be positive",
    discountMax100: "Discount percent cannot exceed 100%",
    percent: "Percent",
    fixedAmount: "Fixed amount",
    value: "Value",
    valuePlaceholder: "Enter value",
    fromDate2: "From date",
    toDate2: "To date",
    promotions: "Promotions",
    promotionsAndDiscounts: "Promotions & discounts",
    newPromotion: "New promotion",
    createPromotion: "Create promotion",
    promoCreated: "Promotion created",
    promoCreateFailed: "Failed to create promotion",
    promoDeactivated: "Promotion deactivated",
    promoDeactivateFailed: "Failed to deactivate promotion",
    deactivatePromotionConfirm: "Deactivate this promotion?",
    deactivate: "Deactivate",
    currentPromotions: "Current promotions",
    noPromotions: "No promotions",
    createFirstPromo: "Create your first promotion",
    activeNow: "Active now",
    scheduled: "Scheduled",
    stopped: "Stopped",
    createdBy: "Created by",
    applyScope: "Apply scope",
    applyToAllDesc: "Applies to all products",
    includedCategories: "Included categories",
    excludedCategories: "Excluded categories",
    categoriesSelected: "categories selected",
    categoriesExcluded: "categories excluded",
    noCategories: "No categories",
    scopeProduct: "Specific product",
    scopeCategory: "Specific category",
    scopeAll: "All products",
    scopeAllExcept: "All products except",
    scopeProductShort: "Product",
    scopeCategoryShort: "Category",
    scopeAllShort: "All",
    scopeAllExceptShort: "All except",

    // Pricing module
    priceManagement: "Price management",
    changeLog: "Change log",
    approveAndApplyPrices: "Approve & apply prices",
    approveAndApply: "Approve & apply",
    approvePriceChangesTitle: "Approve price changes",
    approvePriceChangesDesc: "Do you want to approve and apply the price changes?",
    noChangesToApprove: "No changes to approve",
    pricesApproved: "Prices approved",
    applyPricesFailed: "Failed to apply prices",
    belowCostTitle: "Below cost",
    belowCostDesc: "Some prices are below cost price",
    belowCostWarning: "Warning: price below cost",
    belowCostWarningDesc: "Some new prices are below cost price. Verify before approving.",
    confirmApplyAll: "Confirm apply all",
    violatingItemsCount: "{count} violating items",
    pendingChanges: "Pending changes",
    editCellToEnable: "Edit cell to enable",
    cancelChanges: "Cancel changes",
    viewOnlyAdminCanEdit: "View only — admin can edit",
    adminOnlyEdit: "Admin only can edit",
    editSalePricesInPricing: "Edit sale prices from the pricing screen",
    openPricingScreen: "Open pricing screen",
    estimatedProfitMargin: "Estimated profit margin",
    zeroMeansRetail: "Zero = retail price",
    zeroMeansUnspecified: "Zero = unspecified",
    salePriceEditLocked: "Sale price edit locked",
    totalQty: "Total qty",
    warehousesTotal: "Warehouses total",
    distributeQtyAcrossWarehouses: "Distribute qty across warehouses",
    totalAcrossWarehouses: "Total across warehouses",
    optimalOrderQty: "Optimal order qty",
    defaultSupplier: "Default supplier",
    selectDefaultSupplier: "Select default supplier",
    defaultSupplierHint: "Supplier used for auto-generated purchase orders",
    reorderLevel: "Reorder level",

    // Pricing module — extended
    prcPageTitle: "Pricing & promotions",
    prcSearchAuditPlaceholder: "Search log by name/barcode/user...",
    prcAuditReadOnlyNotice: "This log is read-only — cannot be edited or deleted",
    prcNoMatchingLogEntries: "No matching log entries.",
    prcNewPriceCol: "New price",
    prcAppliedToastDesc: "{applied} changes, {audits} audit entries.",
    prcApproveCountDesc: "{count} item price changes will be approved. This cannot be undone.",
    prcScopeCategoriesLabel: "Categories: {names}",
    prcScopeAllExceptLabel: "All items except: {names}",
    prcScopeAllLabel: "All items",
    prcDiscountValueLabel: "Discount {value}",
    prcCreatedByLabel: "Created by: {name}",
    prcReload: "Reload",
    prcSelectOneCategoryMin: "Select at least one category",
    prcSelectExcludedCategories: "Select the excluded categories",
    prcDateRangeRequired: "Start and end dates are required",
    prcEndDateAfterStart: "End date must be after start date",
    prcBelowCostAlertToast: "Alert: some prices are below cost",
    prcBelowCostAlertToastDesc: "Review the list then confirm to apply globally.",
    prcNotePlaceholder: "E.g. Ramadan promo",
    prcDiscountPlaceholderPercent: "E.g. 15",
    prcDiscountPlaceholderAmount: "E.g. 0.500",
    prcPendingCountDesc: "You have {count} pending change(s)",
    prcDeactivateConfirm: "Deactivate promotion on \"{label}\"?",
    prcCtrlEnterHint: "To confirm with shortcut: press Ctrl + Enter",
    prcConfirmTooltip: "Click here or use Ctrl+Enter",
    prcCancelChangesCount: "Cancel changes ({count})",
    prcViewOnlyAdminCanEditBadge: "View only — admin can edit prices",
    prcInputLockedTitle: "Price edit is admin-only",
    prcBack: "Back",
    prcApproveAndApplyNew: "Approve & apply new prices",
    prcApproveCountTitle: "Approve price changes",
    prcBelowCostTitleFull: "Warning: prices below cost",
    prcBelowCostDescFull: "These items will be sold below their actual cost. Confirm only if intentional (e.g. a promotional offer).",
    prcLoadingAuditShort: "Loading log...",
    prcLoadingPromos: "Loading...",
    prcCategoriesColon: "Categories: {names}",
    prcAllItemsExceptColon: "All items except: {names}",

    // Purchase orders module
    poSupplier: "Supplier",
    poNote: "PO note",
    poProducts: "PO products",
    poTotal: "PO total",
    poCreated: "Purchase order created",
    poCreateFailed: "Failed to create purchase order",
    poDetailsTitle: "Purchase order details",
    poDetailsDesc: "Purchase order details and items",
    poStatus: "PO status",
    poStatusPendingApproval: "Pending approval",
    poStatusApproved: "Approved",
    poStatusPending: "Pending",
    poStatusReceived: "Received",
    poStatusCancelled: "Cancelled",
    poStatusRejected: "Rejected",
    poReceived: "Purchase order received",
    poReceiveFailed: "Failed to receive purchase order",
    poCancelled: "Purchase order cancelled",
    poCancelFailed: "Failed to cancel purchase order",
    poDeleted: "Purchase order deleted",
    poDeleteFailed: "Failed to delete purchase order",
    poApproved: "Purchase order approved",
    poApproveFailed: "Failed to approve purchase order",
    poEditedAndApproved: "Edited and approved",
    poRejected: "Purchase order rejected",
    poRejectFailed: "Failed to reject purchase order",
    poDraftCreated: "PO draft created",
    poDraftCreateFailed: "Failed to create PO draft",
    noItemsNeedReorder: "No items need reorder",
    fetchSupplierRequiredItems: "Fetch required items from supplier",
    autoPoDesc: "Auto-generate purchase orders for items that reached the reorder level",
    suggestedQtyFormula: "Suggested qty formula",
    createDraft: "Create draft",
    newPurchaseOrder: "New purchase order",
    newPoDesc: "Create a new purchase order for a supplier",
    confirmReceipt: "Confirm receipt",
    confirmReceiptDesc: "Confirm receipt of this order? Stock and cost prices will be updated.",
    confirmPoReceipt: "Confirm purchase order receipt",
    updateCostPrices: "Update cost prices",
    updateCostPricesDesc: "Cost prices will be updated on receipt",
    cancelPoTitle: "Cancel purchase order",
    cancelPoConfirm: "Cancel this order? This cannot be undone.",
    cancelOrder: "Cancel order",
    pendingManagementApproval: "Pending management approval",
    autoPoDraftsDesc: "Auto-generated purchase order drafts pending review",
    pendingReview: "Pending review",
    noApprovalDrafts: "No drafts to approve",
    noApprovalDraftsDesc: "No purchase order drafts pending review",
    reviewPoDraft: "Review PO draft",
    totalAfterEdits: "Total after edits",
    fullReject: "Full reject",
    approveWithEdits: "Approve with edits",
    approveAsIs: "Approve as is",
    editAndAccept: "Edit and accept",
    approveAndAccept: "Approve and accept",
    editAndApprovePo: "Edit and approve purchase order",
    approvePo: "Approve purchase order",
    editAndApproveDesc: "Edit quantities and prices, then approve the order",
    approvePoDesc: "Approve the purchase order with current values",
    editAndApprove: "Edit and approve",
    approve: "Approve",
    reject: "Reject",
    rejectPoTitle: "Reject purchase order",
    rejectReason: "Reject reason",
    rejectReasonPlaceholder: "Enter reject reason",
    enterRejectReason: "Enter a reject reason",
    confirmReject: "Confirm rejection",
    orderNo: "Order no.",
    landedCost: "Landed cost",
    landedCostDesc: "Purchase cost + customs + shipping + other fees",
    landedCostAppliedDesc: "Landed cost will be distributed across items and update the cost price",
    landedCostPreviewDesc: "Preview landed cost impact on cost prices",
    customs: "Customs",
    shipping: "Shipping",
    otherFees: "Other fees",
    invoiceTotal2: "Invoice total",
    suggestedSalePrice: "Suggested sale price",
    emptyMeansNoChange: "Leave empty = no change",

    // Reports module
    repTotalRevenue: "Total revenue",
    repTotalCost: "Total cost",
    repGrossProfit: "Gross profit",
    repAvgInvoice: "Avg invoice",
    repRevenueTrend: "Revenue trend",
    repRevenueTrendDesc: "Daily revenue evolution",
    repPaymentMethods: "Payment methods",
    repRevenueDistribution: "Revenue distribution",
    repRevenueByCategory: "Revenue by category",
    repRevenueByCategoryDesc: "Revenue distribution across categories",
    repProductBreakdown: "Product breakdown",
    repProductBreakdownDesc: "Performance by product",
    repRevenue: "Revenue",
    repProfit: "Profit",
    generalReports: "General reports",
    performanceMatrix: "Performance matrix",
    matrixTitle: "Product performance matrix",
    matrixLongDesc: "Comprehensive matrix analyzing each product: revenue, cost, profit, turnover rate, margin, and stagnant days",
    reportFilters: "Report filters",
    calculatingMatrix2: "Calculating matrix...",
    noDataForPeriod2: "No data for this period",
    performanceMatrixCount: "Matrix of {count} products",
    matrixClickHint: "Click a row for details",
    branchWarehouse2: "Branch / warehouse",
    allSuppliers: "All suppliers",
    matrixKpiRevenue: "Revenue",
    matrixKpiCost: "Cost",
    matrixKpiProfit: "Profit",
    matrixKpiTurnover: "Turnover",
    margin: "Margin",
    stagnantDays: "Stagnant days",
    colName: "Name",
    colBarcode: "Barcode",
    colCategory: "Category",
    colQty: "Qty",
    colReorderLevel: "Reorder level",
    colCostPrice: "Cost price",
    colSalePrice: "Sale price",
    colProduct: "Product",
    colItem: "Item",
    colPrice: "Price",
    colTotal: "Total",
    colSupplier: "Supplier",
    colDate: "Date",
    colItemsCount: "Items count",
    colStatus: "Status",
    colActions: "Actions",
    colBook: "Book",
    colActual: "Actual",
    colVariance: "Variance",
    colUser: "User",
    colType: "Type",
    colFrom: "From",
    colTo: "To",
    colChange: "Change",
    colBy: "By",
    colNote: "Note",
    colUnit: "Unit",
    colOrderNo: "Order no.",
    totalProducts: "Total products",
    totalCategories: "Total categories",
    exportPrint: "Export & print",
    noInvoices: "No invoices",
    noPurchaseOrders: "No purchase orders",
    createFirstPo: "Create your first PO",

    // Reports module — extended
    repDescFull: "Comprehensive sales reports with flexible filters — date range, product, category, payment method, source.",
    repInvoicesCount: "{count} invoices",
    repUnitsSoldCount: "{count} units sold",
    repMarginPctLabel: "Margin {x}%",
    repDiscountLabel: "Discount: {x}",
    repRevenueTrendDaily: "Daily revenue trend",
    repRevenueTrendDailyDesc: "Revenue and invoice count by day",
    repRevenueByCategoryFullDesc: "Revenue vs profit across categories",
    repProductBreakdownFullDesc: "Qty, revenue, cost, and profit per product",
    repColQty: "Qty",
    repColRevenue: "Revenue",
    repColCost: "Cost",
    repColProfit: "Profit",

    // Performance matrix — extended
    matrixTitleFull: "Category & product performance matrix",
    matrixLongDescFull: "Hybrid report aggregated by category with drill-down to each product — covers profitability, turnover rate, and average stagnant days.",
    matrixStagnantDaysHint: "~{x} stagnant days",
    matrixTableTitle: "Performance matrix ({count} categories)",
    matrixHintFull: "Click any category to expand its items — click column header to sort instantly",
    matrixColCategoryItem: "Category / item",
    matrixColNetQty: "Net qty",
    matrixColSales: "Sales",
    matrixColGrossProfit: "Gross profit",
    matrixColMarginPct: "Margin %",
    matrixColStagnantDays: "Stagnant days",
    matrixGrandTotal: "Grand total ({count} categories)",
    matrixNoDataForPeriod: "No data for the selected period",
    matrixCogsLabel: "Total cost (COGS)",

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

    // Spot-check module
    spcBlindItemCount: "Blind item count",
    spcSpotCheckDesc: "Surprise count of sensitive items without revealing book qty",
    spcItemToCount: "Item to count",
    spcSelectItemPlaceholder: "Select an item to count",
    spcBookQtyHiddenHint: "Book quantity is hidden during blind count",
    spcActualQtyOnShelf: "Actual quantity on shelf",
    spcApproveCountAndCalcVariance: "Approve count and calculate variance",
    spcBook: "Book",
    spcActual: "Actual",
    spcShortageCheckRecords: "Shortage — check records",
    spcSurplusCheckReceipts: "Surplus — check receipts",
    spcBlindCountHistory: "Blind count history",
    spcLastCounts: "Last counts",
    spcNoCountsYet: "No counts yet",

    // Spot-check module — extended
    spcNotePlaceholder: "E.g. surprise evening count",
    spcLastCountsCount: "Last {count} counts",
    spcResultShortageLabel: "Shortage — check records",
    spcResultSurplusLabel: "Surplus — check receipts",

    // Dashboard module
    dshTotalSales: "Total sales",
    dshTodaySales: "Today's sales",
    dshSinceStartOfDay: "Since start of day",
    dshProductsCount: "Products count",
    dshInventoryValue: "Inventory value",
    dshLowStockProducts: "Low stock products",
    dshPendingPurchaseOrders: "Pending purchase orders",
    dshSalesTrend: "Sales trend",
    dshDailySalesTrendDesc: "Daily sales trend",
    dshNoSalesYet: "No sales yet",
    dshNoSalesYetDesc: "No sales recorded yet. Start by creating a new invoice.",
    dshInventoryValueDistribution: "Inventory value distribution",
    dshByCategory: "By category",
    dshTopSelling: "Top selling",
    dshByRevenue: "By revenue",
    dshInventoryAlerts: "Inventory alerts",
    dshProductsNeedReorder: "Products needing reorder",
    dshInventoryGood: "Inventory is in good shape",
    dshNoLowStockProducts: "No low stock products",
    dshLimit: "Limit",
    dshRecentInvoices: "Recent invoices",
    dshRecentOperations: "Recent operations",
    dshYouHavePendingPo: "You have pending purchase orders",
    dshConfirmReceiptToUpdateStock: "Confirm receipt to update stock",
    dshReviewPurchases: "Review purchases",
    dshLastXDays: "Last {x} days",
    dshDataLoadFailedDesc: "Failed to load dashboard data. Try again.",
    invoiceCountLabel: "{count} invoice(s)",
    pendingPoCountLabel: "{count} pending purchase order(s)",
    inventoryValueLabel: "Inventory value: {value}",
    dshSales: "Sales",
    dshDailySalesTotalDesc: "Daily sales total ({symbol}) — {range}",
    dshLoadingStats: "Loading stats...",
    dshDataLoadFailed: "Failed to load data",
    dshNoCategories: "No categories",
    dshNoInvoices: "No invoices",

    // Accounting module
    accChartOfAccounts: "Chart of accounts",
    accExpenses: "Expenses",
    accJournalEntries: "Journal entries",
    accPnl: "P&L",
    accTrialBalance: "Trial balance",
    accAccountingLongDesc: "Full accounting system with chart of accounts and automatic journals",
    accMainAccount: "Main account",
    accNoAccountsYet: "No accounts yet",
    accAddSubaccountTitle: "Add sub-account",
    accCodeAndNameRequired: "Code and name are required",
    accSubaccountAdded: "Sub-account added",
    accAccountAdded: "Account added",
    accCodeAlreadyUsed: "Code already used",
    accAddFailed: "Add failed",
    accAddSubaccountUnder: "Add sub-account under",
    accAddMainAccount: "Add main account",
    accEnterNewAccountData: "Enter new account data",
    accAccountType: "Account type",
    accTypeAsset: "Assets",
    accTypeLiability: "Liabilities",
    accTypeEquity: "Equity",
    accTypeRevenue: "Revenue",
    accTypeExpense: "Expenses",
    accTypeInheritedFromParent: "Inherited from parent account",
    accAdd2: "Add",
    accFromDateOptional: "From date (optional)",
    accToDateOptional: "To date (optional)",
    accAllPeriods: "All periods",
    accPnlExplanation: "P&L is calculated as revenue minus cost of goods sold minus operating expenses",
    accNetProfit: "Net profit",
    accForPeriod: "For period",
    accPnlStatement: "Profit & loss statement",
    accPnlStatementDesc: "Statement of revenue, expenses, and net profit",
    accTotalRevenue: "Total revenue",
    accCogs: "Cost of goods sold",
    accGrossProfit: "Gross profit",
    accSalaries: "Salaries",
    accAdminExpenses: "Admin expenses",
    accTotalOpex: "Total OpEx",
    accExpensesByCategory: "Expenses by category",
    accJournalLedger: "Subsidiary Ledger",
    accJournalDesc: "Accounting journal entries",
    accManualEntry: "Manual entry",
    accLoadingJournal: "Loading journal...",
    accNoJournalEntries: "No journal entries",
    accNoJournalEntriesDesc: "No journal entries recorded yet",
    accSum: "Sum",
    accBalanced: "Balanced",
    accNotBalanced: "Not balanced",
    accTrialBalanceDesc: "Trial balance shows the balance of all accounts",
    accNoBalances: "No balances",
    accNoBalancesDesc: "No balances to show",
    accCalculatingTrialBalance: "Calculating trial balance...",
    accRecordExpense: "Record expense",
    accUpdatesBalancesImmediately: "Updates balances immediately",
    accSalary: "Salary",
    accAdminExpense: "Admin expense",
    accEmployeeName: "Employee name",
    accEmployeeNameRequired: "Employee name is required",
    accEmployeeNamePlaceholder: "Enter employee name",
    accAmount: "Amount",
    accPaymentDate: "Payment date",
    accExpenseTitle: "Expense title",
    accExpenseTitleRequired: "Expense title is required",
    accExpenseTitlePlaceholder: "Enter expense title",
    accPaymentAccount: "Payment account",
    accSelectPaymentAccount: "Select payment account",
    accExpenseAccountUndefined: "Expense account undefined",
    accTotalAmount: "Total amount",
    accRecordSalary: "Record salary",
    accCannotDeleteWhileSaving: "Cannot delete while saving",
    accExpenseDeletedReversed: "Expense deleted and entry reversed",
    accExpensesHistory: "Expenses history",
    accNoExpensesRecorded: "No expenses recorded",
    accPaidVia: "Paid via",
    accEnterValidAmount: "Enter a valid amount",
    accSalaryRecorded: "Salary recorded",
    accExpenseRecorded: "Expense recorded",
    accJournalTypeSale: "Sale entry",
    accJournalTypeExpense: "Expense entry",
    accJournalTypePurchase: "Purchase entry",
    accJournalTypeManual: "Manual entry",
    accAccount: "Account",
    accCode: "Code",
    accAccountName: "Account name",
    accDebit: "Debit",
    accCredit: "Credit",
    accPageTitle: "Accounting & expenses",
    accPageDesc: "Chart of accounts, double-entry journals, salaries, expenses and financial reports.",
    accSalariesAdminHint: "Salaries & admin expenses",
    accJournalDoubleHint: "Double-entry ledger",
    accPnlHint: "P&L statement",
    accAccountBalances: "Account balances",
    accChartOfAccountsDesc: "Hierarchical account structure with live balances",
    accPnlExplanationFull: "Revenue is fetched from all sales (including imported Shopify orders), then cost of goods sold, salaries and admin expenses are deducted.",
    accPeriodStart: "Start",
    accPeriodEnd: "Today",
    accPnlBreakdown: "Revenue & expense breakdown",
    accPnlStatementFull: "Profit & loss statement",
    accTotalRevenueFull: "Total revenue (sales + Shopify)",
    accCogsFull: "Cost of goods sold (COGS)",
    accExpenseBreakdownTitle: "Expense breakdown by category",
    accUpdatesBalancesImmediately2: "Updates account balances immediately on save",
    accExpenseTitlePlaceholder2: "e.g. Store rent",
    accPaidLabel: "Paid",
    accCatRent: "Rent",
    accCatUtilities: "Utilities",
    accCatSubscriptions: "Subscriptions",
    accCatMarketing: "Marketing",
    accCatOther: "Other",
    accJournalLedgerFull: "Journal ledger (accounting entries)",
    accJournalDescFull: "Double-entry (debit = credit) — auto-generated on sale/expense/receipt, or manually",
    accJournalSourceSale: "Sales",
    accJournalSourceExpense: "Expense",
    accJournalSourcePurchase: "Purchase",
    accJournalSourceManual: "Manual",
    accTrialBalanceDescFull: "All account balances (debit / credit)",
    accManualEntryTitle: "Manual journal entry",
    accManualEntryDesc: "Enter a balanced double-entry (debit = credit)",
    accDescription: "Description",
    accDescriptionPlaceholder: "e.g. Balance settlement",
    accDescriptionRequired: "Description is required",
    accJournalLines: "Journal lines",
    accSelectAccount: "Select account",
    accSaveJournal: "Save entry",
    accAtLeastTwoLines: "Add at least two lines",
    accJournalCreated: "Journal entry created",
    accJournalCreateFailed: "Failed to create entry",
    subNavSearch: "Search menu...",
    accJournalEntryDetail: "Journal Entry Details",
    accJournalEntryNo: "Entry No.",
    accJournalSourceType: "Source Type",
    accJournalCreatedAt: "Created At",
    accJournalCreatedBy: "Created By",
    accPrintJournal: "Print Entry",
    accExportPdf: "Export PDF",
    accJournalLinesCount: "Lines Count",
    accSearchJournal: "Search by entry no. or description...",

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

    // Analytics module
    anlAnalyticsCards: "Analytics cards",
    anlOverview: "Overview",
    anlSalesByDay: "Sales by day",
    anlTopProducts: "Top products",
    anlPaymentMethods: "Payment methods",
    anlCategorySales: "Category sales",
    anlLowStockAnalysis: "Low stock analysis",
    anlNoData: "No data",
    anlCalculating: "Calculating analytics...",
    anlComprehensiveSummary: "Comprehensive summary",
    anlStagnantItems: "Stagnant items",
    anlUnitsSold: "units sold",
    anlItemNeverSold: "item never sold",
    anlCost: "Cost",
    anlItemAnalyzed: "items analyzed",
    anlProfitability: "Profitability",
    anlProfitableItem: "profitable item",
    anlTotalQtySold: "Total quantity sold",
    anlUnit: "unit",
    anlTotalRevenue: "Total revenue",
    anlInPeriod: "in period",
    anlStagnantItemsCount: "stagnant items",
    anlValuePrefix: "Value",
    anlAvgMargin: "Average profit margin",
    anlAcrossItems: "across items",
    anlTop6Items: "Top 6 selling items",
    anlProfitabilityDistribution: "Profitability distribution",
    anlDetailedReports: "Detailed reports",
    anlDetailedReportsDesc: "Navigate to a specific report for full details and charts",
    anlNeverSoldCount: "{count} never sold",
    anlTopItem: "Top selling item",
    anlRankByQty: "Items ranked by quantity",
    anlNoSales: "No sales",
    anlTryWiderRange: "Try a wider date range.",
    anlNeverSoldItems: "Items never sold",
    anlTotalStagnantItems: "Total stagnant items",
    anlStagnantValue: "Stagnant inventory value",
    anlStagnantDesc: "Sorted by lowest turnover — may need discounts or clearance",
    anlNoStagnantItems: "No stagnant items",
    anlAllSellingWell: "All items are selling well.",
    anlSold: "Sold",
    anlTurnoverRatio: "Turnover ratio",
    anlStagnantValueCol: "Stagnant value",
    anlNeverSold: "Never sold",
    anlSlow: "Slow",
    anlHighestCost: "Highest cost",
    anlLowestCost: "Lowest cost",
    anlAvgCost: "Average cost",
    anlMostExpensive: "Most expensive",
    anlCheapest: "Cheapest",
    anlHighestProfitability: "Highest profitability",
    anlProfitableItems: "Profitable items",
    anlProfitMargin: "Profit margin",
    anlMarginPct: "Margin %",
    anlBreakdownByItem: "{metric} breakdown by item",

    // Settings module
    setActiveCountry: "Set active country",
    setCountry: "Country",
    setCurrency: "Currency",
    setTaxRate: "Tax rate",
    setUnits: "Units of measure",
    setCategories: "Categories",
    setAddUnit: "Add unit",
    setUnitName: "Unit name",
    setUnitNamePlaceholder: "e.g. Kilogram",
    setUnitAdded: "Unit added",
    setUnitDeleted: "Unit deleted",
    setUnitExists: "Unit already exists",
    setAddCategory: "Add category",
    setCategoryName: "Category name",
    setCategoryCode: "Category code",
    setCategoryCodePlaceholder: "e.g. FOOD",
    setCategoryAdded: "Category added",
    setCategoryUpdated: "Category updated",
    setCategoryDeleted: "Category deleted",
    setCategoryInUse: "Cannot delete a category used by products",
    setNoUnits: "No units of measure",
    setNoCategories: "No categories",
    setEditCategory: "Edit category",
    setCategoryNameRequired: "Category name is required",
    setPageDesc: "Manage country, currency, units and categories.",
    setCurrentCountryLabel: "Current country",
    setLocaleCode: "Locale code",
    setCountryAndCurrency: "Country & currency",
    setCountryPickerDesc: "Pick a country to auto-update currency and tax",
    setSaveCountry: "Save country",

    // Company / Store info (for invoices)
    companyInfoTitle: "Company Info for Documents",
    companyInfoDesc: "This information appears in the header of printed invoices and receipts",
    companyInfoName: "Company / Store Name",
    companyInfoNamePlaceholder: "e.g. Luxury Perfume Store",
    companyInfoAddress: "Address",
    companyInfoAddressPlaceholder: "City - District - Street",
    companyInfoPhone: "Phone",
    companyInfoPhonePlaceholder: "+965 XXXXXXXX",
    companyInfoVatNo: "VAT Number",
    companyInfoVatNoPlaceholder: "If applicable",
    companyInfoLogo: "Company Logo",
    companyInfoLogoHint: "Appears next to the company name on the invoice",
    companyInfoSave: "Save Info",
    companyInfoSaved: "Company info saved",
    companyInfoPreview: "Invoice Preview",
    setNoCountryChange: "No country change",
    setCountryUpdated: "Country updated",
    setCountryUpdatedDesc: "Reload the page to refresh all formats.",
    setUnitsDesc: "Units of measure available when adding products",
    setAddUnitPlaceholder: "Add a new unit (e.g. box)",
    setNoResults: "No results",
    setUnitDeletedToast: "Unit “{name}” deleted",
    setCategoriesDesc: "Product categories available across warehouses. The short code is used for barcode generation.",
    setCodePlaceholder: "Code (e.g. 03)",
    setCodeTitle: "Short code (up to 4 chars) used as barcode prefix",
    setAddCategoryPlaceholder: "Add a new category (e.g. Electronics)",
    setSearchCategoriesPlaceholder: "Search categories...",
    setCategoryCodeExists: "Category code already in use",
    setCategoryDeletedToast: "Category “{name}” deleted",
    setCategoryInUseDesc: "It is still linked to products.",
    setEditCategoryDesc: "Edit the category name and its short code used for barcode generation.",
    setCodeLabel: "Code (up to 4 chars)",

    // Integrations module
    intShopify: "Shopify",
    intShopifyDesc: "Connect your store to Shopify to sync products and orders",
    intConnect: "Connect",
    intDisconnect: "Disconnect",
    intSync: "Sync",
    intSyncing: "Syncing...",
    intSynced: "Synced",
    intSyncFailed: "Sync failed",
    intNotConnected: "Not connected",
    intSetupGuide: "Setup guide",
    intStoreDomain: "Store domain",
    intAccessToken: "Access token",
    intSave: "Save",
    intTestConnection: "Test connection",
    intConnectionOk: "Connection OK",
    intConnectionFailed: "Connection failed",
    intImportProducts: "Import products",
    intImportOrders: "Import orders",
    intProductsImported: "Products imported",
    intOrdersImported: "Orders imported",
    intImportFailed2: "Import failed",
    intPageDesc: "Connect the system to your Shopify store to sync products and import orders.",
    intConnected: "Connected",
    intConnectedTo: "Connected to {domain}",
    intRefreshStatus: "Refresh status",
    intSyncProducts: "Sync products",
    intSyncProductsDesc: "Fetch products from Shopify and add or update them in inventory. Matching by barcode/SKU or name.",
    intSyncNow: "Sync now",
    intImportOrdersDesc: "Fetch the last 50 orders from Shopify and create them as sales invoices. Previously imported orders are skipped.",
    intImporting: "Importing...",
    intImportNow: "Import now",
    intFetched: "Fetched",
    intCreated: "Created",
    intUpdated: "Updated",
    intImported2: "Imported",
    intSkipped: "Skipped",
    intNotes: "Notes:",
    intEnvHint: "To update credentials or the access token, edit the .env file and restart the server.",
    intStep1Title: "Open Shopify settings",
    intStep1Desc: "From the Shopify admin, go to: Apps ← Develop apps.",
    intStep1Link: "Open the apps page",
    intStep2Title: "Create a custom app",
    intStep2Desc: "Click Create an app, name it, then from Configuration add these scopes: read_products, read_orders.",
    intStep3Title: "Install the app and get the token",
    intStep3Desc: "Click Install app, then copy the Admin API access token (starts with shpat_ and shown only once).",
    intStep4Title: "Add credentials to .env",
    intStep4Desc: "In the project root, fill the following variables then restart the server.",
    intSetupIntro: "The Shopify integration is optional. When enabled you can sync your online store products with your inventory, and import orders automatically as sales invoices.",
    intSetupFinalNote: "After filling the variables, restart the server and reload this page.",

    // Login module (extended)
    logInvalidCredentials: "Invalid credentials",
    logCheckEmailPassword: "Check your email and password",
    logLoginSuccess: "Signed in successfully",
    logWelcomeDesc: "Welcome to Store Manager",
    logUnexpectedError: "An unexpected error occurred",
    logLoginHeroTitle: "Complete management for your store",
    logLoginHeroDesc: "Sales, inventory, purchasing, and accounting in one platform",
    logFeature1: "Fast POS with invoice parking",
    logFeature2: "Multi-warehouse inventory with auto purchase orders",
    logFeature3: "Full accounting with chart of accounts and auto journals",
    logCopyright: "All rights reserved",
    logDemo: "Demo",
    logTapToFill: "Tap to fill",
    logAppName: "Store Manager",
    logAppTaglineShort: "ERP for small businesses",

    // App-shell
    appFooterDesc: "Sales, inventory & purchasing management",
    appMadeWith: "Made with care",
    appForSmallProjects: "For small projects",

    // ── Sales module (POS + invoices + exchange + refund + confirm dialog) ──
    // Page header / generic
    posTitle: "Point of Sale (POS)",
    posDesc: "Create a new sales invoice — search products, add to cart; totals, tax, and discount calculated automatically.",
    invoicesDescFull: "Sales invoice history — browse, print, and manage returns.",
    newInvoice: "New invoice",
    searchInvoiceOrCustomer: "Search by invoice no. or customer name...",
    selectInvoiceHint: "Select an invoice from the list to view details",
    salesInvoice: "Sales invoice",
    phoneAuto: "Phone (auto-search)",
    customerFoundPrefix: "Existing customer:",
    newCustomerAutoInline: "New customer — auto-registered",
    tierLabel: "Price tier:",
    cartPageLabel: "{x} / {y} — {count} items",
    posCheckoutWithTotal: "Checkout — {total}",

    // POS toasts / confirmations
    posItemUnavailable: "Sorry, this item is unavailable in stock",
    posItemUnavailableDesc: "{name} — Current quantity: {qty}",
    posQtyUnavailableDesc: "Available from {name}: {qty} {unit}",
    posResumeSuccessDesc: "{count} items, total {total}",
    posInvoiceParkedDesc: "Hold no.: {holdNo}",
    posDeleteParkedConfirm: "Delete parked invoice {holdNo}?",
    posParkedDeletedToast: "Parked invoice {holdNo} deleted",
    posResumeCartReplaceConfirm: "The current cart is not empty. It will be replaced with the parked invoice contents. Continue?",
    posStockInsufficientDesc: "Available balance of {name} is insufficient. Quantities updated.",
    posResumeFailedToast: "Failed to restore parked invoice",
    posParkEmptyToast: "Cart is empty — nothing to park",

    // Express POS mode (simplified cashier view)
    expressMode: "Express Mode",
    standardMode: "Standard Mode",
    expressBarcodePlaceholder: "Scan barcode or search...",
    expressCash: "Cash",
    expressCard: "Card",
    expressMoreOptions: "More Options",
    expressClearCart: "Clear Cart",
    expressClearCartConfirm: "Clear the cart? All items will be removed.",
    expressCartTitle: "Cart",
    expressCheckoutCash: "Cash",
    expressCheckoutCard: "Card",
    expressNoProducts: "No products",
    expressLowStock: "Low stock",
    expressUnitPrice: "Unit price",
    expressCustomerPhone: "Customer phone",
    expressCustomerName: "Customer name",
    expressDiscount: "Discount",
    expressAddress: "Address",
    posPhoneRequired: "Phone number is required",
    posAddressRequired: "Address is required for delivery",
    expressTaxRate: "Tax %",
    expressDelivery: "Delivery",
    expressDriverName: "Driver name",
    expressDeliveryFee: "Delivery fee",
    expressItemsInCart: "{count} items in cart",
    expressLogout: "Logout",
    expressBarcodeHint: "Enter: add by barcode • F2 or Ctrl+Enter: checkout • Esc: clear",

    // Receipt dialog
    receiptItemsHeader: "Item",
    receiptQtyHeader: "Qty",
    receiptTotalHeader: "Total",
    receiptPaymentMethod: "Payment method:",
    receiptViewSummary: "View the newly created invoice summary.",

    // Invoices view
    invoicesRefundFullBadge: "Fully refunded",
    invoicesRefundPartialBadge: "Partial refund",
    invoicesRefundedFullyBadge: "Fully refunded",
    invoicesRefundedPartialWithAmount: "Partial refund — {amount}",
    invoicesAdditionalRefund: "Additional refund",
    invoicesRefundInvoiceAction: "Refund invoice",
    invoicesRefundedFullTotalDesc: "Fully refunded — Total refunded: {total}",
    invoicesRefundedPartialDesc: "Previous partial refund: {amount} — remaining can be returned",
    invoicesPageLabel: "Page {x} of {y} ({total} invoices)",
    invoicesCountLabel: "{total} invoices",

    // Refund dialog
    refundSearchPlaceholder: "Scan the item barcode or type its name for quick search...",
    refundItemSelected: "Selected: {name}",
    refundItemNotFound: "Item not found",
    refundSelectAtLeastOne: "Select a return quantity for at least one item",
    refundApprovedToast: "Refund approved",
    refundApprovedToastDesc: "Credit note: {creditNoteNo} — {total}",
    refund14DaysExceededToast: "Exceeded 14 days",
    refund14DaysExceededDesc: "Enable the 14-day override option (admin only)",
    refundFailedToast: "Refund failed",
    refundDialogTitle: "Refund invoice {invoiceNo}",
    refundPartialDialogDesc: "Select the returned quantities for each item. A credit note is created automatically.",
    refundSuccessTitle: "Refund approved successfully",
    refundReturnsLabel: "Returns",
    refundTaxLabel: "Tax",
    refundTotalLabel: "Refund total",
    refund14DaysWarning: "This invoice is older than {maxDays} days ({daysSince} days passed)",
    refund14DaysWarningDesc: "Returns are blocked after 14 days. Only an admin can override this.",
    refundOverrideAdminLabel: "Override the 14-day rule (admin permission)",
    refundOriginalLabel: "Original:",
    refundReturnedLabel: "Returned:",
    refundAvailableLabel: "Available:",
    refundLineValueLabel: "Refund value:",
    refundReturnsTotalLabel: "Total returns",
    refundTaxWithRateLabel: "Tax ({rate}%)",
    refundApproveBtn: "Approve refund",
    refundUnitSuffix: "unit",

    // Exchange view
    excDesc: "Exchange items based on an original invoice — fetch the invoice, scan return barcodes, then pick new items.",
    excNewExchangeBtn: "New exchange",
    excInvoiceExample: "Type or scan the invoice number (e.g. INV-00021)...",
    excInvoiceNotFoundShort: "Invoice not found — verify the invoice number and try again.",
    excInvoiceEligibleLabel: "Eligible for exchange · {days} day(s)",
    excInvoiceExpiredLabel: "{days} days passed",
    excInvoiceDatePrefix: "Invoice date:",
    excOriginalItemsHint: "Returnable quantity shown for each item",
    excReturnsByScanTitle: "Returns — by scan",
    excNewItemsTitle: "New",
    excScanReturnPlaceholder2: "Scan the return item barcode (or type the name)...",
    excScanToAddHint: "Scan the item barcode to add it to the return",
    excNoNewItems: "No new items — search to add an item",
    excPricePrefix: "Price:",
    excRemainingAfterReturnPrefix: "Remaining after return:",
    excSettlementMethodLabel: "Difference settlement method",
    excNotePlaceholder: "Exchange reason or admin note...",
    excNetEvenLabel: "Even",
    excApproveExchangeBtn: "Approve exchange — {count} item(s)",
    excExchangeSuccessDesc: "View the newly created exchange invoice summary.",
    excCustomerPrefix: "Customer:",
    excSettlementPrefix: "Settlement method:",
    excConfirmDesc: "Review the exchange details before approval — cannot be undone after confirmation.",
    excReturnExceedsRemainingMsg: "Sorry, the requested return quantity exceeds the remaining quantity in the invoice!",
    excAddItemsFirst: "Add items to return or new items first",
    excOriginalInvoiceRequiredDesc: "An original invoice must be loaded before approval.",
    excCtrlEnterConfirmHint: "To confirm via shortcut: press",
    excSearchNewItemsPlaceholder: "Search by name or barcode to add a new item...",

    // Sale confirm dialog
    saleConfirmDialogTitle: "Confirm sale checkout",
    saleConfirmDialogDesc: "Review the invoice details before approval — cannot be undone after confirmation.",
    saleConfirmPaymentMethod: "Payment method",
    saleConfirmGrandTotalLabel: "Total amount due",
    saleConfirmCancelBtn: "Cancel",
    saleConfirmConfirmBtn: "Yes, complete",
    saleConfirmCtrlEnterHint: "To complete via shortcut: press",
    saleConfirmOrCtrlEnter: "Click here or use Ctrl+Enter",

    // ── Inventory module — page header & misc ──
    invManageTitle: "Inventory Management",
    invManageDesc: "View and manage products, search & filter, and track stock quantities.",
    invItemsTab: "Items",
    printBarcode: "Print barcodes",
    openingPrintWindow: "Opening print window",
    barcodeLabelsCount: "{count} barcode labels",
    noLowStockProducts: "No low-stock products",
    noLowStockDesc: "All products are within safe limits.",
    addFirstProduct: "Add your first product to inventory.",
    productsCountLabel: "Total {count} products",
    deleteProductPermanent: "Product \"{name}\" will be permanently deleted. This cannot be undone.",

    // Product form dialog
    editProductDesc: "Edit the product details and save your changes.",
    addProductDesc: "Enter the new product details to add it to inventory.",
    productNamePlaceholder: "e.g. Basmati Rice 5kg",
    barcodePlaceholder: "6281000...",
    autoGenerateBarcodeTitle: "Auto-generate barcode from category code",
    selectCategoryForAutoHint: "Select a category first to enable auto-generation.",
    unitNotInList: "\"{unit}\" is not in the units list — add it from Settings",
    totalQtyLabel: "Total quantity",
    warehouseStockSum: "Warehouse sum: {total}",
    optimalOrderQtyHint: "(0 = unspecified)",
    salePriceEditLockedTitle: "Sale price editing is available in the Pricing screen",
    addProductButton: "Add product",

    // Warehouse manager
    warehouseManagerDesc: "Manage multiple warehouses — each has its own code, location, and quantities.",
    noWarehousesDesc: "Add your first warehouse to organize items.",
    warehouseInactive: "Inactive",
    warehouseUnitsCount: "{count} units",
    deleteWarehouseConfirmLong: "Warehouse \"{name}\" will be deleted.",

    // Warehouse form dialog
    editWarehouseDesc: "Edit the warehouse details.",
    addWarehouseDesc: "Add a new warehouse to manage multiple inventory locations.",
    warehouseNameInputPlaceholder: "e.g. Main Warehouse",
    warehouseCodePlaceholder: "WH-01",
    warehouseLocationInputPlaceholder: "Main branch",

    // Purchases view
    purchasesTitleLong: "Purchases & Purchase Orders",
    purchasesDescLong: "Create purchase orders to restock, and confirm receipt to update quantities automatically.",
    allStatuses: "All statuses",
    noPurchaseOrdersDesc: "Create your first purchase order to restock products.",
    poDetailsDescLong: "View PO items and totals.",
    landedCostSectionTitle: "Additional charges (landed cost)",
    landedCostAppliedLong: "Cost prices have been updated based on these charges — distributed across items weighted by value, using the moving-average method.",
    landedCostPreviewLongDetail: "These charges will be distributed across items weighted by value at receipt, and cost prices will be updated using the moving-average method.",
    autoDraftDialogTitle: "Summon required items for supplier",
    autoDraftDialogDesc: "Creates an automatic PO draft for all of the supplier's items at or below reorder level, awaiting management approval before sending.",
    suggestedQtyFormulaLong: "Suggested qty per item = optimal reorder qty if set, else (reorder level × 2 − current qty). Unit price = current cost price.",
    createDraftButton: "Create draft",
    noItemsNeedReorderForSupplier: "No items need reordering for this supplier",
    noItemsNeedReorderForSupplierDesc: "All items from this supplier are above the reorder level.",
    poDraftPendingApprovalDesc: "As {poLabel} — awaiting management approval.",
    poReceivedWithStockDesc: "Quantities have been added to products automatically.",
    poReceiveFailedShort: "Failed to confirm receipt",
    poCancelFailedShort: "Failed to cancel",
    poDeleteFailedShort: "Failed to delete",
    confirmReceiptDescLong: "The order will be marked as Received and quantities added to stock. This cannot be undone.",
    updateCostPricesTitle: "Update cost prices",
    updateCostPricesConfirmDesc: "Approving this invoice will update item cost prices based on the customs and shipping charges (moving-average method).",
    proceedQuestion: "Do you want to proceed?",
    cancelPoConfirmLong: "The purchase order from \"{supplier}\" will be cancelled.",

    // Purchase order dialog
    newPoDescLong: "Create a purchase order to restock. Quantities won't be affected until receipt is confirmed.",
    createOrder: "Create order",
    suggestedSalePriceHint: "Suggested sale price ({symbol}) — optional",
    emptyMeansNoChangeInput: "Leave empty = no change",
    landedCostPreviewLong: "These charges will be distributed across items at receipt, weighted by item value, and cost prices updated using the moving-average method.",
    additionalFeesShort: "Additional fees",
    grandTotalLong: "PO grand total",

    // PO approval panel
    pendingReviewCount: "{count} under review",
    autoPoDraftsDescLong: "Auto-generated PO drafts — review items then approve or reject.",
    noApprovalDraftsDescLong: "When an auto-PO draft is created, it will appear here for review.",
    reviewPoDraftTitle: "Review PO draft",
    editAndApprovePoTitle: "Edit & approve PO",
    approvePoTitle: "Approve PO",
    editAndApproveDescLong: "Your item edits will be applied, then the PO will be approved.",
    approvePoDescLong: "The PO will be approved as-is (no edits).",
    afterApprovalReadyDesc: "After approval, the order is ready to be received from the supplier.",
    editAndApproveButton: "Edit & approve",
    approveButton: "Approve",
    rejectPoTitleShort: "Reject PO",
    rejectReasonPlaceholderLong: "Enter the rejection reason (required)…",
    rejectReasonRequired: "Enter a rejection reason",
    confirmRejectButton: "Confirm rejection",
    approveWithEditsTooltip: "Approve with edits applied",
    approveAsIsTooltip: "Approve as-is (no edits applied)",

    // Suppliers view
    suppliersDescLong: "List of suppliers and their contact information.",
    suppliersLoadFailedShort: "Failed to load suppliers",
    noSuppliers: "No suppliers",
    noSuppliersDesc: "Add your first supplier to manage purchases.",
    noContactData: "No contact data",
    ordersCountLabel: "{count} purchase orders",
    deleteSupplierConfirmLong: "Supplier \"{name}\" will be deleted.",
    cannotDeleteLinkedSupplier: "Cannot delete a supplier linked to products or purchase orders",

    // Supplier form dialog
    editSupplierDesc: "Edit the supplier details.",
    addSupplierDesc: "Enter the new supplier details.",
    supplierNameInputPlaceholder: "e.g. National Foods Co.",
    contactPersonPlaceholder: "Name",
    phoneInputPlaceholder: "05xxxxxxxx",
    emailInputPlaceholder: "info@supplier.sa",
    addressInputPlaceholder: "City - District",

    // Purchase invoices / GRN
    navPurchaseInvoices: "Purchase Invoices",
    navSupplierPayments: "Supplier Payments",
    supplierPaymentsTitle: "Supplier Payments",
    supplierPaymentsDesc: "Record payments to suppliers and update accounting balances automatically",
    newSupplierPayment: "New Payment",
    paySupplier: "Pay",
    supplierBalance: "Outstanding Balance",
    amountPaid: "Amount Paid",
    paymentDateLabel: "Payment Date",
    paymentNoLabel: "Payment No.",
    referenceNo: "Reference No.",
    paymentMethodCash: "Cash",
    paymentMethodBank: "Bank Transfer",
    paymentMethodCheck: "Cheque",
    noSupplierPayments: "No supplier payments recorded yet",
    supplierPaymentCreated: "Payment recorded successfully",
    supplierPaymentDeleted: "Payment deleted",
    supplierPaymentCreateFailed: "Failed to record payment",
    supplierPaymentDeleteFailed: "Failed to delete payment",
    paymentMethodLabel: "Payment Method",
    supplierStatement: "Statement",
    supplierStatementTitle: "Supplier Statement",
    supplierStatementDesc: "Show purchase invoices, payments, and running balance for a supplier",
    statementFrom: "From",
    statementTo: "To",
    statementInvoicesTotal: "Invoices Total",
    statementPaymentsTotal: "Payments Total",
    statementReturnsTotal: "Returns Total",
    statementOpeningBalance: "Opening Balance",
    statementClosingBalance: "Closing Balance",
    statementPrint: "Print",
    statementNoTransactions: "No transactions in this period",
    statementInvoice: "Invoice",
    statementPayment: "Payment",
    statementReturn: "Return",
    statementDate: "Date",
    statementType: "Type",
    statementDebit: "Debit",
    statementCredit: "Credit",
    statementBalance: "Balance",
    statementReference: "Reference",
    statementDescription: "Description",
    purchaseReturnsTitle: "Purchase Returns",
    purchaseReturnsDesc: "Return goods to a supplier against a received PO — deducts inventory and creates a reversing journal entry",
    newPurchaseReturn: "New Return",
    returnFromPO: "Return from PO",
    returnableQty: "Returnable Qty",
    returnTotal: "Return Total",
    returnNo: "Return No.",
    noPurchaseReturns: "No purchase returns yet",
    purchaseReturnCreated: "Purchase return approved",
    purchaseReturnCreateFailed: "Failed to approve return",
    approveReturn: "Approve Return",
    returnOriginalQty: "Original",
    returnAvailable: "Available",
    returnFullyReturned: "Fully returned",
    returnSelectQty: "Select return quantity",
    stockTakeTab: "Stock Take",
    stockTakeTitle: "Stock Take",
    stockTakeDesc: "Create a stock take, enter actual quantities, and settle variances in accounting",
    newStockTake: "New Stock Take",
    systemQty: "System",
    actualQty: "Actual",
    varianceLabel: "Variance",
    varianceValue: "Variance Value",
    shortage: "Shortage",
    surplus: "Surplus",
    approveStockTake: "Approve",
    stockTakeApproved: "Stock take approved",
    noStockTakes: "No stock takes yet",
    stockTakeCreated: "Stock take created",
    stockTakeCreateFailed: "Failed to create stock take",
    stockTakeApproveFailed: "Failed to approve stock take",
    stockTakeWarehouse: "Warehouse",
    stockTakeAllWarehouses: "All warehouses",
    stockTakeConfirmApprove: "Approve Stock Take",
    stockTakeConfirmApproveDesc: "Inventory quantities will be adjusted and journal entries created for shortage/surplus",
    stockTransferTab: "Transfers",
    stockTransferTitle: "Stock Transfers",
    stockTransferDesc: "Create a transfer (send) from one warehouse to another, then receive on arrival",
    newStockTransfer: "New Transfer",
    fromWarehouse: "From",
    toWarehouse: "To",
    receiveTransfer: "Receive",
    transferOut: "In Transit",
    transferReceived: "Received",
    transferInTransit: "Goods in transit",
    transferCancelled: "Cancelled",
    noStockTransfers: "No transfers yet",
    transferCreated: "Transfer created",
    transferCreateFailed: "Failed to create transfer",
    transferReceiveFailed: "Failed to receive transfer",
    transferSameWarehouse: "Cannot transfer to the same warehouse",
    stockMovementTab: "Stock Movement",
    stockMovementReport: "Stock Movement Report",
    stockMovementDesc: "Track all stock movements (sales, returns, purchases, transfers, counts)",
    movementTypeAll: "All types",
    movementQuantityChange: "Quantity Change",
    movementUser: "User",
    movementTypeSale: "Sale",
    movementTypeRefund: "Sale Refund",
    movementTypeExchange: "Exchange",
    movementTypePurchaseInvoice: "Purchase Invoice",
    movementTypePurchaseReturn: "Purchase Return",
    movementTypeTransferOut: "Transfer Out",
    movementTypeTransferIn: "Transfer In",
    movementTypeStockTake: "Stock Take",
    movementTypeSpotCheck: "Spot Check",
    movementNoData: "No movements in this period",
    movementExportCsv: "Export CSV",
    navAudit: "Audit",
    auditTitle: "Audit & Control Log",
    auditDesc: "Monitor suspicious cashier activity, void rates, and exceptional actions",

    // Bundles
    navBundles: "Bundles & Offers",
    bundlesTitle: "Bundles & Offers",
    bundlesDesc: "Create product bundles sold together at a discounted price — e.g. perfume + incense + burner",
    bundleAddNew: "Add Bundle",
    bundleEditTitle: "Edit Bundle",
    bundleName: "Bundle Name",
    bundleNamePlaceholder: "e.g. Eid Luxury Set",
    bundleDescription: "Description",
    bundleSalePrice: "Bundle Price",
    bundleIsActive: "Active",
    bundleStartDate: "Start Date",
    bundleEndDate: "End Date",
    bundleCategory: "Category",
    bundleItems: "Bundle Items",
    bundleAddItem: "Add Product",
    bundleSelectProduct: "Select a product",
    bundleQuantity: "Quantity",
    bundleRemoveItem: "Remove",
    bundleTotalCost: "Total Cost",
    bundleRetailTotal: "Items Sold Separately",
    bundleProfit: "Profit",
    bundleDiscountPct: "Discount %",
    bundleNoItems: "No items — add products to this bundle",
    bundleSaveSuccess: "Bundle saved",
    bundleDeleteConfirm: "Delete this bundle?",
    bundleActiveOnly: "Active only",
    bundleInactive: "Inactive",
    bundleSearchPlaceholder: "Search bundles...",
    bundleSeasonal: "Seasonal",
    bundleNoBundles: "No bundles yet",

    // Compositions
    navCompositions: "Compositions",
    compositionsTitle: "Compositions & Blends",
    compositionsDesc: "Mix raw ingredients in specific ratios to produce a new product — e.g. oud oil + incense = Royal Oud",
    compAddNew: "Add Composition",
    compEditTitle: "Edit Composition",
    compName: "Composition Name",
    compNamePlaceholder: "e.g. Royal Oud Premium",
    compDescription: "Description",
    compOutputProduct: "Output Product",
    compOutputProductHint: "The product created when this composition is produced",
    compYieldQty: "Yield Quantity",
    compYieldUnit: "Yield Unit",
    compNotes: "Preparation Notes",
    compNotesPlaceholder: "e.g. Mix ingredients gradually with slow stirring",
    compIsActive: "Active",
    compIngredients: "Raw Ingredients",
    compAddIngredient: "Add Ingredient",
    compSelectIngredient: "Select an ingredient",
    compIngredientQty: "Quantity",
    compIngredientUnit: "Unit",
    compIngredientNotes: "Notes",
    compRemoveIngredient: "Remove",
    compCostPerBatch: "Cost per Batch",
    compCostPerUnit: "Cost per Unit",
    compNoIngredients: "No ingredients — add raw materials",
    compProduce: "Produce Batch",
    compProduceConfirm: "Confirm Production",
    compProduceSuccess: "Batch produced successfully",
    compProduceFailed: "Production failed",
    compProduceBatchQty: "Number of Batches",
    compInsufficientStock: "Insufficient Stock",
    compProduceInsufficientDesc: "Some ingredients do not have enough quantity in stock",
    compSaveSuccess: "Composition saved",
    compDeleteConfirm: "Delete this composition?",
    compNoCompositions: "No compositions yet",
    compSearchPlaceholder: "Search compositions...",
    auditLogs: "Activity Log",
    auditVoidRate: "Void Rate per Cashier",
    auditSuspicious: "Suspicious",
    auditNormal: "Normal",
    auditVoidThresholdHint: "Safe threshold: ≤ 3% — above is suspicious",
    auditActionVoidItem: "Void Item",
    auditActionCancelTxn: "Cancel Txn",
    auditActionRefund: "Refund",
    auditActionExchange: "Exchange",
    auditActionManualDiscount: "Manual Discount",
    auditActionDrawerOpen: "Drawer Open",
    auditActionHoldBill: "Hold Bill",
    auditActionManagerApproval: "Manager Approval",
    accBalanceSheet: "Balance Sheet",
    accCashFlow: "Cash Flow",
    accCustomerStatement: "Customer Statement",
    accVatReport: "VAT Report",
    accAssets: "Assets",
    accLiabilities: "Liabilities",
    accEquity: "Equity",
    accInflows: "Inflows",
    accOutflows: "Outflows",
    accNetCashFlow: "Net Cash Flow",
    accOpeningCash: "Opening Cash",
    accClosingCash: "Closing Cash",
    accOutputVat: "Output VAT",
    accInputVat: "Input VAT",
    accNetVat: "Net VAT Payable",
    accSalesVatTotal: "Sales Total",
    accPurchasesVatTotal: "Purchases Total",
    accBalanceSheetBalanced: "Balance sheet balanced ✓",
    accBalanceSheetNotBalanced: "Balance sheet NOT balanced ✗",
    generalLedger: "General Ledger",
    generalLedgerDesc: "View all journal entries for a specific account over a date range",
    glSelectAccount: "Select account",
    glEntryNo: "Entry No",
    glRunningBalance: "Running Balance",
    glNoAccountSelected: "Please select an account to view entries",
    glNoMovements: "No journal entries for this account in the selected period",
    glOpeningBalance: "Opening balance",
    glDate: "Date",
    glDescription: "Description",
    exportPDF: "Export PDF",
    exportExcel: "Export Excel",
    exportFailedMsg: "Export failed",
    exportSucceededMsg: "Export succeeded",
    piTitle: "Purchase Invoices",
    piDesc: "Purchase invoices and goods receipt notes",
    piNew: "New Invoice",
    piNo: "Invoice No.",
    piPost: "Post",
    piSaveDraft: "Save Draft",
    piSavePost: "Save & Post",
    piPostConfirm: "Stock will be updated and a journal entry created. Continue?",
    piDraft: "Draft",
    piPosted: "Posted",
    piCancelled: "Cancelled",
    piReceiveFromPO: "Receive & Create Invoice",
    piImportFromPO: "Import from PO",
    piPostedSuccess: "Invoice posted and stock updated",
    piCreated: "Invoice created",
    piDeleted: "Draft deleted",
    piCannotDeletePosted: "Cannot delete a posted invoice",
    piSelectSupplier: "Select supplier",
    piSelectWarehouse: "Select warehouse",
    piSelectPO: "Select purchase order",
    piNoPO: "No purchase order",
    piItems: "Items",
    piAddItem: "Add item",
    piSubtotal: "Subtotal",
    piTaxAmount: "Tax amount",
    piTotal: "Total",
    piLandedCost: "Landed cost",
    piNoInvoices: "No purchase invoices",
  },
}
