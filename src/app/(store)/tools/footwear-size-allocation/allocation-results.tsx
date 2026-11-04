'use client'

import { ArrowRight, Check, Download, PackageCheck } from 'lucide-react'
import { FOOTWEAR_SYSTEMS, type AllocationPlan } from '@/lib/footwear-size-allocation'
import theme from '../tools-theme.module.css'
import styles from './allocation.module.css'

interface AllocationResultsProps {
  plan: AllocationPlan
  overrides: Record<string, string>
  onOverride: (key: string, value: string) => void
  onExport: () => void
  onInquiry: () => void
  exporting: boolean
}

function count(value: number) { return value.toLocaleString('en-US') }

export function AllocationResults({ plan, overrides, onOverride, onExport, onInquiry, exporting }: AllocationResultsProps) {
  const usable = plan.valid && plan.rows.length > 0
  const adjusted = plan.rows.filter(row => row.overridden).length

  return (
    <section data-tool-results className={`${theme.results} ${styles.resultPanel}`} aria-labelledby="allocation-results-title">
      <div className={styles.panelHeading}>
        <div className={styles.headingGroup}><span className={styles.step}>02</span><div><p className={styles.eyebrow}>Review your order</p><h2 id="allocation-results-title">The final size breakdown</h2></div></div>
        <span className={`${styles.statusBadge} ${usable ? styles.readyBadge : ''}`}>{usable ? <><Check size={14} aria-hidden="true" /> Ready to review</> : 'Awaiting valid counts'}</span>
      </div>

      <div className={styles.summary} aria-label="Order totals">
        <div><span>Base demand</span><strong>{usable ? count(plan.totals.workers) : '—'}</strong><span>pairs requested</span></div>
        <div><span>Final spare pairs</span><strong>{usable ? count(plan.totals.spares) : '—'}</strong><span>above base demand</span></div>
        <div className={styles.orderTotal}><span>Final order</span><strong>{usable ? count(plan.totals.order) : '—'}</strong><span>pairs to purchase</span></div>
      </div>

      {plan.rows.length > 0 ? (
        <>
          <p className={styles.resultHelp}>Duplicates are combined before spare pairs are rounded up. Enter a final quantity to adjust a line; leave it blank to use the recommendation.</p>
          <div className={styles.tableScroll} role="region" aria-label="Grouped footwear order with editable final quantities" tabIndex={0}>
            <table className={styles.resultTable}>
              <caption className={styles.srOnly}>Grouped order quantities in pairs. Final order must be at least base demand.</caption>
              <thead><tr><th scope="col">Model / color</th><th scope="col">System / size</th><th scope="col">Base</th><th scope="col">Suggested<br />spares</th><th scope="col">Recommended<br />order</th><th scope="col">Final order <span>Pairs · editable</span></th></tr></thead>
              <tbody>{plan.rows.map((row, index) => {
                const rowErrors = plan.errors.filter(error => error.rowId === row.key)
                const errorId = `override-error-${index}`
                return <tr key={row.key} className={row.overridden ? styles.adjustedRow : undefined}>
                  <th scope="row"><strong>{row.model || 'No model specified'}</strong><span>{row.color || 'No color specified'}</span></th>
                  <td><span>{FOOTWEAR_SYSTEMS.find(system => system.value === row.system)?.label ?? row.system}</span><strong className={styles.sizeValue}>{row.size}</strong></td>
                  <td>{count(row.quantity)}</td><td>+{count(row.spares)}</td><td>{count(row.suggestedQuantity)}</td>
                  <td><label className={styles.srOnly} htmlFor={`final-order-${index}`}>Final order for {row.model || 'unspecified model'}, {row.color || 'unspecified color'}, {row.system} size {row.size}</label>
                    <input id={`final-order-${index}`} value={overrides[row.key] ?? ''} placeholder={String(row.suggestedQuantity)} inputMode="numeric" onChange={event => onOverride(row.key, event.target.value)} aria-invalid={rowErrors.length > 0 || undefined} aria-describedby={rowErrors.length ? errorId : undefined} />
                    {rowErrors.length > 0 ? <ul id={errorId} className={styles.rowErrors}>{rowErrors.map((error, issueIndex) => <li key={issueIndex}>{error.message}</li>)}</ul> : <span className={styles.overrideState}>{row.overridden ? `Adjusted · ${count(row.orderQuantity)} pairs` : `${count(row.orderQuantity)} pairs · recommended`}</span>}
                  </td>
                </tr>
              })}</tbody>
              <tfoot><tr><th scope="row" colSpan={2}>Total pairs</th><td>{usable ? count(plan.totals.workers) : '—'}</td><td>{usable ? `+${count(plan.rows.reduce((total, row) => total + row.spares, 0))}` : '—'}</td><td>{usable ? count(plan.rows.reduce((total, row) => total + row.suggestedQuantity, 0)) : '—'}</td><td>{usable ? count(plan.totals.order) : '—'}</td></tr></tfoot>
            </table>
          </div>
          <p className={styles.adjustmentNote}>{adjusted > 0 ? `${adjusted} line${adjusted === 1 ? ' has' : 's have'} a manual adjustment. ` : ''}Applying an imported list, editing input rows or changing the spare percentage clears manual adjustments. Previewing an import keeps your current order unchanged.</p>
        </>
      ) : (
        <div className={styles.emptyResult}><PackageCheck size={28} aria-hidden="true" /><p>Your grouped order will appear here.</p><span>Add valid size counts to see base demand, spare pairs and final quantities.</span></div>
      )}

      <div className={styles.exportRow}>
        <div><p className={styles.eyebrow}>03 · Take the next step</p><h3>Use this exact final order</h3><p>Excel and RFQ include the final quantities shown above. Review the inquiry before sending.</p></div>
        <div className={styles.exportActions}>
          <button type="button" className={styles.secondaryButton} onClick={onExport} disabled={!usable || exporting}><Download size={17} aria-hidden="true" /> {exporting ? 'Preparing Excel…' : 'Export Excel'}</button>
          <button type="button" className={styles.primaryButton} onClick={onInquiry} disabled={!usable || exporting}>Prepare RFQ <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
      </div>
      <p className={styles.fitNote}>Confirm the selected model’s size chart, width and sample fit with the supplier before placing a bulk order. No sizes are converted between systems.</p>
    </section>
  )
}
