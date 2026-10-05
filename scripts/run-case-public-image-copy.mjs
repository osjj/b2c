// Fixed owner-approved CLI only; application server-only guards stay intact.
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const nodeRequire = createRequire(import.meta.url)
const built = await build({
  entryPoints: ['scripts/copy-procurement-case-public-images.ts'],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'case-public-copy-cli-marker', setup(plugin) {
    plugin.onResolve({ filter: /^server-only$/ }, () => ({ path: 'marker', namespace: 'cli-marker' }))
    plugin.onLoad({ filter: /.*/, namespace: 'cli-marker' }, () => ({ loader: 'js', contents: '' }))
  } }],
})
const bundledModule = { exports: {} }
new Function('require', 'module', 'exports', built.outputFiles[0].text)(nodeRequire, bundledModule, bundledModule.exports)
