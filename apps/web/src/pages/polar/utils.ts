/**
 * Utility functions for Polar Payments & Products
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'VND',
  'JPY',
  'KRW',
  'CLP',
  'BIF',
  'DJF',
  'GNF',
  'ISK',
  'KMF',
  'PYG',
  'RWF',
  'UGX',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

/**
 * Checks whether a given currency code is zero-decimal in payment gateways (Polar / Stripe).
 */
export function isZeroDecimalCurrency(currency?: string | null): boolean {
  if (!currency) return false
  return ZERO_DECIMAL_CURRENCIES.has(currency.trim().toUpperCase())
}

/**
 * Converts a raw Polar price amount to the human-readable unit amount.
 * For zero-decimal currencies (e.g. VND, JPY), the integer value is returned as-is.
 * For standard currencies (e.g. USD, EUR), cents are divided by 100.
 */
export function getPolarUnitAmount(
  rawAmount: number | null | undefined,
  currency?: string | null
): number {
  if (rawAmount == null) return 0
  const curr = (currency || 'USD').toUpperCase()
  return isZeroDecimalCurrency(curr) ? rawAmount : rawAmount / 100
}

/**
 * Converts a human-readable unit amount to the Polar API amount integer.
 * For zero-decimal currencies, Math.round(unitAmount).
 * For standard currencies, Math.round(unitAmount * 100).
 */
export function toPolarApiAmount(
  unitAmount: number | null | undefined,
  currency?: string | null
): number {
  if (unitAmount == null) return 0
  const curr = (currency || 'USD').toUpperCase()
  const mult = isZeroDecimalCurrency(curr) ? 1 : 100
  return Math.round(unitAmount * mult)
}

/**
 * Formats a Polar price object or raw amount into a localized currency string.
 */
export function formatPolarPrice(
  price: any,
  productRecurringInterval?: string | null,
  locale?: string
): string {
  if (!price) return 'Free'

  if (price.amountType === 'free') return 'Free'

  const rawAmount = price.priceAmount ?? price.price_amount ?? price.amount ?? 0

  if (rawAmount === 0 && price.amountType !== 'custom') {
    return 'Free'
  }

  const curr = (
    price.priceCurrency ??
    price.price_currency ??
    price.currency ??
    'USD'
  ).toUpperCase()

  const unitAmount = getPolarUnitAmount(rawAmount, curr)
  const isZeroDec = isZeroDecimalCurrency(curr)

  const interval =
    price.recurringInterval ??
    price.recurring_interval ??
    productRecurringInterval

  const intervalText = interval ? ` / ${interval}` : ''
  const targetLocale = locale || (curr === 'VND' ? 'vi-VN' : 'en-US')

  try {
    const formatted = new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: isZeroDec ? 0 : 2,
      minimumFractionDigits: isZeroDec ? 0 : 2,
    }).format(unitAmount)

    return `${formatted}${intervalText}`
  } catch {
    return `${unitAmount.toLocaleString()} ${curr}${intervalText}`
  }
}
