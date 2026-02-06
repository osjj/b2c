import test from 'node:test'
import assert from 'node:assert/strict'
import { createConnectorPath, isBodyLinkedList } from './body-link-map'

test('isBodyLinkedList only enables body map for essential categories with valid anchors', () => {
  assert.equal(
    isBodyLinkedList('essential-categories', [
      {
        title: 'Safety Helmets',
        text: 'Protection from falling objects and overhead impact',
        bodyAnchor: { x: 50, y: 10 },
      },
    ]),
    true
  )

  assert.equal(
    isBodyLinkedList('essential-categories', [
      {
        title: 'Work Gloves',
        text: 'Cut, abrasion, and impact resistance for material handling',
      },
    ]),
    false
  )

  assert.equal(
    isBodyLinkedList('recommended-ppe', [
      {
        title: 'Safety Helmets',
        text: 'Protection from falling objects and overhead impact',
        bodyAnchor: { x: 50, y: 10 },
      },
    ]),
    false
  )
})

test('createConnectorPath builds a straight SVG line path', () => {
  const path = createConnectorPath({ x: 10, y: 20 }, { x: 110, y: 40 })
  assert.equal(path, 'M 10 20 L 110 40')
})
