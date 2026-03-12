'use client'

import { FileDown, Sheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildQuotePdfRows,
  buildQuoteSheetRows,
  calculateQuoteTotal,
} from '@/lib/ai-quote'
import type { QuoteItem } from '@/types/ai-quote'

interface ExportButtonsProps {
  items: QuoteItem[]
}

export function ExportButtons({ items }: ExportButtonsProps) {
  const date = new Date().toLocaleDateString('en-US')
  const total = calculateQuoteTotal(items)

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })

    doc.setFontSize(18)
    doc.text('AI Quote Sheet', 40, 52)
    doc.setFontSize(10)
    doc.text(`Generated: ${date}`, 40, 72)

    autoTable(doc, {
      startY: 92,
      head: [['Product', 'SKU', 'Unit Price', 'Qty', 'Subtotal']],
      body: [
        ...buildQuotePdfRows(items),
        ['', '', '', 'Total', total.toFixed(2)],
      ],
      styles: { fontSize: 9, cellPadding: 8 },
      headStyles: { fillColor: [24, 39, 75] },
      bodyStyles: { textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    doc.save(`ai-quote-${date}.pdf`)
  }

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const workbook = utils.book_new()
    const worksheet = utils.aoa_to_sheet(buildQuoteSheetRows(items, date))

    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 36 },
    ]

    utils.book_append_sheet(workbook, worksheet, 'AI Quote')
    writeFile(workbook, `ai-quote-${date}.xlsx`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" size="lg" className="rounded-full px-6" onClick={exportPdf}>
        <FileDown className="h-4 w-4" />
        Export PDF
      </Button>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="rounded-full px-6"
        onClick={exportExcel}
      >
        <Sheet className="h-4 w-4" />
        Export Excel
      </Button>
    </div>
  )
}
