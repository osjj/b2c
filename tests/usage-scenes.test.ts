import assert from 'node:assert'
import { formatUsageSceneLabel, mapIndustryToUsageScenes } from '../src/lib/usage-scenes'

assert.equal(formatUsageSceneLabel('height-work'), 'Height Work')
assert.deepEqual(mapIndustryToUsageScenes('CONSTRUCTION'), [
  'construction',
  'height-work',
  'steel-work',
  'falling-objects',
  'fall-protection',
  'heavy-duty',
  'impact-resistant',
  'slip-resistant',
])