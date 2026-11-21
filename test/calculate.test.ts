import { describe, expect, test } from 'bun:test'
import { calculateEpc, energiescoreFromPrimary, inputFromParsed, emptyParsed } from '../calc/calculate'

describe('energiescoreFromPrimary', () => {
  test('divides primary energy by usable floor area', () => {
    expect(energiescoreFromPrimary(30_000, 150)).toBe(200)
  })
})

describe('calculateEpc', () => {
  test('returns label consistent with score', () => {
    const input = inputFromParsed(emptyParsed(), {
      version: '2024',
      bruikbareVloeroppervlakteM2: 150,
      beschermdVolumeM3: 400,
      heatingFuel: 'aardgas',
      heatingEfficiency: 0.9,
      pvKwp: 0,
    })
    const result = calculateEpc(input)
    expect(result.energiescore).toBeGreaterThan(0)
    expect(['A+', 'A', 'B', 'C', 'D', 'E', 'F']).toContain(result.label)
    expect(result.fidelity).toBe('simplified-formulestructuur')
  })

  test('PV lowers energiescore', () => {
    const base = inputFromParsed(emptyParsed(), { pvKwp: 0 })
    const withPv = inputFromParsed(emptyParsed(), { pvKwp: 8 })
    expect(calculateEpc(withPv).energiescore).toBeLessThan(calculateEpc(base).energiescore)
  })
})
