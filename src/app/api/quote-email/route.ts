import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { appendQuoteEmailHistory } from '@/lib/quote-email-history'

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
})

const quoteEmailOutputSchema = z.object({
  success: z.boolean(),
  reason: z.string(),
  requestId: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})

type QuoteEmailInput = z.infer<typeof quoteEmailInputSchema>

type Smtp2GoResponse = {
  request_id?: string
  error?: string
  data?: {
    email_id?: string
  }
  email_response?: {
    email_id?: string
  }
}

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

  const apiKey = process.env.SMTP2GO_API_KEY
  const sender = process.env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com'
  const recipient = process.env.QUOTE_EMAIL_TO || process.env.SMTP2GO_DEFAULT_SENDER || 'sales@laifappe.com'

  if (!apiKey) {
    return jsonResponse(
      {
        success: false,
        reason: 'SMTP2GO_API_KEY is not configured in the server environment.',
      },
      500
    )
  }

  try {
    const subject = `New quote request from ${parsed.data.email}`
    const textBody = buildQuoteText(parsed.data)
    const htmlBody = buildQuoteHtml(parsed.data)

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [recipient],
        subject,
        text_body: textBody,
        html_body: htmlBody,
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as Smtp2GoResponse | null

    if (!response.ok) {
      return jsonResponse(
        {
          success: false,
          reason: payload?.error || `SMTP2GO request failed with status ${response.status}.`,
        },
        response.status
      )
    }

    if (payload?.error) {
      return jsonResponse(
        {
          success: false,
          reason: payload.error,
        },
        400
      )
    }

    const requestId = payload?.request_id || payload?.data?.email_id || payload?.email_response?.email_id

    try {
      await appendQuoteEmailHistory({
        sender,
        recipient,
        subject,
        customerEmail: parsed.data.email,
        phone: formatPhone(parsed.data),
        name: parsed.data.name || '',
        companyName: parsed.data.companyName || '',
        source: parsed.data.source || '',
        message: parsed.data.message,
        textBody,
        htmlBody,
        requestId,
      })
    } catch {
      return jsonResponse({
        success: true,
        reason: 'Quote request sent successfully, but history recording failed.',
        requestId,
      })
    }

    return jsonResponse({
      success: true,
      reason: 'Quote request sent successfully.',
      requestId,
    })
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        reason:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while sending the quote request.',
      },
      500
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

  return NextResponse.json(output, { status })
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
