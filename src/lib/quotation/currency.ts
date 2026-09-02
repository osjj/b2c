export function currencyMinorUnit(currency: string): number {
  const normalized = currency.toUpperCase()
  if (['BHD', 'JOD', 'KWD', 'OMR', 'TND'].includes(normalized)) return 3
  if (['CLP', 'JPY', 'KRW', 'VND'].includes(normalized)) return 0
  return 2
}
