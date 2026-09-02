const FORBIDDEN_CUSTOMER_KEYS = new Set([
  'unitCost',
  'lineCost',
  'totalCost',
  'costCurrency',
  'exchangeRate',
  'profit',
  'profitMarginPercent',
  'supplierName',
  'supplierUrl',
  'sourceUrl',
  'internalNotes',
  'objectKey',
  'storageKey',
  'audit',
])

export function containsForbiddenCustomerKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenCustomerKey)
  if (!value || typeof value !== 'object') return false

  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_CUSTOMER_KEYS.has(key) || containsForbiddenCustomerKey(child)
  ))
}

export function assertCustomerProjectionSafe(value: unknown): void {
  if (containsForbiddenCustomerKey(value)) {
    throw new Error('Customer document contains an internal-only field')
  }
}
