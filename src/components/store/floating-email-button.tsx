import { Mail } from "lucide-react"

const emailHref =
  "mailto:sales@laifappe.com?subject=PPE%20Quotation%20Request&body=Hello%20Laifappe%20Sales%20Team%2C%0A%0AI%20would%20like%20to%20request%20a%20quotation.%0A%0AProducts%3A%0AQuantity%3A%0ADelivery%20country%3A%0ACompany%20name%3A%0A%0AThank%20you."

export function FloatingEmailButton() {
  return (
    <a
      href={emailHref}
      aria-label="Email Laifappe sales"
      className="group inline-flex w-14 flex-col items-center gap-1.5 text-xs font-semibold text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-background text-foreground shadow-lg shadow-black/10 transition-colors group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2">
        <Mail className="h-6 w-6" />
      </span>
      <span className="rounded-full bg-background/95 px-2 py-0.5 leading-none shadow-sm">
        Email
      </span>
    </a>
  )
}
