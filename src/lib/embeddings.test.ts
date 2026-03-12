import test from 'node:test'
import assert from 'node:assert/strict'
import { getEmbeddingConfig } from './embeddings'

test('getEmbeddingConfig prefers dedicated embedding environment variables', () => {
  const config = getEmbeddingConfig({
    EMBEDDING_API_ENDPOINT: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    EMBEDDING_API_KEY: 'dashscope-key',
    EMBEDDING_MODEL: 'text-embedding-v4',
    OPENAI_API_ENDPOINT: 'http://127.0.0.1:8317',
    OPENAI_API_KEY: 'openai-key',
  })

  assert.deepEqual(config, {
    apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: 'dashscope-key',
    model: 'text-embedding-v4',
  })
})

test('getEmbeddingConfig falls back to the existing openai variables when dedicated embedding variables are absent', () => {
  const config = getEmbeddingConfig({
    OPENAI_API_ENDPOINT: 'http://127.0.0.1:8317',
    OPENAI_API_KEY: 'openai-key',
  })

  assert.deepEqual(config, {
    apiEndpoint: 'http://127.0.0.1:8317',
    apiKey: 'openai-key',
    model: 'text-embedding-3-small',
  })
})
