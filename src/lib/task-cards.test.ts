import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TASK_SCENE_PRESETS,
  normalizeTaskCards,
  normalizeTaskCardsFromLegacyGroups,
} from './task-cards'

test('normalizeTaskCards always returns all 12 usage scenes', () => {
  const result = normalizeTaskCards({
    cards: [
      {
        scene: 'height-work',
        checked: true,
        title: 'Working at Height',
        description: 'Short description',
        items: ['Harness'],
      },
    ],
  })

  assert.equal(result.cards.length, TASK_SCENE_PRESETS.length)
  assert.equal(result.cards[0].scene, TASK_SCENE_PRESETS[0].scene)

  const height = result.cards.find((card) => card.scene === 'height-work')
  assert.deepEqual(height, {
    scene: 'height-work',
    checked: true,
    title: 'Working at Height',
    description: 'Short description',
    items: ['Harness'],
  })
})

test('normalizeTaskCards can pre-check cards from usageScenes', () => {
  const result = normalizeTaskCards(undefined, ['construction', 'wet-ground'])
  const construction = result.cards.find((card) => card.scene === 'construction')
  const wetGround = result.cards.find((card) => card.scene === 'wet-ground')
  const steelWork = result.cards.find((card) => card.scene === 'steel-work')

  assert.equal(construction?.checked, true)
  assert.equal(wetGround?.checked, true)
  assert.equal(steelWork?.checked, false)
})

test('normalizeTaskCardsFromLegacyGroups maps legacy group titles into scenes', () => {
  const result = normalizeTaskCardsFromLegacyGroups(
    {
      groups: [
        {
          title: 'Working at Height',
          description: 'Need fall prevention',
          items: ['Full body harness'],
        },
        {
          title: 'Dusty and Demolition Environments',
          items: ['Respirators'],
        },
      ],
    },
    []
  )

  const height = result.cards.find((card) => card.scene === 'height-work')
  const dusty = result.cards.find((card) => card.scene === 'dusty-work')

  assert.equal(height?.checked, true)
  assert.equal(height?.description, 'Need fall prevention')
  assert.deepEqual(height?.items, ['Full body harness'])
  assert.equal(dusty?.checked, true)
  assert.deepEqual(dusty?.items, ['Respirators'])
})

