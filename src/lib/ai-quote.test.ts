import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildQuoteItemsFromSelections,
  buildQuoteSheetRows,
  calculateQuoteTotal,
} from './ai-quote'
import { buildProductEmbeddingText } from './embeddings'

test('buildProductEmbeddingText includes structured product context', () => {
  const result = buildProductEmbeddingText({
    name: '防护手套',
    description: '适用于焊接作业',
    categoryName: '手部防护',
    usageScenes: ['steel-work', 'heavy-duty'],
    specifications: [{ name: '材质', value: '牛皮' }],
  })

  assert.match(result, /商品名称：防护手套/)
  assert.match(result, /分类：手部防护/)
  assert.match(result, /描述：适用于焊接作业/)
  assert.match(result, /使用场景：steel-work、heavy-duty/)
  assert.match(result, /规格：/)
})

test('buildQuoteItemsFromSelections filters invalid rows and normalizes quantity', () => {
  const result = buildQuoteItemsFromSelections(
    [
      { productId: 'p1', quantity: 0.4, reason: '基础配置' },
      { productId: 'missing', quantity: 5, reason: '无效商品' },
      { productId: 'p2', quantity: 3.6, reason: '追加备品' },
    ],
    [
      {
        id: 'p1',
        name: '安全帽',
        price: 25,
        sku: 'HM-001',
        description: '抗冲击',
        usageScenes: ['construction'],
        categoryName: '头部防护',
        image: '/helmet.png',
        similarity: 0.88,
      },
      {
        id: 'p2',
        name: '防割手套',
        price: 18.5,
        sku: null,
        description: '耐磨防割',
        usageScenes: ['steel-work'],
        categoryName: '手部防护',
        image: null,
        similarity: 0.82,
      },
    ]
  )

  assert.deepEqual(result, [
    {
      productId: 'p1',
      name: '安全帽',
      sku: 'HM-001',
      price: 25,
      quantity: 1,
      reason: '基础配置',
      image: '/helmet.png',
    },
    {
      productId: 'p2',
      name: '防割手套',
      sku: null,
      price: 18.5,
      quantity: 4,
      reason: '追加备品',
      image: null,
    },
  ])
})

test('buildQuoteSheetRows appends a total row based on current items', () => {
  const items = [
    {
      productId: 'p1',
      name: '安全帽',
      sku: 'HM-001',
      price: 25,
      quantity: 2,
      reason: '头部防护',
      image: null,
    },
    {
      productId: 'p2',
      name: '防护眼镜',
      sku: null,
      price: 16.5,
      quantity: 3,
      reason: '眼部防护',
      image: null,
    },
  ]

  assert.equal(calculateQuoteTotal(items), 99.5)
  assert.deepEqual(buildQuoteSheetRows(items, '2026/03/10').at(-1), ['', '', '', '合计', 99.5])
})
