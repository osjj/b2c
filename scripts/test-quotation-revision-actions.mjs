// Isolated manual UI regression harness. No .env, database, R2 or real Server Actions.
// Run: node scripts/test-quotation-revision-actions.mjs
// Open the printed loopback URL; choose a response, finalize, then complete the mock request.
import { createServer } from 'node:http'
import { build } from 'esbuild'

const mockModule = `
let snapshot = { version: 12, state: 'READY', calls: 0, refreshes: 0, lastVersion: null, pending: false, mode: 'font' };
let serverVersion = 12;
let serverState = 'READY';
let pending;
const listeners = new Set();
function update(next) { snapshot = { ...snapshot, ...next }; for (const fn of listeners) fn(); }
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const getSnapshot = () => snapshot;
export const setMode = mode => update({ mode });
export function complete() {
  if (!pending) return;
  const { resolve, reject } = pending; pending = null;
  update({ pending: false });
  if (snapshot.mode === 'network') { reject(new Error('PRIVATE raw network error')); return; }
  serverVersion += 2;
  if (snapshot.mode === 'success') {
    serverState = 'FINALIZED'; resolve({ success: true, reason: 'Quotation finalized', data: {} }); return;
  }
  const reason = snapshot.mode === 'font'
    ? 'PDF generation: No usable system font. Set QUOTATION_PDF_FONT_PATH on the server. Reference: mock-font-attempt'
    : 'Private document storage: R2 credentials were rejected. Check the matching keys on the server. Reference: mock-r2-attempt';
  resolve({ success: false, code: 'DOCUMENT_GENERATION_FAILED', reason });
}
const router = {
  push() {},
  refresh() { update({ refreshes: snapshot.refreshes + 1, version: serverVersion, state: serverState }); }
};
export const useRouter = () => router;
export function finalizeSalesQuotation(input) {
  update({ calls: snapshot.calls + 1, lastVersion: input.expectedVersion, pending: true });
  if (input.expectedVersion !== serverVersion) return Promise.resolve({ success: false, reason: 'Quotation revision changed', code: 'VERSION_CONFLICT' });
  return new Promise((resolve, reject) => { pending = { resolve, reject }; });
}
const unsupported = async () => ({ success: false, reason: 'This harness only simulates finalization.' });
export const copySalesQuotationRevision = unsupported;
export const copySalesQuotationToCustomer = unsupported;
export const setSalesQuotationOutcome = unsupported;
export const transitionSalesQuotationRevision = unsupported;
export const voidAndCopySalesQuotationRevision = unsupported;
`

const bundle = await build({
  stdin: {
    contents: `
import React, { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { RevisionActions } from './src/components/admin/quotation/revision-actions';
import { subscribe, getSnapshot, setMode, complete } from 'quotation-ui-mocks';
function Harness() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return <main>
    <h1>Quotation action regression test</h1>
    <p>Isolated simulation: no database, R2, real customer or quotation writes.</p>
    <label>Simulated response <select value={state.mode} disabled={state.pending} onChange={e => setMode(e.target.value)}>
      <option value="font">Missing PDF font</option><option value="r2">R2 signature failure</option>
      <option value="network">Network rejection</option><option value="success">Success</option>
    </select></label>
    <button onClick={complete} disabled={!state.pending}>Complete simulated request</button>
    <p>Calls: {state.calls} | Refreshes: {state.refreshes} | Version: {state.version} | Last submitted version: {state.lastVersion ?? '-'} | State: {state.state}</p>
    <hr />
    <RevisionActions revisionId="mock-revision" version={state.version} state={state.state} customers={[]} currentCustomerId="mock-customer" outcomeStatus="OPEN" />
  </main>;
}
createRoot(document.getElementById('root')).render(<Harness />);`,
    resolveDir: process.cwd(), loader: 'tsx',
  },
  bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'isolated-quotation-actions', setup(plugin) {
    plugin.onResolve({ filter: /^(next\/navigation|@\/actions\/admin\/sales-quotations|quotation-ui-mocks)$/ }, () => ({ path: 'mocks', namespace: 'quotation-test' }))
    plugin.onLoad({ filter: /.*/, namespace: 'quotation-test' }, () => ({ contents: mockModule, loader: 'js' }))
  } }],
})
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quotation UI isolated test</title>
<style>body{font-family:system-ui;margin:32px;color:#18232f}main{max-width:1000px;margin:auto}button,select{padding:10px;margin:4px;border:1px solid #ccd2da;border-radius:6px;background:white}button:disabled{opacity:.5}svg{width:16px;height:16px;vertical-align:middle} [role=alert]{margin-top:16px;padding:16px;border:1px solid #dd4444;color:#aa2020;overflow-wrap:anywhere}[role=status]{margin-top:16px;padding:12px;background:#f0f4f8}hr{margin:24px 0}</style>
</head><body><div id="root"></div><script src="/app.js"></script></body></html>`
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html) }
  else if (request.url === '/app.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(bundle.outputFiles[0].contents) }
  else { response.statusCode = 404; response.end() }
})
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (address && typeof address === 'object') process.stdout.write('Quotation UI harness: http://127.0.0.1:' + address.port + '/\n')
})
