'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, X, Send, Upload, Loader2, Check } from 'lucide-react'
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

export function MiniQuote() {
  const { items, isOpen, openQuote, closeQuote, removeItem, totalItems, clearQuote } = useQuote()
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [quoteNumber, setQuoteNumber] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formData, setFormData] = useState({
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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: [] }))
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
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Upload failed')
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
      const result = await createQuote({
        ...formData,
        expectedPrice: formData.expectedPrice ? parseFloat(formData.expectedPrice) : undefined,
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
        alert(result.error)
        return
      }

      if (result.success) {
        setSubmitSuccess(true)
        setQuoteNumber(result.quoteNumber || '')
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
      console.error('Submit error:', error)
      alert('Failed to submit quote request')
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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? openQuote() : resetAndClose())}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <FileText className="h-5 w-5" />
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
              We will contact you shortly via email or WhatsApp/WeChat.
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
                  <Label htmlFor="contact">WhatsApp / WeChat *</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Your WhatsApp or WeChat ID"
                    required
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
