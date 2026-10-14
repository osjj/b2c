import assert from 'node:assert/strict'
import test from 'node:test'
import { readMailboxContent } from './content'
import { MailboxError } from './errors'

const id = '563512f6-8a7b-425e-a077-8d14e64e8071'

test('original content lookup is validated and account scoped, with explicit missing and legacy MIME states', async () => {
  let calls = 0
  const repository = { getMessage: async (account: string, messageId: string) => {
    calls++
    assert.equal(messageId, id)
    return account === 'owner@qq.com' ? { rawMime: null } : null
  } }
  await assert.rejects(readMailboxContent('owner@qq.com', '../wrong', repository), (error: unknown) => error instanceof MailboxError && error.code === 'VALIDATION_FAILED')
  assert.equal(calls, 0)
  await assert.rejects(readMailboxContent('other@qq.com', id, repository), (error: unknown) => error instanceof MailboxError && error.code === 'NOT_FOUND')
  assert.deepEqual(await readMailboxContent('owner@qq.com', id, repository), { html: null, hasRemoteImages: false, omittedImages: 0, inlineImageCount: 0 })
})
