import { ProxyAgent } from 'undici'

const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || ''
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-v4'
const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const fetchOptions: RequestInit & { dispatcher?: ProxyAgent } = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    }
    if (PROXY_URL) {
      fetchOptions.dispatcher = new ProxyAgent(PROXY_URL)
    }
    const response = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, fetchOptions)

    if (!response.ok) {
      console.error('Embedding API error:', await response.text())
      return null
    }

    const data = await response.json()
    const embedding = data.data?.[0]?.embedding

    return Array.isArray(embedding) ? embedding : null
  } catch (error) {
    console.error('Embedding generation failed:', error)
    return null
  }
}

export function buildProductEmbeddingText(product: {
  name: string
  description?: string | null
  categoryName?: string | null
  usageScenes?: string[]
  specifications?: unknown
}): string {
  return [
    `商品名称：${product.name}`,
    product.categoryName ? `分类：${product.categoryName}` : '',
    product.description ? `描述：${product.description}` : '',
    product.usageScenes?.length ? `使用场景：${product.usageScenes.join('、')}` : '',
    product.specifications ? `规格：${JSON.stringify(product.specifications)}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
