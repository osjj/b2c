import { NextRequest, NextResponse } from 'next/server'
import { generateText, parseJSONResponse } from '@/lib/gemini'
import type {
  GenerateProductRequest,
  GenerateProductResponse,
  AIGeneratedProduct,
} from '@/types/ai-generation'

// 构建商品生成的 Prompt
function buildProductPrompt(
  presets: GenerateProductRequest['presets'],
  categoryName?: string,
  collectionNames?: string[],
  customPrompt?: string
): string {
  const languageMap = {
    en: 'English only',
    zh: 'Chinese (Simplified) only',
    both: 'Both English and Chinese (provide Chinese translations in parentheses for key fields)',
  }

  const language = languageMap[presets.language] || 'English only'

  let prompt = `You are a professional e-commerce product specialist. Analyze the provided product image(s) and generate complete product information.

IMPORTANT: Output language should be ${language}.

Based on the image(s), generate a JSON object with the following structure:

{
  "name": "Product name (descriptive, include brand if visible, key features)",
  "slug": "url-friendly-slug-lowercase-with-hyphens",
  "description": "2-3 sentence product description highlighting key features and benefits",
  "price": ${presets.basePrice || 'estimated price in USD based on product type'},
  "comparePrice": ${presets.basePrice ? (presets.basePrice * 1.15).toFixed(2) : 'original price (10-20% higher than price)'},
  "stock": 500,
  "sku": "CATEGORY-BRAND-NUMBER-VARIANT (e.g., SH-PG-001-WHT)",
  "isActive": true,
  "isFeatured": true,
  "images": ["placeholder-1.jpg", "placeholder-2.jpg", "placeholder-3.jpg"],
  "specifications": [
    { "name": "Material", "value": "..." },
    { "name": "Weight", "value": "..." },
    { "name": "Dimensions", "value": "..." },
    { "name": "Certification", "value": "..." },
    { "name": "Color", "value": "..." }
  ],
  "content": {
    "time": ${Date.now()},
    "blocks": [
      {
        "id": "header1",
        "type": "header",
        "data": { "text": "Key Features", "level": 2 }
      },
      {
        "id": "para1",
        "type": "paragraph",
        "data": { "text": "Detailed product description paragraph..." }
      },
      {
        "id": "image1",
        "type": "image",
        "data": { "file": { "url": "placeholder-detail-1.jpg" }, "caption": "Product detail view", "withBorder": false, "stretched": true, "withBackground": false }
      }
    ]
  },
  "priceTiers": [
    { "minQuantity": 1, "maxQuantity": 9, "price": ${presets.basePrice || '"base price"'} },
    { "minQuantity": 10, "maxQuantity": 49, "price": ${presets.basePrice ? (presets.basePrice * 0.95).toFixed(2) : '"5% discount"'} },
    { "minQuantity": 50, "maxQuantity": 99, "price": ${presets.basePrice ? (presets.basePrice * 0.9).toFixed(2) : '"10% discount"'} },
    { "minQuantity": 100, "maxQuantity": null, "price": ${presets.basePrice ? (presets.basePrice * 0.85).toFixed(2) : '"15% discount"'} }
  ]
}`

  if (categoryName) {
    prompt += `\n\nCategory: ${categoryName} (use this to inform the product type and specifications)`
  }

  if (collectionNames && collectionNames.length > 0) {
    prompt += `\n\nCollections: ${collectionNames.join(', ')} (consider these themes when writing descriptions)`
  }

  prompt += `

IMPORTANT RULES:
1. Analyze the image carefully to identify the product type, brand, features, and specifications
2. Generate realistic specifications based on what you can observe in the image
3. Create professional, e-commerce ready descriptions
4. The slug should be URL-friendly (lowercase, hyphens, no special characters)
5. SKU format: 2-letter category code + brand abbreviation + 3-digit number + variant code
6. Return ONLY valid JSON, no markdown formatting or explanations
7. All text content should be in ${language}`

  if (customPrompt) {
    prompt += `

USER INSTRUCTIONS (incorporate these into the product information):
${customPrompt}`
  }

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateProductRequest = await request.json()

    if (!body.images || body.images.length === 0) {
      return NextResponse.json<GenerateProductResponse>(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      )
    }

    const prompt = buildProductPrompt(
      body.presets,
      body.categoryName,
      body.collectionNames,
      body.customPrompt
    )

    const result = await generateText(prompt, body.images, {
      temperature: 0.7,
      maxTokens: 8192,
      model: body.model,
    })

    if (!result.success || !result.text) {
      return NextResponse.json<GenerateProductResponse>(
        { success: false, error: result.error || 'Failed to generate product data' },
        { status: 500 }
      )
    }

    const productData = parseJSONResponse<AIGeneratedProduct>(result.text)

    if (!productData) {
      console.error('Failed to parse response:', result.text)
      return NextResponse.json<GenerateProductResponse>(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // 添加预设的 categoryId 和 collectionIds
    if (body.presets.categoryId) {
      productData.categoryId = body.presets.categoryId
    }
    if (body.presets.collectionIds) {
      productData.collectionIds = body.presets.collectionIds
    }

    return NextResponse.json<GenerateProductResponse>({
      success: true,
      data: productData,
    })
  } catch (error) {
    console.error('Generate product API error:', error)
    return NextResponse.json<GenerateProductResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
