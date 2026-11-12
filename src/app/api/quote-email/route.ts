import { createHash } from 'node:crypto'
import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deliverQuoteEmail, enqueueQuoteEmail, QuoteEmailConflictError } from '@/lib/quote-email-outbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const quoteEmailInputSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .max(100, 'Email is too long.')
    .regex(EMAIL_PATTERN, 'Please enter a valid email address.'),
  phoneCode: z.string().trim().max(20, 'Phone code is too long.').optional(),
  phone: z.string().trim().max(100, 'Phone is too long.').optional(),
  name: z.string().trim().max(100, 'Name is too long.').optional(),
  companyName: z.string().trim().max(200, 'Company name is too long.').optional(),
  message: z.string().trim().min(1, 'Message is required.').max(6000, 'Message is too long.'),
  source: z.string().trim().max(80, 'Source is too long.').optional(),
  entryPage: z.string().trim().max(1000, 'Entry page is too long.').optional(),
  referrer: z.string().trim().max(1000, 'Referrer is too long.').optional(),
  submissionId: z.string().uuid().optional(),
})

const quoteEmailOutputSchema = z.object({
  success: z.boolean(),
  reason: z.string(),
  requestId: z.string().optional(),
  inquiryId: z.string().uuid().optional(),
  notificationStatus: z.enum(['pending', 'sending', 'sent', 'failed']).optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})

type QuoteEmailInput = z.infer<typeof quoteEmailInputSchema>

export async function POST(request: NextRequest) {
  const body = await readJson(request)

  if (!body.success) {
    return jsonResponse(
      {
        success: false,
        reason: body.reason,
      },
      400
    )
  }

  const parsed = quoteEmailInputSchema.safeParse(body.data)

  if (!parsed.success) {
    return jsonResponse(
      {
        success: false,
        reason: 'Invalid quote request.',
        errors: parsed.error.flatten().fieldErrors,
      },
      400
    )
  }

  const sender = process.env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com'
  const recipient = process.env.QUOTE_EMAIL_TO || process.env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com'

  try {
    const subject = `New quote request from ${parsed.data.email}`
    const quoteInput = {
      ...parsed.data,
      entryPage: parsed.data.entryPage || request.headers.get('referer') || '',
      referrer: parsed.data.referrer || '',
    }
    const textBody = buildQuoteText(quoteInput)
    const htmlBody = buildQuoteHtml(quoteInput)

    const { submissionId } = parsed.data
    // Bind the customer's normalized input, independent of optional empty fields,
    // rendered templates, notification configuration and fallback request headers.
    const customerInput = {
      email: parsed.data.email,
      phoneCode: parsed.data.phoneCode || '',
      phone: parsed.data.phone || '',
      name: parsed.data.name || '',
      companyName: parsed.data.companyName || '',
      message: parsed.data.message,
      source: parsed.data.source || '',
      entryPage: parsed.data.entryPage || '',
      referrer: parsed.data.referrer || '',
    }
    const submissionFingerprint = createHash('sha256').update(JSON.stringify(customerInput)).digest('hex')
    const saved = await enqueueQuoteEmail({
      sender,
      recipient,
      subject,
      customerEmail: parsed.data.email,
      phone: formatPhone(parsed.data),
      name: parsed.data.name || '',
      companyName: parsed.data.companyName || '',
      source: quoteInput.source || '',
      entryPage: quoteInput.entryPage || '',
      referrer: quoteInput.referrer || '',
      message: quoteInput.message,
      textBody,
      htmlBody,
      submissionFingerprint,
    }, submissionId)

    // Saving is independent of the one initial mail attempt. If registration
    // fails, the saved request remains visible for manual handling in ADMIN.
    try {
      after(async () => {
        try {
          await deliverQuoteEmail(saved.id)
        } catch {
          console.error('fast_rfq_notification_attempt_failed', { inquiryId: saved.id })
        }
      })
    } catch {
      console.error('fast_rfq_notification_needs_manual_attention', { inquiryId: saved.id })
    }

    return jsonResponse({
      success: true,
      reason: 'Your quote request has been received.',
      inquiryId: saved.id,
      notificationStatus: saved.notificationStatus,
    })
  } catch (error) {
    if (error instanceof QuoteEmailConflictError) {
      return jsonResponse({ success: false, reason: 'This submission ID is already in use. Please submit the updated request again.' }, 409)
    }
    console.error('fast_rfq_capture_failed')
    return jsonResponse(
      {
        success: false,
        reason: 'We could not save your quote request. Please try again.',
      },
      503
    )
  }
}

async function readJson(request: NextRequest): Promise<
  | {
      success: true
      data: unknown
    }
  | {
      success: false
      reason: string
    }
> {
  try {
    return {
      success: true,
      data: await request.json(),
    }
  } catch {
    return {
      success: false,
      reason: 'Invalid JSON payload.',
    }
  }
}

function jsonResponse(input: z.infer<typeof quoteEmailOutputSchema>, status = 200) {
  const output = quoteEmailOutputSchema.parse(input)

  return NextResponse.json(output, { status, headers: { 'Cache-Control': 'no-store' } })
}

function buildQuoteText(input: QuoteEmailInput) {
  return [
    'New quote request',
    '',
    `Email: ${input.email}`,
    `Mobile/WhatsApp: ${formatPhone(input)}`,
    `Name: ${input.name || '-'}`,
    `Company Name: ${input.companyName || '-'}`,
    `Source: ${input.source || '-'}`,
    `Entry Page: ${input.entryPage || '-'}`,
    `Referrer: ${input.referrer || '-'}`,
    '',
    'Message:',
    input.message,
  ].join('\n')
}

function buildQuoteHtml(input: QuoteEmailInput) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin: 0 0 16px;">New quote request</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${buildHtmlRow('Email', input.email)}
        ${buildHtmlRow('Mobile/WhatsApp', formatPhone(input))}
        ${buildHtmlRow('Name', input.name || '-')}
        ${buildHtmlRow('Company Name', input.companyName || '-')}
        ${buildHtmlRow('Source', input.source || '-')}
        ${buildHtmlRow('Entry Page', input.entryPage || '-')}
        ${buildHtmlRow('Referrer', input.referrer || '-')}
      </table>
      <h3 style="margin: 24px 0 8px;">Message</h3>
      <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(input.message)}</p>
    </div>
  `
}

function buildHtmlRow(label: string, value: string) {
  return `
    <tr>
      <th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 180px;">${escapeHtml(label)}</th>
      <td style="border: 1px solid #ddd; padding: 10px;">${escapeHtml(value)}</td>
    </tr>
  `
}

function formatPhone(input: QuoteEmailInput) {
  const phone = input.phone?.trim()
  const code = input.phoneCode?.trim()

  if (!phone && !code) {
    return '-'
  }

  return [code, phone].filter(Boolean).join(' ')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
