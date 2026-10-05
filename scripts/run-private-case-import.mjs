// Next aliases the server-only marker, which is not a standalone installed
// Node package here. Strip that marker ONLY for this fixed, authorized CLI
// entrypoint; app imports retain the original build-time server-only guard.
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const built = await build({
  entryPoints: [process.argv.includes('--append-container-photo') || process.argv.includes('--append-quotation-example')
    ? 'scripts/append-case-draft-image.ts'
    : 'scripts/import-procurement-case-images.ts'],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'private-case-cli-server-marker', setup(plugin) {
    plugin.onResolve({ filter: /^server-only$/ }, () => ({ path: 'marker', namespace: 'cli-marker' }))
    plugin.onLoad({ filter: /.*/, namespace: 'cli-marker' }, () => ({ loader: 'js', contents: '' }))
  } }],
})
const bundledModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(nodeRequire, bundledModule, bundledModule.exports)
