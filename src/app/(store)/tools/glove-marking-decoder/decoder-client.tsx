'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clipboard, Copy, FileText, RotateCcw } from 'lucide-react'
import { buildGloveMarkingReport, decodeGloveMarking, MAX_GLOVE_INPUT_LENGTH, type GloveDecodeContext, type GloveStandard } from '@/lib/glove-marking-decoder'
import { GLOVE_EDITIONS, GLOVE_EXAMPLES } from '@/lib/glove-marking-reference'
import { saveGloveMarkingInquiry } from '@/lib/glove-marking-inquiry'
import theme from '../tools-theme.module.css'
import styles from './decoder.module.css'
import { DecodedSections } from './decoded-sections'

export function GloveMarkingDecoder() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [standard, setStandard] = useState<GloveStandard | ''>('')
  const [edition, setEdition] = useState('')
  const [copying, setCopying] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const [manualReport, setManualReport] = useState<string | null>(null)
  const revision = useRef(0)
  const reportTextarea = useRef<HTMLTextAreaElement>(null)
  const fallback = useMemo<GloveDecodeContext | undefined>(() => {
    if (!standard || !edition || !GLOVE_EDITIONS[standard].some(option => option.value === edition)) return undefined
    return { standard, edition }
  }, [standard, edition])
  const result = useMemo(() => decodeGloveMarking(input, fallback), [input, fallback])
  const report = useMemo(() => buildGloveMarkingReport(input, fallback), [input, fallback])
  const canUseReport = result.hasDecodedFields && !result.inputError && report !== null
  const hasInput = input.trim().length > 0

  function clearFeedback() {
    revision.current += 1
    setFeedback('')
    setActionError('')
    setManualReport(null)
  }

  function reset() {
    clearFeedback()
    setInput('')
    setStandard('')
    setEdition('')
  }

  function loadExample(example: string) {
    clearFeedback()
    setInput(example)
    setStandard('')
    setEdition('')
  }

  async function copyReport() {
    if (!canUseReport || report === null || copying) return
    const copyRevision = revision.current
    setCopying(true)
    setFeedback('')
    setActionError('')
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
      await navigator.clipboard.writeText(report)
      if (copyRevision === revision.current) {
        setManualReport(null)
        setFeedback('Complete interpretation report copied, including the original input, warnings and unresolved details.')
      }
    } catch {
      if (copyRevision === revision.current) {
        setManualReport(report)
        setFeedback('Your browser could not copy the report automatically. The complete report is available below for manual copying.')
      }
    } finally {
      setCopying(false)
    }
  }

  function prepareInquiry() {
    if (!canUseReport) return
    setActionError('')
    setFeedback('')
    try {
      router.push(saveGloveMarkingInquiry(input, fallback))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The RFQ could not be prepared in this browser. Copy the report and add it to a normal quote request.')
    }
  }

  return (
    <div className={styles.workbench}>
      <section data-tool-panel className={`${theme.panel} ${styles.inputPanel}`} aria-labelledby="glove-input-title">
        <div className={styles.panelHeading}><div className={styles.headingGroup}><span className={styles.step}>01</span><div><p className={styles.eyebrow}>Start with the label</p><h2 id="glove-input-title">Paste the glove marking</h2></div></div><button type="button" className={styles.textButton} onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Clear / reset</button></div>
        <p className={styles.panelDescription}>Include the full standard reference, its edition and the performance code. You can paste more than one standard; their meanings stay separate.</p>

        <div className={styles.editorGrid}>
          <div className={styles.editor}>
            <div className={styles.inputLabel}><label htmlFor="glove-marking-input">Label text</label><span id="glove-character-limit" className={input.length > MAX_GLOVE_INPUT_LENGTH ? styles.overLimit : undefined}>{input.length.toLocaleString('en-US')} / {MAX_GLOVE_INPUT_LENGTH.toLocaleString('en-US')} characters</span></div>
            <textarea id="glove-marking-input" value={input} onChange={event => { clearFeedback(); setInput(event.target.value) }} placeholder={'EN388:2016+A1:2018 4X43CP\nEN407:2020 X1XXXX'} spellCheck={false} aria-invalid={Boolean(result.inputError) || undefined} aria-describedby={`glove-input-help glove-character-limit${result.inputError ? ' glove-input-error' : ''}`} />
            <p id="glove-input-help" className={styles.help}>Up to {MAX_GLOVE_INPUT_LENGTH.toLocaleString('en-US')} characters and 8 standard sections. Extra text is retained for review. Avoid including employee or personal details.</p>
            <div className={styles.examples}><span>Try an example</span><div>{GLOVE_EXAMPLES.map(example => <button type="button" key={example.label} onClick={() => loadExample(example.input)}>{example.label}<ArrowRight size={13} aria-hidden="true" /></button>)}</div></div>
          </div>

          <fieldset className={styles.contextPanel}>
            <legend>Code-only context <span>Optional</span></legend>
            <p>Choose both values only if the code is missing a reference. A reference in the input always governs its own section.</p>
            <label htmlFor="glove-standard">Standard</label>
            <select id="glove-standard" value={standard} onChange={event => {
              const value = event.target.value
              if (value !== '' && value !== 'EN388' && value !== 'EN407') return
              clearFeedback()
              setStandard(value)
              setEdition('')
            }}><option value="">Use label references</option><option value="EN388">EN 388 · Mechanical</option><option value="EN407">EN 407 · Thermal</option></select>
            <label htmlFor="glove-edition">Exact edition</label>
            <select id="glove-edition" value={edition} disabled={!standard} onChange={event => { clearFeedback(); setEdition(event.target.value) }}><option value="">Select an edition explicitly</option>{standard && GLOVE_EDITIONS[standard].map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <p className={styles.contextState}>{fallback ? <>Explicit context: <strong>{fallback.standard === 'EN388' ? 'EN 388' : 'EN 407'}:{fallback.edition}</strong>. Matching missing references can use this context.</> : standard ? 'Select an edition to activate this context. No edition has been assumed.' : 'No fallback selected. Missing or unsupported editions remain unresolved.'}</p>
          </fieldset>
        </div>
        <div className={styles.scopeNote}><Clipboard size={17} aria-hidden="true" /><p>This explains marking text. It does not validate certification or establish chemical, electrical or needle protection, ANSI equivalence, or suitability for your task.</p></div>
      </section>

      <section data-tool-results className={styles.resultsPanel} aria-labelledby="glove-results-title">
        <div className={styles.panelHeading}><div className={styles.headingGroup}><span className={styles.step}>02</span><div><p className={styles.eyebrow}>Read each field in context</p><h2 id="glove-results-title">Your marking interpretation</h2></div></div><span className={styles.sectionCount}>{result.inputError ? 'Input needs attention' : `${result.sections.length} standard section${result.sections.length === 1 ? '' : 's'}`}</span></div>
        <p className={styles.resultDescription}>Field ratings describe their individual test categories. They do not form an overall protection grade or a certification decision.</p>
        <DecodedSections result={result} hasInput={hasInput} />
      </section>

      <section className={styles.reportPanel} aria-labelledby="glove-report-title">
        <div className={styles.reportIntro}><p className={styles.eyebrow}>03 · Keep the complete context</p><h2 id="glove-report-title">Share the interpretation, including its limits.</h2><p>The complete report includes your input, explicit context, interpreted fields, warnings, unresolved text, reference provenance and procurement checks. Review any RFQ before sending it.</p></div>
        <div className={styles.reportActions}><button type="button" className={styles.secondaryButton} disabled={!canUseReport || copying} onClick={copyReport}><Copy size={17} aria-hidden="true" />{copying ? 'Copying…' : 'Copy complete report'}</button><button type="button" className={styles.primaryButton} disabled={!canUseReport} onClick={prepareInquiry}>Prepare RFQ <ArrowRight size={17} aria-hidden="true" /></button></div>
        {!canUseReport && <p className={styles.reportHint}>A report becomes available when at least one field is decoded and the input is within the tool’s limits.</p>}
        <p className={styles.liveStatus} role="status" aria-live="polite">{feedback}</p>
        {actionError && <div className={styles.errorBox} role="alert"><strong>{actionError}</strong><p>Your input and interpretation are retained here. You can copy the report for a manual quote request.</p></div>}
        {manualReport !== null && <div className={styles.manualCopy}><div><label htmlFor="glove-manual-report"><FileText size={17} aria-hidden="true" /> Complete report for manual copying</label><button type="button" className={styles.textButton} onClick={() => { reportTextarea.current?.focus(); reportTextarea.current?.select() }}>Select full report</button></div><p id="glove-manual-copy-help">Select the report, then use your device’s Copy command or Ctrl+C / ⌘C. The full text is retained below.</p><textarea ref={reportTextarea} id="glove-manual-report" readOnly value={manualReport} aria-describedby="glove-manual-copy-help" spellCheck={false} /></div>}
      </section>
    </div>
  )
}
