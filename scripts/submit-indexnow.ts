import { submitIndexNow } from '../src/lib/indexnow'

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function main(): Promise<void> {
  const urls = process.argv.slice(2)

  if (urls.length === 0) {
    throw new Error(
      'Usage: npm run indexnow:submit -- https://www.laifappe.com/path [additional URLs...]'
    )
  }

  const result = await submitIndexNow(urls)
  process.stdout.write(
    `IndexNow accepted ${result.submittedUrlCount} URL(s) with HTTP ${result.status}.\n`
  )
}

main().catch((error: unknown) => {
  process.stderr.write(`IndexNow submission failed: ${formatUnknownError(error)}\n`)
  process.exitCode = 1
})
