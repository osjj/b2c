import { execFile } from 'node:child_process'
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'
import { QuotationError } from './errors'

const execFileAsync = promisify(execFile)
let scanInProgress = false

/** Local process only: never sends commercial images to a third-party scanner. */
export async function scanQuotationUpload(bytes: Buffer, environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  const executable = environment.QUOTATION_CLAMSCAN_PATH
  if (!executable) {
    if (environment.NODE_ENV === 'production') throw new QuotationError('FEATURE_DISABLED', '请先配置服务器的 QUOTATION_CLAMSCAN_PATH 图片安全扫描器')
    return
  }
  if (!isAbsolute(executable)) throw new QuotationError('FEATURE_DISABLED', '图片扫描器需要使用服务器绝对路径')
  if (scanInProgress) throw new QuotationError('FEATURE_DISABLED', '图片扫描器繁忙，请稍后重试')
  scanInProgress = true
  try {
  const directory = await mkdtemp(join(tmpdir(), 'quotation-scan-'))
  const target = join(directory, 'upload.bin')
  try {
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 })
    // Non-zero exit, timeout, missing database or executable all fail closed.
    await execFileAsync(executable, ['--no-summary', '--fail-if-cvd-older-than=7', target], { timeout: 45_000, maxBuffer: 64 * 1024, windowsHide: true })
  } catch {
    throw new QuotationError('FILE_NOT_CLEAN', '图片安全扫描未通过或扫描器不可用，请检查扫描器及病毒库更新状态')
  } finally {
    // Only the single file and empty directory created by this call, no recursive cleanup.
    await unlink(target).catch(() => undefined)
    await rmdir(directory).catch(() => undefined)
  }
  } finally { scanInProgress = false }
}
