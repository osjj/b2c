"use client"

import * as Dialog from "@radix-ui/react-dialog"
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactElement, ReactNode } from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import styles from "./home-new.module.css"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COUNTRY_CODES = [
  { code: "+86", country: "China" },
  { code: "+1", country: "United States / Canada" },
  { code: "+44", country: "United Kingdom" },
  { code: "+355", country: "Albania" },
  { code: "+213", country: "Algeria" },
  { code: "+93", country: "Afghanistan" },
  { code: "+54", country: "Argentina" },
  { code: "+971", country: "United Arab Emirates" },
  { code: "+297", country: "Aruba" },
  { code: "+968", country: "Oman" },
  { code: "+994", country: "Azerbaijan" },
  { code: "+247", country: "Ascension Island" },
  { code: "+20", country: "Egypt" },
  { code: "+61", country: "Australia" },
  { code: "+43", country: "Austria" },
  { code: "+973", country: "Bahrain" },
  { code: "+880", country: "Bangladesh" },
  { code: "+32", country: "Belgium" },
  { code: "+55", country: "Brazil" },
  { code: "+359", country: "Bulgaria" },
  { code: "+855", country: "Cambodia" },
  { code: "+56", country: "Chile" },
  { code: "+57", country: "Colombia" },
  { code: "+385", country: "Croatia" },
  { code: "+420", country: "Czech Republic" },
  { code: "+45", country: "Denmark" },
  { code: "+593", country: "Ecuador" },
  { code: "+372", country: "Estonia" },
  { code: "+358", country: "Finland" },
  { code: "+33", country: "France" },
  { code: "+49", country: "Germany" },
  { code: "+30", country: "Greece" },
  { code: "+852", country: "Hong Kong" },
  { code: "+36", country: "Hungary" },
  { code: "+91", country: "India" },
  { code: "+62", country: "Indonesia" },
  { code: "+353", country: "Ireland" },
  { code: "+972", country: "Israel" },
  { code: "+39", country: "Italy" },
  { code: "+81", country: "Japan" },
  { code: "+962", country: "Jordan" },
  { code: "+7", country: "Kazakhstan / Russia" },
  { code: "+254", country: "Kenya" },
  { code: "+965", country: "Kuwait" },
  { code: "+856", country: "Laos" },
  { code: "+371", country: "Latvia" },
  { code: "+961", country: "Lebanon" },
  { code: "+370", country: "Lithuania" },
  { code: "+352", country: "Luxembourg" },
  { code: "+853", country: "Macau" },
  { code: "+60", country: "Malaysia" },
  { code: "+52", country: "Mexico" },
  { code: "+212", country: "Morocco" },
  { code: "+31", country: "Netherlands" },
  { code: "+64", country: "New Zealand" },
  { code: "+234", country: "Nigeria" },
  { code: "+47", country: "Norway" },
  { code: "+92", country: "Pakistan" },
  { code: "+507", country: "Panama" },
  { code: "+51", country: "Peru" },
  { code: "+63", country: "Philippines" },
  { code: "+48", country: "Poland" },
  { code: "+351", country: "Portugal" },
  { code: "+974", country: "Qatar" },
  { code: "+40", country: "Romania" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+65", country: "Singapore" },
  { code: "+421", country: "Slovakia" },
  { code: "+386", country: "Slovenia" },
  { code: "+27", country: "South Africa" },
  { code: "+82", country: "South Korea" },
  { code: "+34", country: "Spain" },
  { code: "+94", country: "Sri Lanka" },
  { code: "+46", country: "Sweden" },
  { code: "+41", country: "Switzerland" },
  { code: "+886", country: "Taiwan" },
  { code: "+66", country: "Thailand" },
  { code: "+90", country: "Turkey" },
  { code: "+380", country: "Ukraine" },
  { code: "+598", country: "Uruguay" },
  { code: "+998", country: "Uzbekistan" },
  { code: "+84", country: "Vietnam" },
] as const

type QuoteRequestFormValues = {
  email: string
  phoneCode: string
  phone: string
  name: string
  companyName: string
  message: string
}

type QuoteRequestFormErrors = Partial<Record<"email" | "message" | "form", string>>

type QuoteRequestFormProps = {
  className?: string
  compact?: boolean
  eyebrow?: string
  source?: string
  title?: ReactNode
}

type QuoteDrawerProps = {
  source?: string
  trigger: ReactElement
}

type QuoteEmailResponse = {
  success: boolean
  reason?: string
  errors?: Partial<Record<keyof QuoteRequestFormValues, string[]>>
}

const initialValues: QuoteRequestFormValues = {
  email: "",
  phoneCode: "",
  phone: "",
  name: "",
  companyName: "",
  message: "",
}

function CountryCodeCombobox({
  id,
  onChange,
  value,
}: {
  id: string
  onChange: (value: string) => void
  value: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredCodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return COUNTRY_CODES

    return COUNTRY_CODES.filter((item) => {
      const searchable = `${item.code} ${item.country}`.toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [query])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className={styles.phoneCodePicker} onKeyDown={handleKeyDown} ref={rootRef}>
      <input name="phoneCode" type="hidden" value={value} />
      <button
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={styles.phoneCodeButton}
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value || "Code"}</span>
        <span className={styles.phoneCodeChevron} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.phoneCodeDropdown}>
          <input
            aria-label="Search country code"
            className={styles.phoneCodeSearch}
            onChange={(event) => setQuery(event.target.value)}
            placeholder=""
            ref={inputRef}
            type="search"
            value={query}
          />
          <div className={styles.phoneCodeList} id={`${id}-listbox`} role="listbox">
            {filteredCodes.length > 0 ? (
              filteredCodes.map((item) => (
                <button
                  aria-selected={item.code === value}
                  className={styles.phoneCodeOption}
                  key={`${item.code}-${item.country}`}
                  onClick={() => {
                    onChange(item.code)
                    setQuery("")
                    setOpen(false)
                  }}
                  role="option"
                  type="button"
                >
                  <strong>{item.code}</strong>
                  <span>({item.country})</span>
                </button>
              ))
            ) : (
              <div className={styles.phoneCodeEmpty}>No country code found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function QuoteDrawer({ source = "Quote drawer", trigger }: QuoteDrawerProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.quoteDrawerOverlay} />
        <Dialog.Content className={styles.quoteDrawerPanel}>
          <Dialog.Title className={styles.srOnly}>Get a Free Quote</Dialog.Title>
          <Dialog.Description className={styles.srOnly}>
            Our representative will contact you soon.
          </Dialog.Description>
          <Dialog.Close className={styles.quoteDrawerClose} aria-label="Close quote form">
            &times;
          </Dialog.Close>
          <div className={styles.quoteDrawerScroll}>
            <QuoteRequestForm source={source} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function QuoteRequestForm({
  className = "",
  compact = false,
  eyebrow = "- Get Instant Quote",
  source = "FAST RFQ",
  title = (
    <>
      Tell us what you need.
      <br />
      We respond within 24 hours.
    </>
  ),
}: QuoteRequestFormProps) {
  const idPrefix = useId()
  const [values, setValues] = useState<QuoteRequestFormValues>(initialValues)
  const [errors, setErrors] = useState<QuoteRequestFormErrors>({})
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formClassName = [
    styles.quoteRequestForm,
    compact ? styles.quoteRequestFormCompact : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  function updateValue(field: keyof QuoteRequestFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({
        ...current,
        [field]: event.target.value,
      }))
      setErrors((current) => ({ ...current, [field]: undefined, form: undefined }))
      setStatus(null)
    }
  }

  function updatePhoneCode(phoneCode: string) {
    setValues((current) => ({
      ...current,
      phoneCode,
    }))
    setErrors((current) => ({ ...current, form: undefined }))
    setStatus(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = values.email.trim()
    const trimmedMessage = values.message.trim()
    const nextErrors: QuoteRequestFormErrors = {}

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address."
    }

    if (!trimmedMessage) {
      nextErrors.message = "Message is required."
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setStatus(null)

    try {
      const response = await fetch("/api/quote-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          email: trimmedEmail,
          message: trimmedMessage,
          source,
        }),
      })
      const payload = (await response.json().catch(() => null)) as QuoteEmailResponse | null

      if (!response.ok || !payload?.success) {
        setErrors({
          email: payload?.errors?.email?.[0],
          message: payload?.errors?.message?.[0],
          form: payload?.reason || "We could not send your quote request. Please try again.",
        })
        return
      }

      setValues(initialValues)
      setStatus("Your quote request has been sent successfully.")
    } catch {
      setErrors({
        form: "We could not send your quote request. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={formClassName} onSubmit={handleSubmit} noValidate>
      <div className={styles.quoteRequestHeader}>
        <div className={styles.quoteRequestEyebrow}>{eyebrow}</div>
        <h2>{title}</h2>
      </div>

      <div className={styles.quoteField}>
        <label className={styles.quoteLabel} htmlFor={`${idPrefix}-email`}>
          Email
        </label>
        <input
          aria-describedby={errors.email ? `${idPrefix}-email-error` : undefined}
          aria-invalid={Boolean(errors.email)}
          className={styles.quoteInput}
          id={`${idPrefix}-email`}
          maxLength={100}
          name="email"
          onChange={updateValue("email")}
          placeholder="you@company.com"
          type="email"
          value={values.email}
        />
        <span className={styles.quoteCounter}>{values.email.length}/100</span>
        {errors.email ? (
          <p className={styles.fieldError} id={`${idPrefix}-email-error`} role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className={styles.quoteField}>
        <label className={styles.quoteLabel} htmlFor={`${idPrefix}-phone`}>
          Mobile/WhatsApp
        </label>
        <div className={styles.phoneInputGroup}>
          <CountryCodeCombobox id={`${idPrefix}-phone-code`} onChange={updatePhoneCode} value={values.phoneCode} />
          <input
            className={styles.quoteInput}
            id={`${idPrefix}-phone`}
            maxLength={100}
            name="phone"
            onChange={updateValue("phone")}
            placeholder="Please enter your mobile phone"
            type="tel"
            value={values.phone}
          />
          <span className={styles.quoteCounter}>{values.phone.length}/100</span>
        </div>
      </div>

      <div className={styles.quoteField}>
        <label className={styles.quoteLabel} htmlFor={`${idPrefix}-name`}>
          Name
        </label>
        <input
          className={styles.quoteInput}
          id={`${idPrefix}-name`}
          maxLength={100}
          name="name"
          onChange={updateValue("name")}
          placeholder="Please enter your name"
          value={values.name}
        />
        <span className={styles.quoteCounter}>{values.name.length}/100</span>
      </div>

      <div className={styles.quoteField}>
        <label className={styles.quoteLabel} htmlFor={`${idPrefix}-companyName`}>
          Company Name
        </label>
        <input
          className={styles.quoteInput}
          id={`${idPrefix}-companyName`}
          maxLength={200}
          name="companyName"
          onChange={updateValue("companyName")}
          placeholder="Please enter your company name"
          value={values.companyName}
        />
        <span className={styles.quoteCounter}>{values.companyName.length}/200</span>
      </div>

      <div className={styles.quoteField}>
        <label className={styles.quoteLabel} htmlFor={`${idPrefix}-message`}>
          Message
        </label>
        <textarea
          aria-describedby={errors.message ? `${idPrefix}-message-error` : undefined}
          aria-invalid={Boolean(errors.message)}
          className={styles.quoteTextarea}
          id={`${idPrefix}-message`}
          maxLength={1000}
          name="message"
          onChange={updateValue("message")}
          placeholder="Which products are you interested in? and what is the quantity?"
          value={values.message}
        />
        <span className={`${styles.quoteCounter} ${styles.quoteTextareaCounter}`}>
          {values.message.length}/1000
        </span>
        {errors.message ? (
          <p className={styles.fieldError} id={`${idPrefix}-message-error`} role="alert">
            {errors.message}
          </p>
        ) : null}
      </div>

      {errors.form ? (
        <p className={styles.formError} role="alert">
          {errors.form}
        </p>
      ) : null}
      {status ? <p className={styles.formSuccess}>{status}</p> : null}

      <button className={styles.quoteSubmit} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Submit Request"}
        <span aria-hidden="true">&rarr;</span>
      </button>
      <p className={styles.quoteResponseNote}>&#10003; We respond within one business day</p>
    </form>
  )
}
