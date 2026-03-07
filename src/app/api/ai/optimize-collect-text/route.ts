import { NextRequest, NextResponse } from 'next/server'
import { generateText, parseJSONResponse } from '@/lib/openai'

interface OptimizeRequest {
  name: string
  description: string
  specifications: Record<string, string>
}

interface OptimizeResponse {
  success: boolean
  name?: string
  description?: string
  specifications?: Record<string, string>
  error?: string
}

function buildOptimizePrompt(data: OptimizeRequest): string {
  const specsText = Object.entries(data.specifications)
    .map(([k, v]) => `  "${k}": "${v}"`)
    .join('\n')

  return `You are a professional B2B e-commerce copywriter. Translate and rewrite the following product information into professional English suitable for an international B2B/B2C e-commerce platform.

Rules:
1. Translate all Chinese text to English
2. Keep technical specifications accurate — do not invent data
3. Product name: concise, descriptive, include key features (max 80 chars)
4. Description: 1-2 professional sentences highlighting key benefits
5. Specification keys and values: use standard English technical terminology
6. Return ONLY valid JSON, no markdown

Input:
{
  "name": "${data.name}",
  "description": "${data.description}",
  "specifications": {
${specsText}
  }
}

Output format:
{
  "name": "...",
  "description": "...",
  "specifications": { "Key": "Value", ... }
}`
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizeRequest = await request.json()

    if (!body.name) {
      return NextResponse.json<OptimizeResponse>(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const prompt = buildOptimizePrompt(body)
    const result = await generateText(prompt, undefined, {
      temperature: 0.4,
      maxTokens: 2048,
    })

    if (!result.success || !result.text) {
      return NextResponse.json<OptimizeResponse>(
        { success: false, error: result.error || 'Failed to optimize text' },
        { status: 500 }
      )
    }

    const parsed = parseJSONResponse<{ name: string; description: string; specifications: Record<string, string> }>(result.text)

    if (!parsed) {
      return NextResponse.json<OptimizeResponse>(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json<OptimizeResponse>({
      success: true,
      name: parsed.name,
      description: parsed.description,
      specifications: parsed.specifications,
    })
  } catch (error) {
    return NextResponse.json<OptimizeResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
