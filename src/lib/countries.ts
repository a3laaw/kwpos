/**
 * Multi-country configuration registry (Arab countries + a few global).
 * Each country defines its currency, locale, VAT/tax rate, and labels.
 */

export interface CountryConfig {
  code: string // ISO 3166-1 alpha-2
  name: string // Arabic name
  nameEn: string
  currency: string // ISO 4217
  currencySymbol: string
  currencyDecimals: number // 2 for most, 3 for KWD/BHD/OMR
  locale: string // BCP 47 locale for Intl formatting
  taxRate: number // default VAT % (0 if none)
  taxLabel: string // "ضريبة القيمة المضافة" or "بدون ضريبة"
  flag: string // emoji flag
  phonePattern: string // hint for phone format
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "KW",
    name: "الكويت",
    nameEn: "Kuwait",
    currency: "KWD",
    currencySymbol: "د.ك",
    currencyDecimals: 3,
    locale: "ar-KW",
    taxRate: 0,
    taxLabel: "بدون ضريبة",
    flag: "🇰🇼",
    phonePattern: "+965 5xxx xxxx",
  },
  {
    code: "SA",
    name: "السعودية",
    nameEn: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "ر.س",
    currencyDecimals: 2,
    locale: "ar-SA",
    taxRate: 15,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇸🇦",
    phonePattern: "+966 5x xxx xxxx",
  },
  {
    code: "AE",
    name: "الإمارات",
    nameEn: "UAE",
    currency: "AED",
    currencySymbol: "د.إ",
    currencyDecimals: 2,
    locale: "ar-AE",
    taxRate: 5,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇦🇪",
    phonePattern: "+971 5x xxx xxxx",
  },
  {
    code: "QA",
    name: "قطر",
    nameEn: "Qatar",
    currency: "QAR",
    currencySymbol: "ر.ق",
    currencyDecimals: 2,
    locale: "ar-QA",
    taxRate: 0,
    taxLabel: "بدون ضريبة",
    flag: "🇶🇦",
    phonePattern: "+974 3xxx xxxx",
  },
  {
    code: "BH",
    name: "البحرين",
    nameEn: "Bahrain",
    currency: "BHD",
    currencySymbol: "د.ب",
    currencyDecimals: 3,
    locale: "ar-BH",
    taxRate: 10,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇧🇭",
    phonePattern: "+973 3xxx xxxx",
  },
  {
    code: "OM",
    name: "عُمان",
    nameEn: "Oman",
    currency: "OMR",
    currencySymbol: "ر.ع",
    currencyDecimals: 3,
    locale: "ar-OM",
    taxRate: 5,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇴🇲",
    phonePattern: "+968 9xxx xxxx",
  },
  {
    code: "EG",
    name: "مصر",
    nameEn: "Egypt",
    currency: "EGP",
    currencySymbol: "ج.م",
    currencyDecimals: 2,
    locale: "ar-EG",
    taxRate: 14,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇪🇬",
    phonePattern: "+20 1xx xxx xxxx",
  },
  {
    code: "JO",
    name: "الأردن",
    nameEn: "Jordan",
    currency: "JOD",
    currencySymbol: "د.أ",
    currencyDecimals: 3,
    locale: "ar-JO",
    taxRate: 16,
    taxLabel: "ضريبة المبيعات",
    flag: "🇯🇴",
    phonePattern: "+962 7x xxx xxxx",
  },
  {
    code: "MA",
    name: "المغرب",
    nameEn: "Morocco",
    currency: "MAD",
    currencySymbol: "د.م",
    currencyDecimals: 2,
    locale: "ar-MA",
    taxRate: 20,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇲🇦",
    phonePattern: "+212 6xx xxx xxx",
  },
  {
    code: "IQ",
    name: "العراق",
    nameEn: "Iraq",
    currency: "IQD",
    currencySymbol: "د.ع",
    currencyDecimals: 0,
    locale: "ar-IQ",
    taxRate: 0,
    taxLabel: "بدون ضريبة",
    flag: "🇮🇶",
    phonePattern: "+964 7xx xxx xxxx",
  },
  {
    code: "DZ",
    name: "الجزائر",
    nameEn: "Algeria",
    currency: "DZD",
    currencySymbol: "د.ج",
    currencyDecimals: 2,
    locale: "ar-DZ",
    taxRate: 19,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇩🇿",
    phonePattern: "+213 5xx xx xx xx",
  },
  {
    code: "TN",
    name: "تونس",
    nameEn: "Tunisia",
    currency: "TND",
    currencySymbol: "د.ت",
    currencyDecimals: 3,
    locale: "ar-TN",
    taxRate: 19,
    taxLabel: "ضريبة القيمة المضافة",
    flag: "🇹🇳",
    phonePattern: "+216 xx xxx xxx",
  },
]

export const DEFAULT_COUNTRY_CODE = "KW"

export function getCountry(code: string): CountryConfig {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]
}
