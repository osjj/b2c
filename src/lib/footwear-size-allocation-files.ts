import type { CellValue, Worksheet } from 'exceljs'

import { calculateAllocation, FOOTWEAR_SYSTEMS, MAX_FILE_BYTES, MAX_INPUT_ROWS } from './footwear-size-allocation'
import type { AllocationInputRow, AllocationPlan, FootwearSizeSystem } from './footwear-size-allocation'

export type ImportDefaults = { model: string; color: string; system: FootwearSizeSystem }
export type AllocationImportResult = { rows: AllocationInputRow[]; errors: string[] }

type ImportColumn = 'model' | 'color' | 'system' | 'size' | 'quantity'
type SourceRow = { cells: string[]; line: number }

const HEADER_ALIASES: Record<string, ImportColumn> = {
  model: 'model', reference: 'model', modelreference: 'model', 'model/reference': 'model', 型号: 'model',
  color: 'color', colour: 'color', 颜色: 'color',
  system: 'system', sizesystem: 'system', 尺码制式: 'system',
  size: 'size', 尺码: 'size',
  quantity: 'quantity', qty: 'quantity', pairs: 'quantity', 数量: 'quantity',
}

function failure(message: string): AllocationImportResult {
  return { rows: [], errors: [message] }
}

function headerColumn(value: string): ImportColumn | undefined {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  return Object.hasOwn(HEADER_ALIASES, normalized) ? HEADER_ALIASES[normalized] : undefined
}

function importSystem(value: string): FootwearSizeSystem | undefined {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  return FOOTWEAR_SYSTEMS.find((system) => system.value.toLowerCase() === normalized)?.value
}

function parseSourceRows(sourceRows: SourceRow[], defaults: ImportDefaults): AllocationImportResult {
  const nonblank = sourceRows.filter(({ cells }) => cells.some((cell) => cell.trim()))
  const first = nonblank[0]
  if (!first) return failure('Add size and quantity rows before importing.')
  const header = first.cells.map(headerColumn)
  const hasHeader = header.some(Boolean)
  let columns: ImportColumn[] = ['size', 'quantity']
  if (hasHeader) {
    const errors: string[] = []
    const knownColumns: ImportColumn[] = []
    for (const [index, column] of header.entries()) {
      if (!column) errors.push(`Header column ${index + 1} is not recognized. Use model, color, system, size and quantity.`)
      else if (knownColumns.includes(column)) errors.push(`Header is ambiguous: ${column} appears more than once.`)
      else knownColumns.push(column)
    }
    if (!knownColumns.includes('size') || !knownColumns.includes('quantity')) errors.push('Include both size and quantity columns.')
    if (errors.length) return { rows: [], errors }
    columns = knownColumns
  } else if (first.cells.length !== 2) {
    return failure('For data without headers, provide exactly two columns: size and quantity. Add headers for model, color or system.')
  }

  const dataRows = hasHeader ? nonblank.slice(1) : nonblank
  if (dataRows.length > MAX_INPUT_ROWS) return failure(`Import no more than ${MAX_INPUT_ROWS} data rows.`)
  const rows: AllocationInputRow[] = []
  const errors: string[] = []
  for (const { cells, line } of dataRows) {
    if (cells.length !== columns.length) {
      errors.push(`Row ${line}: expected ${columns.length} columns but found ${cells.length}. Check delimiters and missing cells.`)
      continue
    }
    if (cells.some((value) => /^\s*=/.test(value))) {
      errors.push(`Row ${line}: formula text is not accepted. Paste the calculated values instead.`)
      continue
    }
    const values = new Map(columns.map((column, index) => [column, cells[index]?.trim() ?? '']))
    const rawSystem = values.get('system') || defaults.system
    const system = importSystem(rawSystem)
    if (!system) {
      errors.push(`Row ${line}: unsupported or ambiguous size system "${rawSystem}". Use EU, UK, US Men, US Women, CN or JP.`)
      continue
    }
    rows.push({ id: `import-row-${line}`, model: values.get('model') || defaults.model.trim(), color: values.get('color') || defaults.color.trim(), system, size: values.get('size') ?? '', quantity: values.get('quantity') ?? '' })
  }

  const checked = calculateAllocation(rows, '0')
  for (const issue of checked.errors) {
    const line = issue.rowId?.replace('import-row-', '')
    errors.push(line ? `Row ${line}: ${issue.message}` : issue.message)
  }
  if (errors.length) return { rows: [], errors }
  return { rows: rows.map((row) => ({ ...row, size: String(Number(row.size.replace(',', '.'))), quantity: String(Number(row.quantity)) })), errors: [] }
}

function delimitedRows(text: string): { rows: SourceRow[]; error?: string } {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const delimiterSource = normalized.trimStart()
  let insideQuotes = false
  let delimiter = ','
  for (let i = 0; i < delimiterSource.length; i++) {
    const character = delimiterSource[i]
    if (character === '"') insideQuotes = !insideQuotes
    if (!insideQuotes && character === '\t') { delimiter = '\t'; break }
    if (!insideQuotes && character === '\n') break
  }

  const rows: SourceRow[] = []
  let cells: string[] = []
  let field = ''
  let isQuoted = false
  let afterQuote = false
  let line = 1
  let rowLine = 1
  for (let i = 0; i < normalized.length; i++) {
    const character = normalized[i]
    if (isQuoted) {
      if (character === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++ }
        else { isQuoted = false; afterQuote = true }
      } else {
        field += character
        if (character === '\n') line++
      }
      continue
    }
    if (character === delimiter || character === '\n') {
      cells.push(field)
      field = ''
      afterQuote = false
      if (character === '\n') {
        if (cells.some((cell) => cell.trim())) rows.push({ cells, line: rowLine })
        cells = []
        line++
        rowLine = line
      }
    } else if (character === '"' && !field && !afterQuote) {
      isQuoted = true
    } else if (character === '"' || (afterQuote && character?.trim())) {
      return { rows: [], error: `Row ${line}: malformed quoted cell. Wrap the complete cell in quotes and double any embedded quotes.` }
    } else if (!afterQuote) {
      field += character
    }
    if (rows.length > MAX_INPUT_ROWS + 1) return { rows: [], error: `Import no more than ${MAX_INPUT_ROWS} data rows.` }
  }
  if (isQuoted) return { rows: [], error: `Row ${rowLine}: quoted cell is not closed.` }
  if (field || cells.length || afterQuote) rows.push({ cells: [...cells, field], line: rowLine })
  return { rows }
}

export function parseAllocationText(text: string, defaults: ImportDefaults): AllocationImportResult {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) return failure('Import text must be no larger than 2 MiB.')
  const parsed = delimitedRows(text)
  return parsed.error ? failure(parsed.error) : parseSourceRows(parsed.rows, defaults)
}

function spreadsheetText(value: CellValue): { text: string; error?: string } {
  if (value === null || value === undefined) return { text: '' }
  if (typeof value === 'string') return { text: value }
  if (typeof value === 'number') return { text: String(value) }
  if (typeof value === 'object' && 'formula' in value) return { text: '', error: 'formula cells are not accepted. Save calculated values instead.' }
  if (typeof value === 'object' && 'sharedFormula' in value) return { text: '', error: 'formula cells are not accepted. Save calculated values instead.' }
  if (typeof value === 'object' && 'error' in value) return { text: '', error: 'spreadsheet error cells are not accepted. Correct the cell before importing.' }
  if (typeof value === 'object' && 'richText' in value) return { text: value.richText.map((part) => part.text).join('') }
  if (typeof value === 'object' && 'hyperlink' in value) return { text: value.text }
  return { text: '', error: 'use only text or numeric cell values; dates and logical values are not accepted.' }
}

export async function readAllocationFile(file: { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> }, defaults: ImportDefaults): Promise<AllocationImportResult> {
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_FILE_BYTES) return failure('Choose a CSV or XLSX file no larger than 2 MiB.')
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension !== 'csv' && extension !== 'xlsx') return failure('Choose a .csv or .xlsx file. Other spreadsheet formats are not supported.')
  try {
    const bytes = await file.arrayBuffer()
    if (bytes.byteLength > MAX_FILE_BYTES) return failure('Choose a file no larger than 2 MiB.')
    if (extension === 'csv') return parseAllocationText(new TextDecoder('utf-8', { fatal: true }).decode(bytes), defaults)
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(bytes)
    const sheet = workbook.worksheets[0]
    if (!sheet) return failure('The workbook has no worksheets. Add a size and quantity table to the first worksheet.')
    if (sheet.rowCount > MAX_INPUT_ROWS + 1) return failure(`The first worksheet must have no more than ${MAX_INPUT_ROWS} data rows plus one header row.`)
    if (sheet.columnCount > 5) return failure('The first worksheet has more than five columns. Use only model, color, system, size and quantity.')
    const sourceRows: SourceRow[] = []
    const errors: string[] = []
    for (let line = 1; line <= sheet.rowCount; line++) {
      const row = sheet.getRow(line)
      const cells: string[] = []
      for (let column = 1; column <= sheet.columnCount; column++) {
        const value = spreadsheetText(row.getCell(column).value)
        cells.push(value.text)
        if (value.error) errors.push(`Row ${line}, column ${column}: ${value.error}`)
      }
      sourceRows.push({ cells, line })
    }
    return errors.length ? { rows: [], errors } : parseSourceRows(sourceRows, defaults)
  } catch {
    return failure('The file could not be read. Save it as UTF-8 CSV or a standard XLSX workbook, then try again.')
  }
}

function isConsistentPlan(plan: AllocationPlan): boolean {
  if (!plan.valid || plan.errors.length || !plan.rows.length || plan.rows.length > MAX_INPUT_ROWS) return false
  const inputs: AllocationInputRow[] = []
  const overrides: Record<string, string> = {}
  for (const row of plan.rows) {
    if (!Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 1000000) return false
    if (!Number.isSafeInteger(row.orderQuantity) || row.orderQuantity < row.quantity || row.orderQuantity > 1000000) return false
    let remaining = row.quantity
    while (remaining > 0) {
      const quantity = Math.min(100000, remaining)
      inputs.push({ id: `check-${inputs.length}`, model: row.model, color: row.color, system: row.system, size: row.size, quantity: String(quantity) })
      remaining -= quantity
    }
    if (row.overridden) overrides[row.key] = String(row.orderQuantity)
  }
  const checked = calculateAllocation(inputs, String(plan.sparePercent), overrides)
  if (!checked.valid || checked.rows.length !== plan.rows.length) return false
  if (checked.totals.workers !== plan.totals.workers || checked.totals.spares !== plan.totals.spares || checked.totals.order !== plan.totals.order) return false
  return plan.rows.every((row) => {
    const computed = checked.rows.find((candidate) => candidate.key === row.key)
    return computed && computed.quantity === row.quantity && computed.spares === row.spares && computed.suggestedQuantity === row.suggestedQuantity && computed.orderQuantity === row.orderQuantity && computed.overridden === row.overridden
  })
}

function styleSheet(sheet: Worksheet, widths: number[]) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173A32' } }
  header.alignment = { vertical: 'middle', wrapText: true }
  header.height = 34
  sheet.eachRow((row) => { row.alignment = { vertical: 'middle', wrapText: true } })
}

export async function buildAllocationWorkbook(plan: AllocationPlan): Promise<Uint8Array | null> {
  if (!isConsistentPlan(plan)) return null
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LAIFAPPE Footwear Size Allocation'
  const sheet = workbook.addWorksheet('Footwear order')
  sheet.addRow(['Model/reference', 'Color', 'Size system', 'Size', 'Base demand (pairs)', 'Suggested spares (pairs)', 'Recommended order (pairs)', 'Final order (pairs)', 'Manually adjusted'])
  for (const row of plan.rows) {
    sheet.addRow([row.model, row.color, FOOTWEAR_SYSTEMS.find((system) => system.value === row.system)?.label ?? row.system, row.size, row.quantity, row.spares, row.suggestedQuantity, row.orderQuantity, row.overridden ? 'Yes' : 'No'])
  }
  sheet.autoFilter = { from: 'A1', to: `I${plan.rows.length + 1}` }
  const totals = sheet.addRow(['Totals', '', '', '', plan.totals.workers, plan.rows.reduce((total, row) => total + row.spares, 0), plan.rows.reduce((total, row) => total + row.suggestedQuantity, 0), plan.totals.order, plan.rows.some((row) => row.overridden) ? 'Yes' : 'No'])
  totals.font = { bold: true }
  sheet.addRow([])
  sheet.addRow(['Spare percentage', `${plan.sparePercent}%`])
  sheet.addRow(['Final spare pairs', plan.totals.spares])
  const note = sheet.addRow(['Fit confirmation: confirm each model’s size chart, fit and requirements with the supplier before ordering. Size systems are preserved without conversion.'])
  sheet.mergeCells(`A${note.number}:I${note.number}`)
  note.height = 36
  styleSheet(sheet, [28, 20, 16, 12, 20, 22, 24, 20, 20])
  return new Uint8Array(await workbook.xlsx.writeBuffer())
}

export async function buildAllocationTemplate(): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Size counts')
  sheet.addRow(['model', 'color', 'system', 'size', 'quantity'])
  sheet.addRow(['Safety boot A', 'Black', 'EU', '42', 10])
  sheet.addRow(['Safety boot A', 'Black', 'EU', '42', 5])
  styleSheet(sheet, [28, 20, 20, 14, 18])
  return new Uint8Array(await workbook.xlsx.writeBuffer())
}
