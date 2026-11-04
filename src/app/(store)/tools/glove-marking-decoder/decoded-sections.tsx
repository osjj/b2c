'use client'

import { AlertTriangle, Braces, HelpCircle } from 'lucide-react'
import type { GloveDecodeResult, GloveDecodedSection, GloveFieldStatus } from '@/lib/glove-marking-decoder'
import styles from './decoder.module.css'

const STATUS_LABELS: Record<GloveFieldStatus, string> = {
  rated: 'Rated field',
  'not-tested': 'No established result',
  'below-level-1': 'Below level 1',
  unresolved: 'Unresolved',
}

function MarkingWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return <div className={styles.warningBox}><div><AlertTriangle size={17} aria-hidden="true" /><strong>Details to keep with this interpretation</strong></div><ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>
}

function UnresolvedText({ values, title }: { values: string[]; title: string }) {
  if (values.length === 0) return null
  return <div className={styles.unknownBox}><h4><HelpCircle size={16} aria-hidden="true" />{title}</h4><p>These details have not been interpreted. Keep them with the original label and ask the supplier to clarify.</p><ul>{values.map((value, index) => <li key={index}><code>{value}</code></li>)}</ul></div>
}

function DecodedSection({ section, index }: { section: GloveDecodedSection; index: number }) {
  return (
    <article className={styles.standardSection} aria-labelledby={`glove-section-${index}`}>
      <header className={styles.standardHeader}>
        <div><p className={styles.eyebrow}>Standard section {index + 1}</p><h3 id={`glove-section-${index}`}><span>{section.standard === 'EN388' ? 'EN 388' : 'EN 407'}</span><span className={styles.edition}>{section.edition ?? 'Edition unresolved'}</span></h3></div>
        <span className={styles.parseBadge}>{section.complete ? 'Supplied fields read' : 'Unresolved details'}</span>
      </header>
      <dl className={styles.sectionContext}><div><dt>Reference context</dt><dd>{section.context || 'No supported edition established'}</dd></div><div><dt>Observed marking</dt><dd><code>{section.marking || 'No performance code identified'}</code></dd></div></dl>
      {section.fields.length > 0 ? <div className={styles.fieldGrid}>{section.fields.map(field => <div key={`${field.position}-${field.name}`} className={`${styles.fieldCard} ${field.status === 'unresolved' ? styles.unresolvedField : ''}`}>
        <div className={styles.fieldTop}><div><p>Position {field.position}</p><h4>{field.name}</h4></div><span className={styles.fieldCode}>{field.code}</span></div>
        <span className={styles.fieldStatus} data-status={field.status}>{STATUS_LABELS[field.status]}</span>
        <p className={styles.fieldMeaning}>{field.meaning}</p>
      </div>)}</div> : <div className={styles.noFields}><HelpCircle size={20} aria-hidden="true" /><p>No edition-dependent fields are shown for this section. Review its reference and unresolved details below.</p></div>}
      <MarkingWarnings warnings={section.warnings} />
      <UnresolvedText values={section.unknown} title="Unresolved section text" />
    </article>
  )
}

export function DecodedSections({ result, hasInput }: { result: GloveDecodeResult; hasInput: boolean }) {
  if (result.inputError) return <div id="glove-input-error" className={styles.errorBox} role="alert"><strong>Review the input before decoding.</strong><p>{result.inputError}</p><p>The input has been retained so you can edit it. No partial report is available.</p></div>
  if (!hasInput) return <div className={styles.emptyResult}><Braces size={30} aria-hidden="true" /><h3>The label’s details will appear here.</h3><p>Paste a full standard reference and performance code, or choose an example. Each standard stays in its own section.</p><div className={styles.emptyCodes} aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div></div>

  return <div className={styles.decodedContent}>
    {result.sections.map((section, index) => <DecodedSection key={section.id} section={section} index={index} />)}
    <MarkingWarnings warnings={result.warnings} />
    <UnresolvedText values={result.unknown} title="Unresolved input text" />
    {!result.hasDecodedFields && <p className={styles.unresolvedHelp}>No performance fields could be decoded with a supported edition. Include the full standard and edition, or explicitly select a matching context for a code-only marking.</p>}
  </div>
}
