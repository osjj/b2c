'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { ChevronDown, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { calculateAllocation, FOOTWEAR_SYSTEMS, MAX_INPUT_ROWS, type AllocationInputRow } from '@/lib/footwear-size-allocation'
import { parseAllocationText, readAllocationFile, type AllocationImportResult, type ImportDefaults } from '@/lib/footwear-size-allocation-files'
import { SystemSelect } from './allocation-input-table'
import styles from './allocation.module.css'

interface AllocationImportProps {
  existingRows: number
  onApply: (rows: AllocationInputRow[]) => void
  onSourceChange: () => void
  onDownloadTemplate: () => void
  templateBusy: boolean
}

interface ImportPreview {
  name: string
  result: AllocationImportResult
}

export function AllocationImport({ existingRows, onApply, onSourceChange, onDownloadTemplate, templateBusy }: AllocationImportProps) {
  const [defaults, setDefaults] = useState<ImportDefaults>({ model: '', color: '', system: 'eu' })
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [reading, setReading] = useState(false)
  const revision = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)

  function invalidatePreview() {
    revision.current += 1
    setPreview(null)
    onSourceChange()
  }

  function updateDefaults(patch: Partial<ImportDefaults>) {
    invalidatePreview()
    setDefaults(previous => ({ ...previous, ...patch }))
  }

  function previewText() {
    invalidatePreview()
    try {
      setPreview({ name: 'Pasted size counts', result: parseAllocationText(text, defaults) })
    } catch {
      setPreview({ name: 'Pasted size counts', result: { rows: [], errors: ['This text could not be read. Check the CSV or tab-separated format and try again.'] } })
    }
  }

  async function previewFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    invalidatePreview()
    const currentRevision = revision.current
    setReading(true)
    try {
      const result = await readAllocationFile(file, defaults)
      if (currentRevision === revision.current) setPreview({ name: file.name, result })
    } catch {
      if (currentRevision === revision.current) setPreview({ name: file.name, result: { rows: [], errors: ['This file could not be read. Save a new CSV or XLSX file and try again.'] } })
    } finally {
      setReading(false)
      event.target.value = ''
    }
  }

  const validation = preview ? calculateAllocation(preview.result.rows, '0') : null
  const previewErrors = preview ? [
    ...preview.result.errors,
    ...(preview.result.errors.length === 0 ? validation?.errors.map(error => error.message) ?? [] : []),
    ...(preview.result.rows.length === 0 && preview.result.errors.length === 0 ? ['No size rows found. Add a size and quantity for at least one row.'] : []),
  ] : []
  const canApply = preview !== null && previewErrors.length === 0 && preview.result.rows.length > 0 && validation?.valid === true && !reading

  return (
    <details className={styles.importPanel}>
      <summary><span><Upload size={17} aria-hidden="true" /> Paste or import a size list</span><ChevronDown size={17} aria-hidden="true" /></summary>
      <div className={styles.importBody}>
        <div className={styles.importIntro}>
          <p>Use CSV, tab-separated text, or an Excel workbook. Only <strong>size</strong> and <strong>quantity</strong> are required. Optional columns: model, color, system.</p>
          <button type="button" className={styles.textButton} onClick={onDownloadTemplate} disabled={templateBusy}><Download size={16} aria-hidden="true" /> {templateBusy ? 'Preparing…' : 'Download XLSX template'}</button>
        </div>

        <fieldset className={styles.defaults} disabled={reading}>
          <legend>Defaults for missing optional values</legend>
          <div className={styles.defaultFields}>
            <label htmlFor="import-model">Model / reference<input id="import-model" maxLength={64} value={defaults.model} placeholder="Optional" onChange={event => updateDefaults({ model: event.target.value })} /></label>
            <label htmlFor="import-color">Color<input id="import-color" maxLength={32} value={defaults.color} placeholder="Optional" onChange={event => updateDefaults({ color: event.target.value })} /></label>
            <label htmlFor="import-system">Size system<SystemSelect id="import-system" label="Default import size system" value={defaults.system} onChange={system => updateDefaults({ system })} /></label>
          </div>
        </fieldset>

        <label className={styles.pasteLabel} htmlFor="allocation-paste">Paste size counts</label>
        <textarea id="allocation-paste" value={text} disabled={reading} onChange={event => { invalidatePreview(); setText(event.target.value) }} placeholder={'size,quantity\n42,10\n43,8'} aria-describedby="import-format-help" spellCheck={false} />
        <p id="import-format-help" className={styles.help}>A two-column size / quantity list also works. Use a system column to mix systems. XLSX reads the first worksheet only; formula cells are rejected. Up to {MAX_INPUT_ROWS} rows, 2 MiB per file.</p>
        <div className={styles.importActions}>
          <button type="button" className={styles.secondaryButton} disabled={!text.trim() || reading} onClick={previewText}>Preview pasted rows</button>
          <span className={styles.or}>or</span>
          <input ref={fileInput} type="file" accept=".csv,.xlsx" className={styles.srOnly} tabIndex={-1} aria-label="Import CSV or XLSX file" disabled={reading} onChange={previewFile} />
          <button type="button" className={styles.secondaryButton} disabled={reading} onClick={() => fileInput.current?.click()}><FileSpreadsheet size={17} aria-hidden="true" /> {reading ? 'Reading file…' : 'Choose CSV / XLSX'}</button>
        </div>

        {preview && (
          <section className={styles.preview} aria-labelledby="import-preview-title">
            <div className={styles.previewHeader}><h3 id="import-preview-title">Import preview</h3><span>{preview.name}</span></div>
            {previewErrors.length > 0 ? (
              <div className={styles.errorBox} role="alert"><strong>Import needs attention. Your current size list is unchanged.</strong><ul>{previewErrors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>
            ) : (
              <p className={styles.previewReady}>{preview.result.rows.length} rows ready. Review the values below, then apply them to your list.</p>
            )}
            {preview.result.rows.length > 0 && (
              <div className={`${styles.tableScroll} ${styles.previewScroll}`} role="region" aria-label="Import preview rows" tabIndex={0}>
                <table className={styles.previewTable}><caption className={styles.srOnly}>Imported values awaiting explicit approval</caption><thead><tr><th scope="col">Model / reference</th><th scope="col">Color</th><th scope="col">System</th><th scope="col">Size</th><th scope="col">Pairs</th></tr></thead>
                  <tbody>{preview.result.rows.map((row, index) => <tr key={`${row.id}-${index}`}><td>{row.model || '—'}</td><td>{row.color || '—'}</td><td>{FOOTWEAR_SYSTEMS.find(system => system.value === row.system)?.label ?? row.system}</td><td>{row.size}</td><td>{row.quantity}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            <div className={styles.applyRow}>
              <p>{existingRows > 0 ? `Applying replaces all ${existingRows} current input rows and clears manual adjustments.` : 'Nothing changes until you apply this preview.'}</p>
              <button type="button" className={styles.primaryButton} disabled={!canApply} onClick={() => {
                if (!canApply || !preview) return
                onApply(preview.result.rows)
                setPreview(null)
              }}>{existingRows > 0 ? 'Replace size list' : 'Apply imported rows'}</button>
            </div>
          </section>
        )}
      </div>
    </details>
  )
}
