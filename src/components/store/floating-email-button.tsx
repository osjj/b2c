"use client"

import { useEffect, useRef, useState, type SVGProps } from "react"
import { Check, Copy, ExternalLink, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const emailHref =
  "mailto:sales@laifappe.com?subject=PPE%20Quotation%20Request&body=Hello%20Laifappe%20Sales%20Team%2C%0A%0AI%20would%20like%20to%20request%20a%20quotation.%0A%0AProducts%3A%0AQuantity%3A%0ADelivery%20country%3A%0ACompany%20name%3A%0A%0AThank%20you."
const whatsappDisplay = "+86 180 2930 9938"
const whatsappCopyText = "+8618029309938"
const whatsappHref = "https://wa.me/8618029309938"

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5.4 18.7 6.2 15A7.4 7.4 0 1 1 9 17.8l-3.6.9Z" />
      <path d="M9.3 8.6c.2-.4.3-.5.6-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3.1.5-.1.7l-.4.5c.6 1 1.4 1.8 2.5 2.3l.6-.6c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.6v.4c0 .4-.2.6-.6.8-.6.3-1.5.4-2.8-.1-2.3-.8-4.2-2.6-5.1-5-.5-1.3-.3-2.1.1-2.7Z" />
    </svg>
  )
}

export function FloatingEmailButton() {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  )
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const handleCopyWhatsApp = async () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
    }

    try {
      await navigator.clipboard.writeText(whatsappCopyText)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("error")
    }

    resetTimerRef.current = setTimeout(() => {
      setCopyStatus("idle")
    }, 2000)
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Show Laifappe WhatsApp contact"
            className="group inline-flex w-20 flex-col items-center gap-1.5 text-xs font-semibold text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#25D366]/25 bg-[#25D366] text-white shadow-lg shadow-black/10 transition-colors group-hover:bg-[#1fb957] group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-[#25D366] group-focus-visible:ring-offset-2">
              <WhatsAppIcon className="h-7 w-7" />
            </span>
            <span className="rounded-full bg-background/95 px-2 py-0.5 leading-none shadow-sm">
              WhatsApp
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>WhatsApp Contact</DialogTitle>
            <DialogDescription>
              Use this number for urgent PPE quotation requests.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">WhatsApp / WeChat</p>
            <p className="mt-1 text-xl font-semibold tracking-normal">
              {whatsappDisplay}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {copyStatus === "copied" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copyStatus === "copied" ? "Copied" : "Copy Number"}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open WhatsApp
            </a>
          </div>

          {copyStatus === "error" && (
            <p className="text-sm text-destructive" role="status">
              Copy failed. Please copy the number manually.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <a
        href={emailHref}
        aria-label="Email Laifappe sales"
        className="group inline-flex w-20 flex-col items-center gap-1.5 text-xs font-semibold text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-background text-foreground shadow-lg shadow-black/10 transition-colors group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2">
          <Mail className="h-6 w-6" />
        </span>
        <span className="rounded-full bg-background/95 px-2 py-0.5 leading-none shadow-sm">
          Email
        </span>
      </a>
    </div>
  )
}
