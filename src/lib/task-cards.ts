import { type UsageScene, formatUsageSceneLabel, USAGE_SCENES } from '@/lib/usage-scenes'

export type TaskCardItem = {
  scene: UsageScene
  checked: boolean
  title: string
  description: string
  items: string[]
}

export type SectionTaskCardsData = {
  cards: TaskCardItem[]
}

type TaskScenePreset = {
  scene: UsageScene
  title: string
  description: string
  image: string
  keywords: string[]
}

const TASK_SCENE_IMAGE_MAP: Record<UsageScene, string> = {
  construction: 'https://shop.laifappe.com/products/1770361042141-5g4f7h.webp',
  'height-work': 'https://shop.laifappe.com/products/1770363013217-v00ecj.webp',
  'steel-work': 'https://shop.laifappe.com/products/1770363171840-vvovvq.webp',
  'falling-objects': 'https://shop.laifappe.com/products/1770363417228-8idl7.webp',
  'fall-protection': 'https://shop.laifappe.com/products/1770363558455-ue8sc.webp',
  'heavy-duty': 'https://shop.laifappe.com/products/1770363682624-rh88v.webp',
  'impact-resistant': 'https://shop.laifappe.com/products/1770363786498-b6yeht.webp',
  'slip-resistant': 'https://shop.laifappe.com/products/1770364175627-o5kes.webp',
  'cut-resistant': 'https://shop.laifappe.com/products/1770364304717-hcw5yd.webp',
  'eye-protection': 'https://shop.laifappe.com/products/1770364995259-le5bcj.webp',
  'dusty-work': 'https://shop.laifappe.com/products/1770364908075-h46bo.webp',
  'wet-ground': 'https://shop.laifappe.com/products/1770364856674-ejeein.webp',
}

export const TASK_SCENE_PRESETS: TaskScenePreset[] = USAGE_SCENES.map((scene) => ({
  scene,
  title: formatUsageSceneLabel(scene),
  description: '',
  image: TASK_SCENE_IMAGE_MAP[scene],
  keywords: buildSceneKeywords(scene),
}))

function buildSceneKeywords(scene: UsageScene): string[] {
  const sceneKeywords: Record<UsageScene, string[]> = {
    construction: ['construction', 'site', 'jobsite'],
    'height-work': ['height', 'elevated', 'at height', 'fall'],
    'steel-work': ['steel', 'rebar', 'metal', 'fabrication'],
    'falling-objects': ['falling object', 'overhead', 'dropped'],
    'fall-protection': ['harness', 'lanyard', 'fall protection'],
    'heavy-duty': ['heavy', 'machinery', 'forklift', 'industrial'],
    'impact-resistant': ['impact', 'collision', 'struck'],
    'slip-resistant': ['slip', 'wet floor', 'anti-slip'],
    'cut-resistant': ['cut', 'sharp', 'laceration', 'blade'],
    'eye-protection': ['eye', 'goggle', 'debris', 'splash'],
    'dusty-work': ['dust', 'demolition', 'powder', 'airborne'],
    'wet-ground': ['wet', 'water', 'moist', 'mud'],
  }
  return [scene, formatUsageSceneLabel(scene).toLowerCase(), ...sceneKeywords[scene]]
}

export function getTaskScenePreset(scene: UsageScene): TaskScenePreset {
  return TASK_SCENE_PRESETS.find((preset) => preset.scene === scene) || TASK_SCENE_PRESETS[0]
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
}

function defaultTaskCard(scene: UsageScene, checked: boolean): TaskCardItem {
  const preset = getTaskScenePreset(scene)
  return {
    scene,
    checked,
    title: preset.title,
    description: preset.description,
    items: [],
  }
}

export function normalizeTaskCards(
  raw: unknown,
  defaultCheckedScenes: string[] = []
): SectionTaskCardsData {
  const checkedSet = new Set(defaultCheckedScenes.filter((scene): scene is UsageScene => USAGE_SCENES.includes(scene as UsageScene)))
  const cards = raw && typeof raw === 'object' && Array.isArray((raw as { cards?: unknown }).cards)
    ? (raw as { cards: unknown[] }).cards
    : []

  const cardMap = new Map<UsageScene, TaskCardItem>()

  for (const card of cards) {
    if (!card || typeof card !== 'object') continue
    const scene = (card as { scene?: unknown }).scene
    if (typeof scene !== 'string' || !USAGE_SCENES.includes(scene as UsageScene)) continue
    const preset = getTaskScenePreset(scene as UsageScene)
    cardMap.set(scene as UsageScene, {
      scene: scene as UsageScene,
      checked: typeof (card as { checked?: unknown }).checked === 'boolean'
        ? ((card as { checked: boolean }).checked)
        : checkedSet.has(scene as UsageScene),
      title: typeof (card as { title?: unknown }).title === 'string' && (card as { title: string }).title.trim()
        ? (card as { title: string }).title.trim()
        : preset.title,
      description: typeof (card as { description?: unknown }).description === 'string'
        ? (card as { description: string }).description.trim()
        : '',
      items: toStringList((card as { items?: unknown }).items),
    })
  }

  return {
    cards: USAGE_SCENES.map((scene) => cardMap.get(scene) || defaultTaskCard(scene, checkedSet.has(scene))),
  }
}

function findSceneByTitle(title: string, usedScenes: Set<UsageScene>): UsageScene | null {
  const normalizedTitle = normalizeText(title)
  if (!normalizedTitle) return null

  for (const preset of TASK_SCENE_PRESETS) {
    if (usedScenes.has(preset.scene)) continue
    if (preset.keywords.some((keyword) => normalizedTitle.includes(normalizeText(keyword)))) {
      return preset.scene
    }
  }

  return null
}

export function normalizeTaskCardsFromLegacyGroups(
  raw: unknown,
  defaultCheckedScenes: string[] = []
): SectionTaskCardsData {
  const result = normalizeTaskCards(undefined, defaultCheckedScenes)

  const groups = raw && typeof raw === 'object' && Array.isArray((raw as { groups?: unknown }).groups)
    ? (raw as { groups: unknown[] }).groups
    : []

  const cardsByScene = new Map(result.cards.map((card) => [card.scene, { ...card }]))
  const usedScenes = new Set<UsageScene>()

  for (const group of groups) {
    if (!group || typeof group !== 'object') continue
    const title = typeof (group as { title?: unknown }).title === 'string'
      ? (group as { title: string }).title.trim()
      : ''
    const description = typeof (group as { description?: unknown }).description === 'string'
      ? (group as { description: string }).description.trim()
      : ''
    const items = toStringList((group as { items?: unknown }).items)
    const scene = findSceneByTitle(title, usedScenes)
    if (!scene) continue

    const card = cardsByScene.get(scene)
    if (!card) continue
    card.checked = true
    card.title = title || card.title
    card.description = description || card.description
    card.items = items
    cardsByScene.set(scene, card)
    usedScenes.add(scene)
  }

  return {
    cards: USAGE_SCENES.map((scene) => cardsByScene.get(scene) || defaultTaskCard(scene, false)),
  }
}
