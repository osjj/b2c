import { NextRequest, NextResponse } from 'next/server'
import { buildQuoteItemsFromSelections } from '@/lib/ai-quote'
import { buildProductEmbeddingText, generateEmbedding } from '@/lib/embeddings'
import { generateText, parseJSONResponse } from '@/lib/openai'
import { searchProductsByEmbedding } from '@/lib/vector-search'
import type { AiQuoteResponse, AiQuoteSelection } from '@/types/ai-quote'

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()

    if (typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'Please enter at least 5 characters describing your requirements.' },
        { status: 400 }
      )
    }

    const query = description.trim()
    const embedding = await generateEmbedding(query)

    if (!embedding) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'Failed to parse your requirements. Please try again.' },
        { status: 502 }
      )
    }

    const candidates = await searchProductsByEmbedding(embedding, 20)

    if (candidates.length === 0) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'No matching products found. Try rephrasing your description.' },
        { status: 404 }
      )
    }

    const candidateList = candidates
      .map((candidate, index) => {
        const context = buildProductEmbeddingText({
          name: candidate.name,
          description: candidate.description,
          categoryName: candidate.categoryName,
          usageScenes: candidate.usageScenes,
        }).replace(/\n/g, ' | ')

        return `${index + 1}. ID:${candidate.id} | Price:${candidate.price} | SKU:${candidate.sku ?? '-'} | ${context}`
      })
      .join('\n')

    const prompt = `You are an industrial PPE procurement advisor. Select the most relevant products from the candidates below to fulfill the user's requirements and return a quote.

User requirements:
${query}

Candidate products:
${candidateList}

Return a strict JSON array. Each item must follow this format:
[
  {
    "productId": "<candidate product ID>",
    "quantity": 10,
    "reason": "One concise English sentence explaining why this product fits the requirement."
  }
]

Rules:
1. Only select from the candidate list — do not invent products.
2. Only include genuinely relevant products. Return at most 8 items.
3. quantity must be a positive integer. If the user did not specify a headcount, default to 10.
4. The "reason" field must be written in English.
5. Do not output markdown, explanations, or extra fields.`

    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 2048,
    })

    if (!result.success || !result.text) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'AI product selection failed. Please try again.' },
        { status: 502 }
      )
    }

    const selections = parseJSONResponse<AiQuoteSelection[]>(result.text)

    if (!Array.isArray(selections)) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'Unexpected AI response format. Please try again.' },
        { status: 502 }
      )
    }

    const items = buildQuoteItemsFromSelections(selections, candidates)

    if (items.length === 0) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'Not enough matching products. Try rephrasing your description.' },
        { status: 404 }
      )
    }

    return NextResponse.json<AiQuoteResponse>({ success: true, items })
  } catch (error) {
    console.error('AI quote error:', error)

    return NextResponse.json<AiQuoteResponse>(
      { success: false, error: 'Server error. Please try again later.' },
      { status: 500 }
    )
  }
}
