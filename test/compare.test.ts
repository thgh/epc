import { describe, expect, test } from 'bun:test'
import { buildDiff, matchSummary } from '../calc/compare'
import { calculateEpc, emptyParsed, inputFromParsed } from '../calc/calculate'

describe('compare', () => {
  test('flags pdf vs local delta', () => {
    const parsed = emptyParsed()
    parsed.energiescore = 250
    parsed.label = 'C'
    const local = calculateEpc(inputFromParsed(parsed))
    const diff = buildDiff(parsed, local, null)
    const scoreRow = diff.find((r) => r.field === 'energiescore')
    expect(scoreRow?.pdf).toBe(250)
    expect(scoreRow?.local).toBe(local.energiescore)
    expect(scoreRow?.deltaLocalVsPdf).not.toBeNull()
    expect(matchSummary(local, parsed, null).vsApi).toBe('no-api')
  })
})
