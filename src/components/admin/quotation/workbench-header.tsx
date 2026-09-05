import Link from 'next/link'

export function WorkbenchHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <header className="space-y-6">
    <nav aria-label="报价工作台" className="flex flex-wrap gap-2 border-b pb-4 text-sm">
      {[['/admin/sales-quotations', '报价单'], ['/admin/quotation-products', '常用产品'], ['/admin/quotation-settings', '报价设置']].map(([href, name]) => <Link key={href} href={href} className="rounded-full px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">{name}</Link>)}
    </nav>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold tracking-[.22em] text-teal-700">LAIFAPPE / QUOTATION STUDIO</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}</div>{children}</div>
  </header>
}
