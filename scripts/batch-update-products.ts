/**
 * 批量更新产品脚本
 *
 * 使用方法:
 * 1. 在 .env 文件中设置 BATCH_API_KEY
 * 2. 准备 scripts/data.json 文件（产品必须包含 slug 字段用于匹配）
 * 3. 运行: npx tsx scripts/batch-update-products.ts
 *
 * 或者指定自定义文件:
 * npx tsx scripts/batch-update-products.ts ./my-products.json
 */

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// 加载 .env 文件
config()

// 配置
const API_URL = process.env.API_URL || 'http://localhost:3000'
const API_KEY = process.env.BATCH_API_KEY || ''
const BATCH_SIZE = 50 // 每批次更新数量

interface ProductUpdate {
  slug: string // 必须，用于匹配产品
  name?: string
  description?: string
  price?: number
  comparePrice?: number
  cost?: number
  sku?: string
  stock?: number
  categoryId?: string
  isActive?: boolean
  isFeatured?: boolean
  images?: string[]
  specifications?: { name: string; value: string }[]
  content?: any
}

interface BatchResult {
  success: boolean
  slug: string
  id?: string
  error?: string
}

async function loadData(filePath: string): Promise<ProductUpdate[]> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf-8')
  const data = JSON.parse(content)

  // 支持两种格式: 数组 或 { products: [...] }
  if (Array.isArray(data)) {
    return data
  } else if (data.products && Array.isArray(data.products)) {
    return data.products
  } else {
    throw new Error('Invalid data format. Expected array or { products: [...] }')
  }
}

async function updateBatch(products: ProductUpdate[]): Promise<BatchResult[]> {
  const response = await fetch(`${API_URL}/api/admin/products/batch-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ products }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API error: ${response.status} - ${error}`)
  }

  const result = await response.json()
  return result.results
}

async function main() {
  console.log('========================================')
  console.log('       批量产品更新脚本')
  console.log('========================================\n')

  // 获取数据文件路径
  const dataFile = process.argv[2] || 'scripts/data.json'
  console.log(`📁 数据文件: ${dataFile}`)

  // 检查 API Key
  if (!API_KEY) {
    console.error('❌ 错误: 未设置 BATCH_API_KEY 环境变量')
    console.log('\n请在 .env 文件中添加:')
    console.log('BATCH_API_KEY=your-secret-api-key')
    process.exit(1)
  }

  console.log(`🌐 API 地址: ${API_URL}`)
  console.log(`📦 批次大小: ${BATCH_SIZE}\n`)

  try {
    // 加载数据
    console.log('📖 正在加载数据...')
    const products = await loadData(dataFile)
    console.log(`✅ 已加载 ${products.length} 个产品\n`)

    if (products.length === 0) {
      console.log('⚠️ 没有产品需要更新')
      return
    }

    // 分批更新
    const totalBatches = Math.ceil(products.length / BATCH_SIZE)
    let successCount = 0
    let failCount = 0
    const errors: { slug: string; error: string }[] = []

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, products.length)
      const batch = products.slice(start, end)

      console.log(`📤 更新批次 ${i + 1}/${totalBatches} (${batch.length} 个产品)...`)

      try {
        const results = await updateBatch(batch)

        for (const result of results) {
          if (result.success) {
            successCount++
            console.log(`  ✅ ${result.slug} -> ${result.id}`)
          } else {
            failCount++
            errors.push({ slug: result.slug, error: result.error || 'Unknown error' })
            console.log(`  ❌ ${result.slug}: ${result.error}`)
          }
        }
      } catch (error) {
        console.error(`  ❌ 批次更新失败:`, error)
        failCount += batch.length
        batch.forEach(p => errors.push({ slug: p.slug, error: 'Batch update failed' }))
      }

      // 批次间延迟，避免请求过快
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 打印结果摘要
    console.log('\n========================================')
    console.log('               更新完成')
    console.log('========================================')
    console.log(`✅ 成功: ${successCount}`)
    console.log(`❌ 失败: ${failCount}`)
    console.log(`📊 总计: ${products.length}`)

    if (errors.length > 0) {
      console.log('\n失败详情:')
      errors.forEach(e => console.log(`  - ${e.slug}: ${e.error}`))
    }

  } catch (error) {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  }
}

main()
