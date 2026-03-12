import test from 'node:test'
import assert from 'node:assert/strict'
import { parseJSONResponse } from './openai'

test('parseJSONResponse extracts a JSON array wrapped in prose', () => {
  const result = parseJSONResponse<Array<{ productId: string; quantity: number }>>(`推荐如下：
[
  {
    "productId": "prod_1",
    "quantity": 12
  }
]`)

  assert.deepEqual(result, [{ productId: 'prod_1', quantity: 12 }])
})
