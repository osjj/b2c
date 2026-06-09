'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, X, Send, Loader2, Check } from 'lucide-react'
import { useQuote } from '@/hooks/use-quote'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { createQuote } from '@/actions/quotes'
import { pushDataLayerEvent } from '@/lib/analytics-events'
import { cn, formatPrice } from '@/lib/utils'
import type { QuoteItem } from '@/hooks/use-quote'

interface MiniQuoteProps {
  hideWhenEmpty?: boolean
  triggerClassName?: string
  triggerLabel?: string
  triggerLabelClassName?: string
}

type MiniQuoteFormData = {
  name: string
  email: string
  contact: string
  companyName: string
  remark: string
  expectedPrice: string
  fileUrl: string
  fileName: string
}

type QuoteEmailResponse = {
  success: boolean
  reason?: string
}

const QUOTE_LIST_EMAIL_MESSAGE_MAX_LENGTH = 6000
const QUOTE_LIST_EMAIL_MESSAGE_TRUNCATION_NOTE = '\n\n[Message truncated; quote is saved in admin.]'

function normalizeFormData(formData: MiniQuoteFormData): MiniQuoteFormData {
  return {
    name: formData.name.trim(),
    email: formData.email.trim(),
    contact: formData.contact.trim(),
    companyName: formData.companyName.trim(),
    remark: formData.remark.trim(),
    expectedPrice: formData.expectedPrice.trim(),
    fileUrl: formData.fileUrl.trim(),
    fileName: formData.fileName.trim(),
  }
}

function isQuoteEmailResponse(value: unknown): value is QuoteEmailResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Record<string, unknown>
  return typeof payload.success === 'boolean'
}

function getQuoteTrackingContext() {
  return {
    entryPage: window.location.href,
    referrer: document.referrer,
  }
}

function buildQuoteListEmailMessage({
  expectedPrice,
  formData,
  items,
  quoteNumber,
  totalItems,
}: {
  expectedPrice?: number
  formData: MiniQuoteFormData
  items: QuoteItem[]
  quoteNumber: string
  totalItems: number
}) {
  const itemLines = items.map((item, index) =>
    [
      `${index + 1}. ${item.name}`,
      `   SKU: ${item.sku || '-'}`,
      `   Quantity: ${item.quantity}`,
      `   Unit Price: ${formatPrice(item.price)}`,
      item.tierLabel ? `   Tier: ${item.tierLabel}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  )

  const message = [
    'Quote List Request',
    '',
    `Quote Number: ${quoteNumber || '-'}`,
    `Total Quantity: ${totalItems}`,
    `Company Name: ${formData.companyName || '-'}`,
    `Contact: ${formData.contact || '-'}`,
    `Expected Total Price: ${expectedPrice === undefined ? '-' : formatPrice(expectedPrice)}`,
    formData.fileUrl ? `Uploaded File: ${formData.fileName || 'File'} (${formData.fileUrl})` : null,
    '',
    'Items:',
    ...itemLines,
    '',
    'Remark:',
    formData.remark || '-',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  if (message.length <= QUOTE_LIST_EMAIL_MESSAGE_MAX_LENGTH) {
    return message
  }

  return `${message.slice(
    0,
    QUOTE_LIST_EMAIL_MESSAGE_MAX_LENGTH - QUOTE_LIST_EMAIL_MESSAGE_TRUNCATION_NOTE.length
  )}${QUOTE_LIST_EMAIL_MESSAGE_TRUNCATION_NOTE}`
}

async function sendQuoteListEmail({
  expectedPrice,
  formData,
  items,
  quoteNumber,
  totalItems,
}: {
  expectedPrice?: number
  formData: MiniQuoteFormData
  items: QuoteItem[]
  quoteNumber: string
  totalItems: number
}): Promise<QuoteEmailResponse> {
  const response = await fetch('/api/quote-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyName: formData.companyName,
      email: formData.email,
      ...getQuoteTrackingContext(),
      message: buildQuoteListEmailMessage({
        expectedPrice,
        formData,
        items,
        quoteNumber,
        totalItems,
      }),
      name: formData.name,
      phone: formData.contact,
      source: 'Quote List',
    }),
  })
  const payload: unknown = await response.json().catch(() => null)

  if (!isQuoteEmailResponse(payload)) {
    return {
      success: false,
      reason: 'We could not read the email server response.',
    }
  }

  if (!response.ok || !payload.success) {
    return {
      success: false,
      reason: payload.reason || 'We could not send the quote email.',
    }
  }

  return payload
}

export function MiniQuote({
  hideWhenEmpty = false,
  triggerClassName,
  triggerLabel,
  triggerLabelClassName,
}: MiniQuoteProps = {}) {
  const { items, isHydrated, isOpen, openQuote, closeQuote, removeItem, totalItems, clearQuote } = useQuote()
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [quoteNumber, setQuoteNumber] = useState('')
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({})
  const [formData, setFormData] = useState<MiniQuoteFormData>({
    name: '',
    email: '',
    contact: '',
    companyName: '',
    remark: '',
    expectedPrice: '',
    fileUrl: '',
    fileName: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name] || errors.form) {
      setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/quotes/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await res.json()
      setFormData((prev) => ({
        ...prev,
        fileUrl: data.url,
        fileName: data.fileName,
      }))
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: [error instanceof Error ? error.message : 'Upload failed'],
      }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const normalizedFormData = normalizeFormData(formData)
      const expectedPrice = normalizedFormData.expectedPrice
        ? Number.parseFloat(normalizedFormData.expectedPrice)
        : undefined

      if (expectedPrice !== undefined && !Number.isFinite(expectedPrice)) {
        setErrors({ expectedPrice: ['Expected price must be a valid number'] })
        return
      }

      const result = await createQuote({
        ...normalizedFormData,
        expectedPrice,
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
        })),
      })

      if (result.errors) {
        setErrors(result.errors)
        return
      }

      if (result.error) {
        setErrors({ form: [result.error] })
        return
      }

      if (result.success) {
        const createdQuoteNumber = result.quoteNumber || ''
        const emailResult = await sendQuoteListEmail({
          expectedPrice,
          formData: normalizedFormData,
          items,
          quoteNumber: createdQuoteNumber,
          totalItems,
        })

        if (!emailResult.success) {
          setErrors({
            form: [
              `Quote ${createdQuoteNumber || 'request'} was saved, but email sending failed: ${emailResult.reason || 'Unknown email error'}`,
            ],
          })
          return
        }

        setSubmitSuccess(true)
        setQuoteNumber(createdQuoteNumber)
        pushDataLayerEvent({
          event: 'quote_submit',
          form_id: 'quote_list',
          has_file: Boolean(normalizedFormData.fileUrl),
          item_count: totalItems,
          quote_type: 'quote_list',
        })
        clearQuote()
        setFormData({
          name: '',
          email: '',
          contact: '',
          companyName: '',
          remark: '',
          expectedPrice: '',
          fileUrl: '',
          fileName: '',
        })
      }
    } catch (error) {
      setErrors({
        form: [error instanceof Error ? error.message : 'Failed to submit quote request'],
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetAndClose = () => {
    setShowForm(false)
    setSubmitSuccess(false)
    setQuoteNumber('')
    setErrors({})
    closeQuote()
  }

  if (hideWhenEmpty && !isOpen && (!isHydrated || totalItems === 0)) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openQuote() : resetAndClose())}>
      <SheetTrigger asChild>
        <Button
          aria-label={`Quote list with ${totalItems} item${totalItems === 1 ? '' : 's'}`}
          className={cn(
            'relative h-11 w-11 sm:h-9 sm:w-9',
            triggerLabel && 'w-auto px-4 sm:w-auto',
            triggerClassName
          )}
          size={triggerLabel ? 'default' : 'icon'}
          type="button"
          variant="ghost"
        >
          <FileText className={cn('h-6 w-6 sm:h-5 sm:w-5', triggerLabel && 'h-4 w-4 sm:h-4 sm:w-4')} />
          {triggerLabel && <span className={triggerLabelClassName}>{triggerLabel}</span>}
          {totalItems > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-blue-500 text-white"
            >
              {totalItems > 99 ? '99+' : totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-lg p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>
            {submitSuccess ? 'Quote Submitted' : showForm ? 'Request Quote' : `Quote List (${totalItems})`}
          </SheetTitle>
        </SheetHeader>

        {submitSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Quote Request Submitted!</h3>
            <p className="text-muted-foreground mb-2">
              Your quote number is:
            </p>
            <p className="font-mono text-lg font-bold text-primary mb-4">{quoteNumber}</p>
            <p className="text-sm text-muted-foreground mb-6">
              We will contact you shortly by email.
            </p>
            <Button onClick={resetAndClose}>Continue Shopping</Button>
          </div>
        ) : showForm ? (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4 pb-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    required
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name[0]}</p>}
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    required
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email[0]}</p>}
                </div>

                <div>
                  <Label htmlFor="contact">Phone / WhatsApp / WeChat (Optional)</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Optional phone, WhatsApp, or WeChat ID"
                  />
                  {errors.contact && <p className="text-sm text-red-500 mt-1">{errors.contact[0]}</p>}
                </div>

                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Your company name (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="remark">Remark</Label>
                  <Textarea
                    id="remark"
                    name="remark"
                    value={formData.remark}
                    onChange={handleInputChange}
                    placeholder="Special requirements or notes (optional)"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="expectedPrice">Expected Total Price (Optional)</Label>
                  <Input
                    id="expectedPrice"
                    name="expectedPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.expectedPrice}
                    onChange={handleInputChange}
                    placeholder="Your expected total price"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Providing an expected price helps us offer you a better quote
                  </p>
                </div>

                <div>
                  <Label htmlFor="file">Upload File</Label>
                  <div className="mt-1">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.xls,.xlsx,.doc,.docx"
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Logo or purchase list (Images, PDF, Excel, Word)
                    </p>
                    {isUploading && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    {formData.fileName && !isUploading && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        {formData.fileName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t my-2" />

                <div>
                  <p className="text-sm font-medium mb-2">Items ({items.length})</p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.variantId || ''}`} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-muted-foreground">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-4 space-y-2 border-t mt-4">
              {errors.form?.[0] && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                  {errors.form[0]}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Quote
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your quote list is empty</p>
            <Button asChild variant="link" onClick={closeQuote}>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || ''}`}
                    className="flex gap-3"
                  >
                    <div className="w-16 h-16 relative rounded overflow-hidden bg-gray-100 shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                      {item.tierLabel && (
                        <p className="text-xs text-muted-foreground">
                          ({item.tierLabel})
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="shrink-0 pt-4 space-y-4 border-t mt-4">
              <p className="text-sm text-muted-foreground text-center">
                {totalItems} item(s) selected for quote
              </p>
              <Button className="w-full" onClick={() => setShowForm(true)}>
                <Send className="h-4 w-4 mr-2" />
                Request Quote
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
