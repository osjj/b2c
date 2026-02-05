'use client'

import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  SolutionSectionInput,
  SolutionSectionType,
  SectionHeroData,
  SectionParagraphsData,
  SectionListData,
  SectionTableData,
  SectionGroupData,
  SectionCalloutData,
  SectionCtaData,
  SectionFaqData,
} from '@/types/solution'

const SECTION_OPTIONS: { value: SolutionSectionType; label: string }[] = [
  { value: 'hero', label: 'Hero Intro' },
  { value: 'paragraphs', label: 'Paragraphs' },
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
  { value: 'group', label: 'Grouped List' },
  { value: 'callout', label: 'Callout' },
  { value: 'cta', label: 'CTA' },
  { value: 'faq', label: 'FAQ' },
]

const createKey = (type: string) => {
  if (globalThis.crypto?.randomUUID) {
    return `${type}-${globalThis.crypto.randomUUID()}`
  }
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createDefaultData = (type: SolutionSectionType) => {
  switch (type) {
    case 'hero':
      return { intro: '', bullets: [] } satisfies SectionHeroData
    case 'paragraphs':
      return { paragraphs: [''] } satisfies SectionParagraphsData
    case 'list':
      return { items: [{ title: '', text: '' }] } satisfies SectionListData
    case 'table':
      return { headers: [''], rows: [['']] } satisfies SectionTableData
    case 'group':
      return { groups: [{ title: '', items: [''] }] } satisfies SectionGroupData
    case 'callout':
      return { text: '' } satisfies SectionCalloutData
    case 'cta':
      return {
        title: '',
        text: '',
        primaryLabel: '',
        primaryHref: '',
        secondaryLabel: '',
        secondaryHref: '',
      } satisfies SectionCtaData
    case 'faq':
      return { items: [{ q: '', a: '' }] } satisfies SectionFaqData
    default:
      return { text: '' }
  }
}

interface SolutionSectionsEditorProps {
  value: SolutionSectionInput[]
  onChange: (value: SolutionSectionInput[]) => void
}

export function SolutionSectionsEditor({ value, onChange }: SolutionSectionsEditorProps) {
  const addSection = () => {
    const type: SolutionSectionType = 'paragraphs'
    onChange([
      ...value,
      {
        key: createKey(type),
        type,
        title: '',
        enabled: true,
        data: createDefaultData(type),
      },
    ])
  }

  const updateSection = (index: number, patch: Partial<SolutionSectionInput>) => {
    onChange(value.map((section, i) => (i === index ? { ...section, ...patch } : section)))
  }

  const removeSection = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sections yet. Add a section to start building the content.
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((section, index) => (
            <div key={section.key} className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveSection(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveSection(index, index + 1)}
                    disabled={index === value.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Enabled</Label>
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={(checked) => updateSection(index, { enabled: checked })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSection(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section Type</Label>
                  <Select
                    value={section.type}
                    onValueChange={(value) => {
                      const type = value as SolutionSectionType
                      updateSection(index, {
                        type,
                        data: createDefaultData(type),
                        key: section.key || createKey(type),
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Anchor Key</Label>
                  <Input
                    value={section.key}
                    onChange={(e) => updateSection(index, { key: e.target.value })}
                    placeholder="section-key"
                  />
                  <p className="text-xs text-muted-foreground">Used for anchor links in the page.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Section Title</Label>
                <Input
                  value={section.title || ''}
                  onChange={(e) => updateSection(index, { title: e.target.value })}
                  placeholder="Section title (optional)"
                />
              </div>

              <SectionDataEditor
                section={section}
                onChange={(data) => updateSection(index, { data })}
              />
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addSection} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Section
      </Button>
    </div>
  )
}

function SectionDataEditor({
  section,
  onChange,
}: {
  section: SolutionSectionInput
  onChange: (data: SolutionSectionInput['data']) => void
}) {
  switch (section.type) {
    case 'hero':
      return <HeroSectionEditor data={section.data as SectionHeroData} onChange={onChange} />
    case 'paragraphs':
      return (
        <ParagraphsEditor data={section.data as SectionParagraphsData} onChange={onChange} />
      )
    case 'list':
      return <ListEditor data={section.data as SectionListData} onChange={onChange} />
    case 'table':
      return <TableEditor data={section.data as SectionTableData} onChange={onChange} />
    case 'group':
      return <GroupEditor data={section.data as SectionGroupData} onChange={onChange} />
    case 'callout':
      return <CalloutEditor data={section.data as SectionCalloutData} onChange={onChange} />
    case 'cta':
      return <CtaEditor data={section.data as SectionCtaData} onChange={onChange} />
    case 'faq':
      return <FaqEditor data={section.data as SectionFaqData} onChange={onChange} />
    default:
      return null
  }
}

function HeroSectionEditor({
  data,
  onChange,
}: {
  data: SectionHeroData
  onChange: (data: SectionHeroData) => void
}) {
  const bullets = Array.isArray(data.bullets) ? data.bullets : []
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Intro</Label>
        <Textarea
          value={data.intro || ''}
          onChange={(e) => onChange({ ...data, intro: e.target.value })}
          rows={3}
        />
      </div>
      <StringListEditor
        label="Bullets"
        value={bullets}
        onChange={(nextBullets) => onChange({ ...data, bullets: nextBullets })}
        placeholder="Bullet text"
      />
    </div>
  )
}

function ParagraphsEditor({
  data,
  onChange,
}: {
  data: SectionParagraphsData
  onChange: (data: SectionParagraphsData) => void
}) {
  const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : []
  return (
    <StringListEditor
      label="Paragraphs"
      value={paragraphs}
      onChange={(nextParagraphs) => onChange({ paragraphs: nextParagraphs })}
      placeholder="Paragraph text"
      multiline
    />
  )
}

function ListEditor({
  data,
  onChange,
}: {
  data: SectionListData
  onChange: (data: SectionListData) => void
}) {
  const items = Array.isArray(data.items) ? data.items : []

  const updateItem = (index: number, patch: Partial<SectionListData['items'][number]>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    onChange({ items: next })
  }

  const addItem = () => {
    onChange({ items: [...items, { title: '', text: '' }] })
  }

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center">No list items yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-2">
              <Input
                value={item.title || ''}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                placeholder="Item title (optional)"
              />
              <Textarea
                value={item.text || ''}
                onChange={(e) => updateItem(index, { text: e.target.value })}
                placeholder="Item text"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  )
}

function TableEditor({
  data,
  onChange,
}: {
  data: SectionTableData
  onChange: (data: SectionTableData) => void
}) {
  const headers = Array.isArray(data.headers) ? data.headers : []
  const rows = Array.isArray(data.rows) ? data.rows : []

  const updateHeader = (index: number, value: string) => {
    const nextHeaders = headers.map((header, i) => (i === index ? value : header))
    const nextRows = rows.map((row) => {
      const nextRow = [...row]
      while (nextRow.length < nextHeaders.length) nextRow.push('')
      return nextRow
    })
    onChange({ headers: nextHeaders, rows: nextRows })
  }

  const addColumn = () => {
    const nextHeaders = [...headers, '']
    const nextRows = rows.map((row) => [...row, ''])
    onChange({ headers: nextHeaders, rows: nextRows })
  }

  const removeColumn = (index: number) => {
    const nextHeaders = headers.filter((_, i) => i !== index)
    const nextRows = rows.map((row) => row.filter((_, i) => i !== index))
    onChange({ headers: nextHeaders, rows: nextRows })
  }

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((row, r) =>
      r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row
    )
    onChange({ headers, rows: nextRows })
  }

  const addRow = () => {
    onChange({ headers, rows: [...rows, headers.map(() => '')] })
  }

  const removeRow = (index: number) => {
    onChange({ headers, rows: rows.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Headers</Label>
        <div className="grid gap-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={header}
                onChange={(e) => updateHeader(index, e.target.value)}
                placeholder={`Header ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeColumn(index)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4 mr-2" />
          Add Column
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Rows</Label>
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid gap-2">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(headers.length, 1)}, minmax(0, 1fr))` }}>
                {(headers.length ? headers : ['']).map((_, colIndex) => (
                  <Input
                    key={`${rowIndex}-${colIndex}`}
                    value={row[colIndex] || ''}
                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                    placeholder={`Row ${rowIndex + 1} Col ${colIndex + 1}`}
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(rowIndex)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>
    </div>
  )
}

function GroupEditor({
  data,
  onChange,
}: {
  data: SectionGroupData
  onChange: (data: SectionGroupData) => void
}) {
  const groups = Array.isArray(data.groups) ? data.groups : []

  const updateGroup = (index: number, patch: Partial<SectionGroupData['groups'][number]>) => {
    const next = groups.map((group, i) => (i === index ? { ...group, ...patch } : group))
    onChange({ groups: next })
  }

  const addGroup = () => {
    onChange({ groups: [...groups, { title: '', items: [''] }] })
  }

  const removeGroup = (index: number) => {
    onChange({ groups: groups.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <div key={index} className="rounded-lg border p-3 space-y-2">
          <Input
            value={group.title || ''}
            onChange={(e) => updateGroup(index, { title: e.target.value })}
            placeholder="Group title"
          />
          <StringListEditor
            label="Items"
            value={Array.isArray(group.items) ? group.items : []}
            onChange={(items) => updateGroup(index, { items })}
            placeholder="List item"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeGroup(index)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addGroup}>
        <Plus className="h-4 w-4 mr-2" />
        Add Group
      </Button>
    </div>
  )
}

function CalloutEditor({
  data,
  onChange,
}: {
  data: SectionCalloutData
  onChange: (data: SectionCalloutData) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Callout Text</Label>
      <Textarea
        value={data.text || ''}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={3}
      />
    </div>
  )
}

function CtaEditor({
  data,
  onChange,
}: {
  data: SectionCtaData
  onChange: (data: SectionCtaData) => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={data.title || ''} onChange={(e) => onChange({ ...data, title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Text</Label>
          <Input value={data.text || ''} onChange={(e) => onChange({ ...data, text: e.target.value })} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Primary Label</Label>
          <Input
            value={data.primaryLabel || ''}
            onChange={(e) => onChange({ ...data, primaryLabel: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Primary Link</Label>
          <Input
            value={data.primaryHref || ''}
            onChange={(e) => onChange({ ...data, primaryHref: e.target.value })}
            placeholder="/contact"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Secondary Label</Label>
          <Input
            value={data.secondaryLabel || ''}
            onChange={(e) => onChange({ ...data, secondaryLabel: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Secondary Link</Label>
          <Input
            value={data.secondaryHref || ''}
            onChange={(e) => onChange({ ...data, secondaryHref: e.target.value })}
            placeholder="/products"
          />
        </div>
      </div>
    </div>
  )
}

function FaqEditor({
  data,
  onChange,
}: {
  data: SectionFaqData
  onChange: (data: SectionFaqData) => void
}) {
  const items = Array.isArray(data.items) ? data.items : []

  const updateItem = (index: number, patch: Partial<SectionFaqData['items'][number]>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    onChange({ items: next })
  }

  const addItem = () => {
    onChange({ items: [...items, { q: '', a: '' }] })
  }

  const removeItem = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-2">
          <Input
            value={item.q || ''}
            onChange={(e) => updateItem(index, { q: e.target.value })}
            placeholder="Question"
          />
          <Textarea
            value={item.a || ''}
            onChange={(e) => updateItem(index, { a: e.target.value })}
            placeholder="Answer"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        Add FAQ
      </Button>
    </div>
  )
}

function StringListEditor({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  multiline?: boolean
}) {
  const updateItem = (index: number, text: string) => {
    const next = value.map((item, i) => (i === index ? text : item))
    onChange(next)
  }

  const addItem = () => {
    onChange([...value, ''])
  }

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            {multiline ? (
              <Textarea
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={placeholder}
                rows={3}
              />
            ) : (
              <Input
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={placeholder}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  )
}
