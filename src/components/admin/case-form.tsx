'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form'
import type { FieldPathByValue } from 'react-hook-form'
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { saveCaseStudy } from '@/actions/admin/cases'
import { emptyCaseInput, isCaseSectionKey, type AdminCaseView, type CaseInput } from '@/lib/cases/types'
import { clearCaseSectionPlacement, initializeCaseSectionKeys } from '@/lib/cases/layout'
import { isCasePrivateImage } from '@/lib/cases/private-image-path'
import { generateSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CaseDocumentaryUpload } from './case-documentary-upload'

type TextPath = FieldPathByValue<CaseInput, string>
type FieldErrors = Record<string, string[]>

function editableValues(record?: AdminCaseView): CaseInput {
  if (!record) return emptyCaseInput()
  return {
    title: record.title, slug: record.slug, summary: record.summary,
    country: record.country, industry: record.industry, cooperationDate: record.cooperationDate,
    buyerProfile: record.buyerProfile, coverImage: record.coverImage, coverAlt: record.coverAlt,
    procurement: record.procurement, customization: record.customization, sections: initializeCaseSectionKeys(record.sections),
    timeline: record.timeline, gallery: record.gallery, relatedLinks: record.relatedLinks,
    status: record.status, featured: record.featured, sortOrder: record.sortOrder,
    seoTitle: record.seoTitle, seoDescription: record.seoDescription,
    privateNotes: record.privateNotes, publicationApproved: record.publicationApproved,
  }
}

function TextField({ name, label, rows, placeholder, help, required, maxLength, type = 'text', error }: {
  name: TextPath
  label: string
  rows?: number
  placeholder?: string
  help?: string
  required?: boolean
  maxLength?: number
  type?: 'text' | 'date'
  error?: string
}) {
  const { register } = useFormContext<CaseInput>()
  const id = `case-${name}`
  const descriptionIds = [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}{required ? ' *' : ''}</Label>
      {rows ? (
        <Textarea
          id={id} {...register(name)} rows={rows} placeholder={placeholder}
          required={required} maxLength={maxLength} aria-invalid={Boolean(error)}
          aria-describedby={descriptionIds || undefined}
        />
      ) : (
        <Input
          id={id} {...register(name)} type={type} placeholder={placeholder}
          required={required} maxLength={maxLength} aria-invalid={Boolean(error)}
          aria-describedby={descriptionIds || undefined} className="min-h-11"
        />
      )}
      {help ? <p id={`${id}-help`} className="text-xs leading-relaxed text-muted-foreground">{help}</p> : null}
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function RowControls({ index, count, name, remove, move }: {
  index: number
  count: number
  name: string
  remove: (index: number) => void
  move: (from: number, to: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{name} {String(index + 1).padStart(2, '0')}</span>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${name} ${index + 1} up`}>
          <ArrowUp className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index === count - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${name} ${index + 1} down`}>
          <ArrowDown className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" onClick={() => remove(index)} aria-label={`Remove ${name} ${index + 1}`}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function EditorCard({ number, title, description, children }: {
  number: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">{number}</span>
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">{children}</CardContent>
    </Card>
  )
}

function PrivateImagePreview({ src, alt }: { src: string; alt: string }) {
  if (!isCasePrivateImage(src)) return null
  return (
    <figure className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted/30">
        <Image src={src} alt={alt || 'Private draft source image'} fill unoptimized={isCasePrivateImage(src)} sizes="(max-width: 768px) 100vw, 640px" className="object-contain" />
      </div>
      <figcaption className="text-xs text-muted-foreground">Private original · Administrator access only</figcaption>
    </figure>
  )
}

export function CaseForm({ caseStudy }: { caseStudy?: AdminCaseView }) {
  const router = useRouter()
  const form = useForm<CaseInput>({ defaultValues: editableValues(caseStudy) })
  const { register, control, getValues, reset, setValue, handleSubmit, formState } = form
  const [id, setId] = useState(caseStudy?.id)
  const [version, setVersion] = useState(caseStudy?.version)
  const [savedStatus, setSavedStatus] = useState(caseStudy?.status ?? 'DRAFT')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [placementMessage, setPlacementMessage] = useState('')
  const [publishCandidate, setPublishCandidate] = useState<CaseInput | null>(null)
  const [archiveCandidate, setArchiveCandidate] = useState<CaseInput | null>(null)
  const status = useWatch({ control, name: 'status' })
  const coverImage = useWatch({ control, name: 'coverImage' })
  const coverAlt = useWatch({ control, name: 'coverAlt' })
  const galleryItems = useWatch({ control, name: 'gallery' })
  const [buyerProfile, procurementItems, customization, timelineItems, storySections] = useWatch({
    control, name: ['buyerProfile', 'procurement', 'customization', 'timeline', 'sections'],
  })
  const procurement = useFieldArray({ control, name: 'procurement' })
  const sections = useFieldArray({ control, name: 'sections' })
  const timeline = useFieldArray({ control, name: 'timeline' })
  const gallery = useFieldArray({ control, name: 'gallery' })
  const relatedLinks = useFieldArray({ control, name: 'relatedLinks' })

  const imagePlacements = [
    { value: 'buyer-context', label: 'Buyer context', populated: Boolean(buyerProfile?.trim()) },
    { value: 'procurement-scope', label: 'Procurement scope', populated: Boolean(procurementItems?.length) },
    { value: 'customization', label: 'Customization', populated: Boolean(customization?.trim()) },
    { value: 'project-timeline', label: 'Cooperation & logistics timeline', populated: Boolean(timelineItems?.length) },
    ...(storySections ?? []).flatMap((section, index) => section.key && isCaseSectionKey(section.key) ? [{
      value: `section:${section.key}`,
      label: `Story: ${section.title.trim() || `Untitled section ${index + 1}`}`,
      populated: Boolean(section.title.trim() && section.body.trim()),
    }] : []),
  ]

  function removeStorySection(index: number) {
    const section = getValues(`sections.${index}`)
    const currentGallery = getValues('gallery')
    const released = section?.key ? currentGallery.filter((image) => image.placement === `section:${section.key}`).length : 0
    if (released) setValue('gallery', clearCaseSectionPlacement(currentGallery, section.key), { shouldDirty: true })
    sections.remove(index)
    setPlacementMessage(released
      ? `Section removed. ${released} image${released === 1 ? '' : 's'} returned to Additional records. Choose a new “Show after” position in the image editor; no images were removed.`
      : 'Section removed. Existing images and their other assignments are unchanged.')
  }

  const textField = (name: TextPath, label: string, options?: Omit<React.ComponentProps<typeof TextField>, 'name' | 'label' | 'error'>) => (
    <TextField name={name} label={label} error={serverErrors[name]?.[0]} {...options} />
  )

  async function persist(values: CaseInput) {
    if (pending) return
    setPending(true)
    setError('')
    setMessage('')
    setServerErrors({})
    // Creation is always draft-only, matching the server's enforced default.
    const savedValues: CaseInput = id ? values : { ...values, status: 'DRAFT', publicationApproved: false }
    try {
      const result = await saveCaseStudy(savedValues, id, version)
      if (!result.success || !result.id || !result.version) {
        setError(result.reason || 'The case could not be saved. Your edits are still here.')
        setServerErrors(result.errors ?? {})
        return
      }
      setId(result.id)
      setVersion(result.version)
      setSavedStatus(savedValues.status)
      reset(savedValues)
      setMessage(savedValues.status === 'PUBLISHED'
        ? 'Case saved as published. The approved case can now appear on the public case pages.'
        : savedValues.status === 'ARCHIVED'
          ? 'Case archived. It is excluded from the public case pages and sitemap.'
          : 'Draft saved. It is excluded from public case pages and the sitemap.')
      if (!id) router.replace(`/admin/cases/${result.id}`)
      router.refresh()
    } catch {
      setError('The save result could not be confirmed. Your edits are still here. Open the latest saved version before retrying.')
    } finally {
      setPending(false)
    }
  }

  function submit(values: CaseInput) {
    if (!id) {
      void persist(values)
      return
    }
    if (values.status === 'PUBLISHED') {
      setPublishCandidate(values)
      return
    }
    // Withdrawing an already-public case also deserves an explicit confirmation.
    if (savedStatus === 'PUBLISHED' || values.status === 'ARCHIVED') {
      setArchiveCandidate(values)
      return
    }
    void persist(values)
  }

  const saveLabel = status === 'PUBLISHED'
    ? savedStatus === 'PUBLISHED' ? 'Update published case' : 'Publish case'
    : status === 'ARCHIVED' ? 'Archive case' : 'Save draft'

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(submit)} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={savedStatus === 'PUBLISHED' ? 'default' : 'outline'}>{savedStatus === 'PUBLISHED' ? 'Published' : savedStatus === 'ARCHIVED' ? 'Archived' : 'Unpublished draft'}</Badge>
              {version ? <span className="font-mono text-xs text-muted-foreground">Version {version}</span> : null}
              {formState.isDirty ? <span className="text-xs text-amber-700">Unsaved edits</span> : null}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">This administrator edits the shared site database. Imported private originals require administrator access; images added through the public uploader are publicly accessible.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {id ? (
              <Button type="button" variant="outline" asChild className="min-h-11">
                <Link href={`/admin/cases/${id}/preview`} target="_blank" rel="noopener noreferrer"><Eye className="mr-2 size-4" />Preview saved case</Link>
              </Button>
            ) : null}
            <Button type="submit" disabled={pending} className="min-h-11">
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              {pending ? 'Saving…' : saveLabel}
            </Button>
          </div>
        </div>

        {message ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</div> : null}
        {error ? (
          <div role="alert" className="space-y-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
            <p>{error}</p>
            {Object.keys(serverErrors).length ? (
              <ul className="list-inside list-disc space-y-1">
                {Object.entries(serverErrors).map(([field, messages]) => <li key={field}>{field}: {messages.join('; ')}</li>)}
              </ul>
            ) : null}
            {id ? <Link className="inline-block min-h-11 py-3 underline underline-offset-4" href={`/admin/cases/${id}`} target="_blank" rel="noopener noreferrer">Open latest saved version in a new tab</Link> : null}
          </div>
        ) : null}

        <fieldset disabled={pending} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <legend className="sr-only">Procurement case editor</legend>
          <div className="min-w-0 space-y-6">
            <EditorCard number="01" title="Case overview" description="Write in English. Identify the procurement context without disclosing a customer's identity unless publication is authorized.">
              {textField('title', 'Case title', { required: true, maxLength: 200, placeholder: 'PPE procurement for a South African mining company' })}
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                {textField('slug', 'URL slug', { required: true, maxLength: 160, placeholder: 'south-africa-mining-ppe-procurement', help: 'Lowercase words separated by hyphens. Changing a published URL does not create a redirect.' })}
                <Button type="button" variant="outline" className="min-h-11 sm:mb-6" onClick={() => setValue('slug', generateSlug(getValues('title')), { shouldDirty: true })}>Generate from title</Button>
              </div>
              {textField('summary', 'Listing summary', { rows: 3, maxLength: 1500, placeholder: 'A concise factual introduction shown on the case listing.' })}
              <div className="grid gap-4 sm:grid-cols-3">
                {textField('country', 'Buyer country', { maxLength: 100, placeholder: 'South Africa' })}
                {textField('industry', 'Industry', { maxLength: 100, placeholder: 'Mining' })}
                {textField('cooperationDate', 'Cooperation date', { type: 'date', help: 'The real cooperation date, not the publication date.' })}
              </div>
              {textField('buyerProfile', 'Buyer background', { rows: 3, maxLength: 3000, help: 'Do not present workforce size as the number of items ordered. Keep unsupported customer names out.' })}
            </EditorCard>

            <EditorCard number="02" title="Procurement schedule" description="Record each product, confirmed quantity and actual unit separately. Do not add together unlike units.">
              {procurement.fields.length === 0 ? <p className="text-sm text-muted-foreground">No procurement items yet. A published case requires at least one.</p> : null}
              {procurement.fields.map((row, index) => (
                <div key={row.id} className="space-y-4 rounded-lg border p-4">
                  <RowControls index={index} count={procurement.fields.length} name="Item" remove={procurement.remove} move={procurement.move} />
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
                    {textField(`procurement.${index}.name`, 'Product name', { maxLength: 160 })}
                    <div className="space-y-2">
                      <Label htmlFor={`case-procurement.${index}.quantity`}>Quantity</Label>
                      <Input id={`case-procurement.${index}.quantity`} type="number" min={1} max={1000000000} step={1} className="min-h-11" {...register(`procurement.${index}.quantity`, { valueAsNumber: true })} aria-invalid={Boolean(serverErrors[`procurement.${index}.quantity`])} />
                      {serverErrors[`procurement.${index}.quantity`]?.[0] ? <p className="text-xs text-destructive">{serverErrors[`procurement.${index}.quantity`][0]}</p> : null}
                    </div>
                    {textField(`procurement.${index}.unit`, 'Unit', { maxLength: 40, placeholder: 'pieces / pairs / sets' })}
                  </div>
                  {textField(`procurement.${index}.note`, 'Item notes', { rows: 2, maxLength: 1000, placeholder: 'Confirmed product details or requirements only.' })}
                </div>
              ))}
              <Button type="button" variant="outline" className="min-h-11" disabled={procurement.fields.length >= 40} onClick={() => procurement.append({ name: '', quantity: 1, unit: '', note: '' })}><Plus className="mr-2 size-4" />Add procurement item</Button>
              {textField('customization', 'Customization instructions', { rows: 4, maxLength: 6000, help: 'Specify confirmed logo color and positions. Do not invent a printing process or a color that was not agreed.' })}
            </EditorCard>

            <EditorCard number="03" title="The procurement story" description="Arrange the real background, selection and cooperation process into readable sections. Images follow the section chosen in their “Show after” field. Heading edits and section moves keep those assignments. Plain text is safely rendered; HTML is not supported.">
              {placementMessage ? <p role="status" className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-950">{placementMessage}</p> : null}
              {sections.fields.length === 0 ? <p className="text-sm text-muted-foreground">Add a narrative section to explain the case. At least one is required to publish.</p> : null}
              {sections.fields.map((row, index) => (
                <div key={row.id} className="space-y-4 rounded-lg border p-4">
                  <RowControls index={index} count={sections.fields.length} name="Section" remove={removeStorySection} move={sections.move} />
                  <input type="hidden" {...register(`sections.${index}.key`)} />
                  {serverErrors[`sections.${index}.key`]?.[0] ? <p className="text-xs text-destructive">{serverErrors[`sections.${index}.key`][0]} Remove and add this section again if its internal identity needs replacing.</p> : null}
                  {textField(`sections.${index}.title`, 'Section heading', { maxLength: 160 })}
                  {textField(`sections.${index}.body`, 'Section content', { rows: 7, maxLength: 12000 })}
                </div>
              ))}
              <Button type="button" variant="outline" className="min-h-11" disabled={sections.fields.length >= 20} onClick={() => sections.append({ key: `story-${crypto.randomUUID()}`, title: '', body: '' })}><Plus className="mr-2 size-4" />Add story section</Button>
            </EditorCard>

            <EditorCard number="04" title="Cooperation & logistics timeline" description="Report only milestones supported by the source. A warehouse or dispatch screenshot does not prove final delivery.">
              {timeline.fields.map((row, index) => (
                <div key={row.id} className="space-y-4 rounded-lg border p-4">
                  <RowControls index={index} count={timeline.fields.length} name="Milestone" remove={timeline.remove} move={timeline.move} />
                  <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
                    {textField(`timeline.${index}.date`, 'Date (optional)', { type: 'date' })}
                    {textField(`timeline.${index}.label`, 'Milestone', { maxLength: 160 })}
                  </div>
                  {textField(`timeline.${index}.description`, 'What is confirmed', { rows: 3, maxLength: 2000 })}
                </div>
              ))}
              <Button type="button" variant="outline" className="min-h-11" disabled={timeline.fields.length >= 30} onClick={() => timeline.append({ date: '', label: '', description: '' })}><Plus className="mr-2 size-4" />Add milestone</Button>
            </EditorCard>

            <EditorCard number="05" title="Documentary images & placement" description="Place each image immediately after its related text with “Show after”. Moving an image changes its order within that block. Unassigned images stay available as Additional records. Use genuine, permissioned and redacted photographs; certificate screenshots alone do not establish order-model correspondence or compliance.">
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">Imported private originals are for administrator-only draft review and cannot be published. Use permissioned, redacted public images before publication. The public uploader below is not private.</p>
              {gallery.fields.map((row, index) => (
                <div key={row.id} className="space-y-4 rounded-lg border p-4">
                  <RowControls index={index} count={gallery.fields.length} name="Image" remove={gallery.remove} move={gallery.move} />
                  {textField(`gallery.${index}.url`, 'Image URL', { maxLength: 2048, placeholder: '/cases/documentary-image.webp', help: 'Use a local path or the configured image host. Notion signed URLs are not permanent public assets.' })}
                  {textField(`gallery.${index}.alt`, 'Alternative text', { maxLength: 300, help: 'Describe what can actually be seen, without unsupported claims.' })}
                  {textField(`gallery.${index}.caption`, 'Evidence caption', { rows: 2, maxLength: 1000 })}
                  <div className="space-y-2">
                    <Label htmlFor={`case-gallery.${index}.placement`}>Show after</Label>
                    <Controller control={control} name={`gallery.${index}.placement`} render={({ field }) => (
                      <select
                        {...field} id={`case-gallery.${index}.placement`} value={field.value ?? ''}
                        aria-invalid={Boolean(serverErrors[`gallery.${index}.placement`])}
                        aria-describedby={`case-gallery.${index}.placement-help${serverErrors[`gallery.${index}.placement`]?.[0] ? ` case-gallery.${index}.placement-error` : ''}`}
                        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Additional records — no section assigned</option>
                        {imagePlacements.filter((option) => option.populated || option.value === field.value).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}{option.populated ? '' : ' (empty — add content)'}</option>
                        ))}
                        {field.value && !imagePlacements.some((option) => option.value === field.value) ? <option value={field.value}>Missing section — choose another position</option> : null}
                      </select>
                    )} />
                    <p id={`case-gallery.${index}.placement-help`} className="text-xs leading-relaxed text-muted-foreground">The image appears once, directly below this block. An assigned empty or removed block needs content or a different position before saving.</p>
                    {serverErrors[`gallery.${index}.placement`]?.[0] ? <p id={`case-gallery.${index}.placement-error`} className="text-xs text-destructive">{serverErrors[`gallery.${index}.placement`][0]}</p> : null}
                  </div>
                  <PrivateImagePreview src={galleryItems[index]?.url ?? ''} alt={galleryItems[index]?.alt ?? ''} />
                </div>
              ))}
              <Button type="button" variant="outline" className="min-h-11" disabled={gallery.fields.length >= 30} onClick={() => gallery.append({ url: '', alt: '', caption: '' })}><Plus className="mr-2 size-4" />Add image URL</Button>
              <CaseDocumentaryUpload id="case-gallery-upload" disabled={pending || gallery.fields.length >= 30} onUploaded={(url) => gallery.append({ url, alt: '', caption: '' })} />
            </EditorCard>

            <EditorCard number="06" title="Related pages" description="Connect this case to relevant product, category, solution or buying-guide pages. Use canonical internal paths only, without query strings.">
              {relatedLinks.fields.map((row, index) => (
                <div key={row.id} className="space-y-4 rounded-lg border p-4">
                  <RowControls index={index} count={relatedLinks.fields.length} name="Link" remove={relatedLinks.remove} move={relatedLinks.move} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {textField(`relatedLinks.${index}.label`, 'Link label', { maxLength: 160 })}
                    {textField(`relatedLinks.${index}.href`, 'Internal path', { maxLength: 500, placeholder: '/solutions/mining-quarry' })}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="min-h-11" disabled={relatedLinks.fields.length >= 12} onClick={() => relatedLinks.append({ label: '', href: '' })}><Plus className="mr-2 size-4" />Add related link</Button>
            </EditorCard>
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader><CardTitle>Publication controls</CardTitle><CardDescription>New cases start as unpublished drafts.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="case-status">Case status</Label>
                  <select id="case-status" {...register('status')} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="DRAFT">Draft — not public</option>
                    <option value="PUBLISHED" disabled={!id}>Published — public</option>
                    <option value="ARCHIVED" disabled={!id}>Archived — not public</option>
                  </select>
                  <p className="text-xs leading-relaxed text-muted-foreground">{id ? 'Changing the status takes effect only when saved. Publishing requires a separate final confirmation.' : 'Save the new case as a draft first. Publication controls unlock after the first save.'}</p>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed">Publication requires a summary, country, industry, at least one procurement item and one story section. Images need accurate alt text.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Controller control={control} name="publicationApproved" render={({ field }) => <Checkbox id="case-publicationApproved" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} className="mt-1" />} />
                  <Label htmlFor="case-publicationApproved" className="min-h-11 cursor-pointer text-xs leading-relaxed">I have reviewed the facts, anonymization and publication permissions for the text and every image. Claims about certification, delivery and outcomes match the available evidence.</Label>
                </div>
                {serverErrors.publicationApproved?.[0] ? <p className="text-xs text-destructive">{serverErrors.publicationApproved[0]}</p> : null}
                <p className="text-xs leading-relaxed text-muted-foreground">This confirmation is an editorial review, not verification of a certificate. Keep unresolved evidence in private notes.</p>
                <div className="flex items-center gap-3 border-t pt-4">
                  <Controller control={control} name="featured" render={({ field }) => <Checkbox id="case-featured" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />} />
                  <Label htmlFor="case-featured" className="flex min-h-11 items-center">Featured case</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case-sortOrder">Display order</Label>
                  <Input id="case-sortOrder" type="number" min={-100000} max={100000} step={1} className="min-h-11" {...register('sortOrder', { valueAsNumber: true })} />
                  <p className="text-xs text-muted-foreground">Featured cases appear first; lower values come first within each group.</p>
                  {serverErrors.sortOrder?.[0] ? <p className="text-xs text-destructive">{serverErrors.sortOrder[0]}</p> : null}
                </div>
                <Button type="submit" className="min-h-11 w-full" disabled={pending}>{pending ? 'Saving…' : saveLabel}</Button>
                {id ? <p className="text-xs text-muted-foreground">Preview shows the last saved version. Save changes before opening it.</p> : <p className="text-xs text-muted-foreground">Save the draft first to unlock its administrator-only preview.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Cover photograph</CardTitle><CardDescription>A real image is optional. No stock customer photos or invented scene images.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                {textField('coverImage', 'Cover image URL', { maxLength: 2048, placeholder: '/cases/cover.webp' })}
                {textField('coverAlt', 'Cover alternative text', { rows: 2, maxLength: 300 })}
                <PrivateImagePreview src={coverImage} alt={coverAlt} />
                <p className="text-xs leading-relaxed text-amber-800">A private cover is administrator-only and blocks publication. Replace it with an approved, redacted public image before publishing; the public uploader below does not keep uploads private.</p>
                <CaseDocumentaryUpload id="case-cover-upload" disabled={pending} onUploaded={(url) => setValue('coverImage', url, { shouldDirty: true })} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Search appearance</CardTitle><CardDescription>Optional English search and social preview overrides.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                {textField('seoTitle', 'SEO title', { maxLength: 160, help: 'Uses the case title when blank.' })}
                {textField('seoDescription', 'SEO description', { rows: 4, maxLength: 300, help: 'Uses the listing summary when blank. Drafts are excluded from public metadata.' })}
              </CardContent>
            </Card>

            <Card className="border-amber-200">
              <CardHeader><CardTitle>Private editorial notes</CardTitle><CardDescription>Only available to administrators; never rendered on the public case page.</CardDescription></CardHeader>
              <CardContent>
                {textField('privateNotes', 'Evidence & permission notes', { rows: 9, maxLength: 12000, placeholder: 'Record outstanding image permissions, certificate-model checks, missing delivery receipts and source references here.' })}
              </CardContent>
            </Card>
          </div>
        </fieldset>
      </form>

      <AlertDialog open={Boolean(publishCandidate)} onOpenChange={(open) => { if (!open) setPublishCandidate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{savedStatus === 'PUBLISHED' ? 'Update the public case?' : 'Publish this case?'}</AlertDialogTitle>
            <AlertDialogDescription>“{publishCandidate?.title}” will be saved as Published in the shared website database. Approved content can appear on /cases, its detail page and the sitemap. Verify the facts and permissions before continuing.</AlertDialogDescription>
          </AlertDialogHeader>
          {!publishCandidate?.publicationApproved ? <p className="text-sm text-destructive">Check the editorial review confirmation in the form before publishing.</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction disabled={!publishCandidate?.publicationApproved || pending} onClick={() => {
              const values = publishCandidate
              setPublishCandidate(null)
              if (values) void persist(values)
            }}>{savedStatus === 'PUBLISHED' ? 'Confirm public update' : 'Confirm publication'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(archiveCandidate)} onOpenChange={(open) => { if (!open) setArchiveCandidate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{archiveCandidate?.status === 'ARCHIVED' ? 'Archive this case?' : 'Withdraw this case to draft?'}</AlertDialogTitle>
            <AlertDialogDescription>This saves the case as {archiveCandidate?.status === 'ARCHIVED' ? 'Archived' : 'Draft'} in the shared database. It will be excluded from public case pages and the sitemap. The content remains available to administrators.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const values = archiveCandidate
              setArchiveCandidate(null)
              if (values) void persist(values)
            }}>Confirm status change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  )
}
