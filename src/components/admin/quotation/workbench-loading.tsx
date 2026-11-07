import { cn } from '@/lib/utils'

export function WorkbenchLoading({ label, variant = 'table' }: {
  label: string
  variant?: 'table' | 'cards' | 'form'
}) {
  return (
    <section aria-busy="true" aria-label={`正在加载${label}`} data-workbench-loading className="space-y-8">
      <p role="status" className="text-sm text-slate-500">正在加载{label}…</p>
      <div aria-hidden="true" className="space-y-8 motion-safe:animate-pulse">
        <div className="space-y-3">
          <div className="h-3 w-48 rounded bg-slate-200" />
          <div className="h-9 w-36 rounded bg-slate-200" />
          <div className="h-4 w-full max-w-sm rounded bg-slate-100" />
        </div>
        <div className="h-11 w-full max-w-xl rounded-lg bg-slate-200" />
        <div className={cn(
          variant === 'cards' ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'overflow-hidden rounded-2xl border bg-white',
        )}>
          {Array.from({ length: variant === 'form' ? 4 : 6 }, (_, index) => (
            <div key={index} className={cn(
              variant === 'cards'
                ? 'h-72 rounded-2xl border bg-white'
                : 'flex gap-6 border-b p-5 last:border-b-0',
            )}>
              {variant === 'cards' ? (
                <><div className="h-48 rounded-t-2xl bg-slate-100" /><div className="m-5 h-5 w-2/3 rounded bg-slate-200" /></>
              ) : (
                <><div className="h-5 w-1/3 rounded bg-slate-100" /><div className="h-5 w-1/2 rounded bg-slate-100" /></>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
