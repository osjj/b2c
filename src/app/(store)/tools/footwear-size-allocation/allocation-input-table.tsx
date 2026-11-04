'use client'

import { Plus, Trash2 } from 'lucide-react'
import { FOOTWEAR_SYSTEMS, MAX_INPUT_ROWS, type AllocationInputRow, type AllocationIssue, type FootwearSizeSystem } from '@/lib/footwear-size-allocation'
import styles from './allocation.module.css'

interface SystemSelectProps {
  id?: string
  label: string
  value: FootwearSizeSystem
  onChange: (value: FootwearSizeSystem) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

export function SystemSelect({ id, label, value, onChange, disabled, invalid, describedBy }: SystemSelectProps) {
  return (
    <select id={id} aria-label={label} value={value} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={describedBy}
      onChange={event => {
        const system = FOOTWEAR_SYSTEMS.find(item => item.value === event.target.value)
        if (system) onChange(system.value)
      }}>
      {FOOTWEAR_SYSTEMS.map(system => <option key={system.value} value={system.value}>{system.label}</option>)}
    </select>
  )
}

interface AllocationInputTableProps {
  rows: AllocationInputRow[]
  errors: AllocationIssue[]
  onEdit: (id: string, patch: Partial<Pick<AllocationInputRow, 'model' | 'color' | 'system' | 'size' | 'quantity'>>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function AllocationInputTable({ rows, errors, onEdit, onAdd, onRemove }: AllocationInputTableProps) {
  return (
    <>
      {rows.length === 0 ? (
        <div className={styles.emptyInput}>
          <div className={styles.emptyGrid} aria-hidden="true"><span>SIZE</span><span>PAIRS</span><span>—</span><span>—</span></div>
          <h3>Start with your size counts</h3>
          <p>Add a row for each size, or open the import panel to paste a spreadsheet. You only need size and quantity.</p>
          <button type="button" className={styles.primaryButton} onClick={onAdd}><Plus size={17} aria-hidden="true" /> Add first row</button>
        </div>
      ) : (
        <div className={styles.tableScroll} role="region" aria-label="Editable footwear size counts" tabIndex={0}>
          <table className={styles.inputTable}>
            <caption className={styles.srOnly}>Enter a model, color, size system, size and quantity in pairs for each row.</caption>
            <thead><tr><th scope="col">#</th><th scope="col">Model / reference <span>Optional</span></th><th scope="col">Color <span>Optional</span></th><th scope="col">Size system</th><th scope="col">Size</th><th scope="col">Quantity <span>Pairs</span></th><th scope="col"><span className={styles.srOnly}>Remove</span></th></tr></thead>
            <tbody>{rows.map((row, index) => {
              const rowErrors = errors.filter(error => error.rowId === row.id)
              const errorId = `input-errors-${row.id}`
              const describedBy = rowErrors.length ? errorId : undefined
              return (
                <tr key={row.id} id={`input-row-${row.id}`} className={rowErrors.length ? styles.invalidRow : undefined}>
                  <th scope="row" className={styles.rowNumber}>{index + 1}</th>
                  <td><input aria-label={`Row ${index + 1} model or reference`} value={row.model} placeholder="e.g. Boot A" maxLength={64} onChange={event => onEdit(row.id, { model: event.target.value })} aria-invalid={rowErrors.length > 0 || undefined} aria-describedby={describedBy} /></td>
                  <td><input aria-label={`Row ${index + 1} color`} value={row.color} placeholder="e.g. Black" maxLength={32} onChange={event => onEdit(row.id, { color: event.target.value })} aria-invalid={rowErrors.length > 0 || undefined} aria-describedby={describedBy} /></td>
                  <td><SystemSelect label={`Row ${index + 1} size system`} value={row.system} onChange={system => onEdit(row.id, { system })} invalid={rowErrors.length > 0} describedBy={describedBy} /></td>
                  <td><input aria-label={`Row ${index + 1} size`} value={row.size} inputMode="decimal" placeholder="42" onChange={event => onEdit(row.id, { size: event.target.value })} aria-invalid={rowErrors.length > 0 || undefined} aria-describedby={describedBy} /></td>
                  <td><input aria-label={`Row ${index + 1} quantity in pairs`} value={row.quantity} inputMode="numeric" placeholder="10" onChange={event => onEdit(row.id, { quantity: event.target.value })} aria-invalid={rowErrors.length > 0 || undefined} aria-describedby={describedBy} />
                    {rowErrors.length > 0 && <ul id={errorId} className={styles.rowErrors}>{rowErrors.map((error, issueIndex) => <li key={issueIndex}>{error.message}</li>)}</ul>}
                  </td>
                  <td><button type="button" className={styles.iconButton} aria-label={`Remove row ${index + 1}`} onClick={() => onRemove(row.id)}><Trash2 size={17} aria-hidden="true" /></button></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      <div className={styles.tableFooter}>
        {rows.length > 0 && <button type="button" className={styles.secondaryButton} onClick={onAdd} disabled={rows.length >= MAX_INPUT_ROWS}><Plus size={16} aria-hidden="true" /> Add row</button>}
        <p>{rows.length.toLocaleString('en-US')} / {MAX_INPUT_ROWS} rows · Whole pairs only · Sizes in half steps</p>
      </div>
    </>
  )
}
