import { describe, expect, test } from 'bun:test'
import { parseEpcText } from '../calc/parse-epc'

const SAMPLE = `
Energieprestatiecertificaat
Attestnummer 2024-1234567-1234-1234-1
Energielabel C
Energiescore 245 kWh/(m² jaar)
Bruikbare vloeroppervlakte 152 m²
Beschermd volume 410 m³
Bouwjaar 1978
Type: halfopen bebouwing
Verwarming: aardgas condensatieketel
`

describe('parseEpcText', () => {
  test('extracts core fields from fixture text', () => {
    const parsed = parseEpcText(SAMPLE, { fileName: 'sample.pdf' })
    expect(parsed.energiescore).toBe(245)
    expect(parsed.label).toBe('C')
    expect(parsed.bruikbareVloeroppervlakteM2).toBe(152)
    expect(parsed.beschermdVolumeM3).toBe(410)
    expect(parsed.bouwjaar).toBe(1978)
    expect(parsed.dwellingType).toBe('halfopen')
    expect(parsed.heatingFuel).toBe('aardgas')
    expect(parsed.attestnummer).toContain('2024-1234567')
  })
})
