'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import { calculateAllocation, MAX_INPUT_ROWS, type AllocationInputRow } from '@/lib/footwear-size-allocation'
import { buildAllocationTemplate, buildAllocationWorkbook } from '@/lib/footwear-size-allocation-files'
import { saveFootwearInquiry } from '@/lib/footwear-size-inquiry'
import theme from '../tools-theme.module.css'
import styles from './allocation.module.css'
import { AllocationInputTable } from './allocation-input-table'
import { AllocationImport } from './allocation-import'
import { AllocationResults } from './allocation-results'

function downloadWorkbook(bytes: Uint8Array, name: string) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function AllocationWorkbench() {
  const router = useRouter()
  const [rows, setRows] = useState<AllocationInputRow[]>([])
  const [sparePercent, setSparePercent] = useState('0')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [importVersion, setImportVersion] = useState(0)
  const [busy, setBusy] = useState<'export' | 'template' | null>(null)
  const [actionError, setActionError] = useState('')
  const [status, setStatus] = useState('')
  const nextRowId = useRef(0)
  const planRevision = useRef(0)
  const plan = useMemo(() => calculateAllocation(rows, sparePercent, overrides), [rows, sparePercent, overrides])
  const hasRows = rows.length > 0

  function clearActionFeedback() {
    setActionError('')
    setStatus('')
  }

  function clearAdjustments() {
    planRevision.current += 1
    setOverrides({})
    clearActionFeedback()
  }

  function newRow(values: Partial<Omit<AllocationInputRow, 'id'>> = {}): AllocationInputRow {
    nextRowId.current += 1
    return { id: `allocation-${nextRowId.current}`, model: values.model ?? '', color: values.color ?? '', system: values.system ?? 'eu', size: values.size ?? '', quantity: values.quantity ?? '' }
  }

  function addRow() {
    if (rows.length >= MAX_INPUT_ROWS) return
    clearAdjustments()
    const row = newRow()
    setRows(previous => [...previous, row])
  }

  function editRow(id: string, patch: Partial<Pick<AllocationInputRow, 'model' | 'color' | 'system' | 'size' | 'quantity'>>) {
    clearAdjustments()
    setRows(previous => previous.map(row => row.id === id ? { ...row, ...patch } : row))
  }

  function loadExample() {
    clearAdjustments()
    setRows([
      newRow({ model: 'Boot A', color: 'Black', size: '42', quantity: '10' }),
      newRow({ model: 'Boot A', color: 'Black', size: '42', quantity: '5' }),
      newRow({ model: 'Boot A', color: 'Black', size: '43', quantity: '8' }),
    ])
    setSparePercent('10')
    setImportVersion(value => value + 1)
    setStatus('Example loaded: the two EU 42 rows combine into 15 base pairs, plus 2 suggested spare pairs.')
  }

  function reset() {
    clearAdjustments()
    setRows([])
    setSparePercent('0')
    setImportVersion(value => value + 1)
    setStatus('Size list cleared. Start a new plan below.')
  }

  async function exportPlan() {
    if (!plan.valid || plan.rows.length === 0 || busy) return
    setBusy('export')
    setActionError('')
    setStatus('')
    const exportRevision = planRevision.current
    try {
      const workbook = await buildAllocationWorkbook(plan)
      if (!workbook) throw new Error('This order could not be exported. Review your size counts and final quantities, then try again.')
      if (exportRevision !== planRevision.current) throw new Error('Your plan changed while Excel was being prepared. Export again to use the latest final quantities.')
      downloadWorkbook(workbook, 'footwear-size-allocation.xlsx')
      setStatus('Excel download prepared with your final order quantities.')
    } catch (error) {
      setActionError(errorMessage(error, 'Excel export failed. Your plan is unchanged; please try again.'))
    } finally {
      setBusy(null)
    }
  }

  async function downloadTemplate() {
    if (busy) return
    setBusy('template')
    setActionError('')
    try {
      downloadWorkbook(await buildAllocationTemplate(), 'footwear-size-allocation-template.xlsx')
      setStatus('Template download prepared. Replace the sample rows with your own size counts before importing.')
    } catch (error) {
      setActionError(errorMessage(error, 'The template could not be downloaded. Please try again, or paste size and quantity columns.'))
    } finally {
      setBusy(null)
    }
  }

  function prepareInquiry() {
    if (!plan.valid || plan.rows.length === 0 || busy) return
    setActionError('')
    try {
      router.push(saveFootwearInquiry(plan))
    } catch (error) {
      setActionError(errorMessage(error, 'The RFQ could not be prepared in this browser. Export Excel and attach the plan to a normal quote request.'))
    }
  }

  const percentText = sparePercent.trim()
  const invalidSparePercent = !/^\d+(?:\.\d{1,2})?$/.test(percentText) || Number(percentText) > 100
  const showErrors = plan.errors.length > 0 && (hasRows || invalidSparePercent)

  return (
    <div className={styles.workbench}>
      <section data-tool-panel className={`${theme.panel} ${styles.inputPanel}`} aria-labelledby="allocation-input-title">
        <div className={styles.panelHeading}>
          <div className={styles.headingGroup}><span className={styles.step}>01</span><div><p className={styles.eyebrow}>Enter your demand</p><h2 id="allocation-input-title">Build your size list</h2></div></div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.textButton} onClick={loadExample}>Load example</button>
            <button type="button" className={styles.textButton} onClick={reset}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
          </div>
        </div>
        <p className={styles.panelDescription}>Enter one line per size count. Model and color help keep different products separate. No employee details are needed.</p>

        <AllocationImport key={importVersion} existingRows={rows.length} onSourceChange={clearActionFeedback} onDownloadTemplate={downloadTemplate} templateBusy={busy === 'template'} onApply={importedRows => {
          clearAdjustments()
          setRows(importedRows.map(row => newRow(row)))
          setStatus(`${importedRows.length} imported rows applied. Review your size list and order below.`)
        }} />

        <AllocationInputTable rows={rows} errors={plan.errors} onEdit={editRow} onAdd={addRow} onRemove={id => {
          clearAdjustments()
          setRows(previous => previous.filter(row => row.id !== id))
        }} />

        <div className={styles.spareRow}>
          <div><label htmlFor="spare-percent">Spare pairs allowance</label><p>Applied to each grouped size, then rounded up to whole pairs.</p></div>
          <div className={styles.percentField}><input id="spare-percent" value={sparePercent} inputMode="decimal" aria-describedby={invalidSparePercent ? 'spare-help allocation-errors' : 'spare-help'} aria-invalid={invalidSparePercent || undefined} onChange={event => { clearAdjustments(); setSparePercent(event.target.value) }} /><span aria-hidden="true">%</span></div>
          <p id="spare-help" className={styles.help}>0–100% · Up to 2 decimal places</p>
        </div>

        {showErrors && <div id="allocation-errors" className={styles.errorBox} role="alert"><div className={styles.errorTitle}><AlertCircle size={17} aria-hidden="true" /><strong>Review these entries to use your order plan.</strong></div><ul>{plan.errors.map((error, index) => {
          const rowIndex = rows.findIndex(row => row.id === error.rowId)
          return <li key={index}>{rowIndex >= 0 ? `Input row ${rowIndex + 1}: ` : ''}{error.message}</li>
        })}</ul></div>}
      </section>

      <AllocationResults plan={plan} overrides={overrides} exporting={busy === 'export'} onOverride={(key, value) => {
        planRevision.current += 1
        setOverrides(previous => ({ ...previous, [key]: value }))
        setActionError('')
        setStatus('')
      }} onExport={exportPlan} onInquiry={prepareInquiry} />

      {actionError && <div className={styles.errorBox} role="alert"><strong>{actionError}</strong><p>Your size list is retained. You can continue editing it here.</p></div>}
      <p className={styles.liveStatus} role="status" aria-live="polite">{status}</p>
      <div className={styles.privacyNote}><ShieldCheck size={17} aria-hidden="true" /><p>Files are processed locally in your browser. Only your grouped final plan is carried into the RFQ form when you choose Prepare RFQ.</p></div>
    </div>
  )
}
