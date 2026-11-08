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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { createQuote } from '@/actions/quotes'
import { pushDataLayerEvent } from '@/lib/analytics-events'
import { cn, formatPrice } from '@/lib/utils'
import type { QuoteItem } from '@/hooks/use-quote'
import styles from './mini-quote.module.css'

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

function QuoteThumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className={styles.thumbnail} aria-hidden="true">
      {src && !failed ? (
        <Image src={src} alt="" fill sizes="72px" unoptimized onError={() => setFailed(true)} />
      ) : (
        <span>No image</span>
      )}
    </div>
  )
}

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
            !triggerClassName && styles.trigger,
            triggerClassName
          )}
          size={triggerLabel ? 'default' : 'icon'}
          type="button"
          variant="ghost"
        >
          <FileText className={cn('h-6 w-6 sm:h-5 sm:w-5', triggerLabel && 'h-4 w-4 sm:h-4 sm:w-4')} />
          {triggerLabel && <span className={triggerLabelClassName}>{triggerLabel}</span>}
          {totalItems > 0 && (
            <span aria-hidden="true" className={styles.count}>
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className={styles.drawer}>
        <SheetHeader className={styles.header}>
          <p className={styles.kicker}>PPE Procurement</p>
          <SheetTitle className={styles.title} aria-live="polite">
            {submitSuccess ? 'Quote Submitted' : showForm ? 'Request Quote' : `Quote List (${totalItems})`}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {submitSuccess
              ? 'Your quote request has been sent.'
              : showForm
                ? 'Add your contact details and any requirements for the selected products.'
                : 'Review the products selected for your quote request.'}
          </SheetDescription>
        </SheetHeader>

        {submitSuccess ? (
          <div className={styles.centered}>
            <div className={styles.stateMark} aria-hidden="true">
              <Check size={30} />
            </div>
            <h3>Quote Request Submitted!</h3>
            <p>Your quote number is:</p>
            <p className={styles.quoteNumber}>{quoteNumber}</p>
            <p>We will contact you shortly by email.</p>
            <Button className={styles.primary} onClick={resetAndClose}>Continue Shopping</Button>
          </div>
        ) : showForm ? (
          <form onSubmit={handleSubmit} className={styles.stage}>
            <div className={styles.scrollArea}>
              <div className={styles.fields}>
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
                  {errors.name && <p className={styles.fieldError}>{errors.name[0]}</p>}
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
                  {errors.email && <p className={styles.fieldError}>{errors.email[0]}</p>}
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
                  {errors.contact && <p className={styles.fieldError}>{errors.contact[0]}</p>}
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
                  <p className={styles.hint}>
                    Providing an expected price helps us offer you a better quote
                  </p>
                  {errors.expectedPrice && <p className={styles.fieldError}>{errors.expectedPrice[0]}</p>}
                </div>

                <div>
                  <Label htmlFor="file">Upload File</Label>
                  <div>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.xls,.xlsx,.doc,.docx"
                      disabled={isUploading}
                    />
                    <p className={styles.hint}>
                      Logo or purchase list (Images, PDF, Excel, Word)
                    </p>
                    {isUploading && (
                      <div className={styles.fileStatus} role="status">
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    {formData.fileName && !isUploading && (
                      <div className={styles.fileStatus} role="status">
                        <Check aria-hidden="true" size={16} />
                        {formData.fileName}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.review}>
                  <p>Items ({items.length})</p>
                  <ul className={styles.reviewList}>
                    {items.map((item) => (
                      <li key={`${item.productId}-${item.variantId || ''}`}>
                        <span>{item.name}</span>
                        <span>x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              {errors.form?.[0] && (
                <p className={styles.formError} role="alert">
                  {errors.form[0]}
                </p>
              )}
              <div className={styles.actions}>
                <Button type="button" variant="outline" className={styles.secondary} onClick={() => setShowForm(false)}>
                  Back
                </Button>
                <Button type="submit" className={styles.primary} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send aria-hidden="true" size={16} />
                      Submit Quote
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        ) : items.length === 0 ? (
          <div className={styles.centered}>
            <div className={styles.stateMark} aria-hidden="true">
              <FileText size={30} />
            </div>
            <p>Your quote list is empty</p>
            <Button asChild className={styles.secondary} variant="outline" onClick={closeQuote}>
              <Link href="/products">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <div className={styles.stage}>
            <div className={styles.scrollArea}>
              <ul className={styles.items}>
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.variantId || ''}`}
                    className={styles.item}
                  >
                    <QuoteThumbnail key={item.image} src={item.image} />
                    <div className={styles.itemDetails}>
                      <p className={styles.itemName}>{item.name}</p>
                      {item.sku && <p>SKU: {item.sku}</p>}
                      <p>Qty: <strong>{item.quantity}</strong></p>
                      {item.tierLabel && (
                        <p>({item.tierLabel})</p>
                      )}
                    </div>
                    <Button
                      aria-label={`Remove ${item.name}`}
                      variant="ghost"
                      size="icon"
                      className={styles.remove}
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      <X aria-hidden="true" size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.footer}>
              <p className={styles.total}>
                {totalItems} item(s) selected for quote
              </p>
              <Button className={styles.primary} onClick={() => setShowForm(true)}>
                <Send aria-hidden="true" size={16} />
                Request Quote
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
