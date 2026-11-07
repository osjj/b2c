export const WORKBENCH_DESTINATIONS = [
  { href: '/admin/sales-quotations', label: '报价单' },
  { href: '/admin/business-customers', label: '客户列表' },
  { href: '/admin/quotation-products', label: '常用产品' },
  { href: '/admin/quotation-settings', label: '报价设置' },
] as const

export function getWorkbenchDestination(pathname: string | null) {
  if (pathname === '/admin/quotation-workbench') return '/admin/sales-quotations'

  return WORKBENCH_DESTINATIONS.find(({ href }) => (
    pathname === href || pathname?.startsWith(`${href}/`)
  ))?.href ?? null
}
