export function WorkbenchHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <header className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold tracking-[.22em] text-teal-700">LAIFAPPE / QUOTATION STUDIO</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-2 text-sm text-slate-500">{description}</p>}</div>{children}</div>
  </header>
}
