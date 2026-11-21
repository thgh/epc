import { extractPdfText } from './pdf-text'
import type { DwellingType, EpcLabel, HeatingFuel, ParsedEpc } from './types'

const LABELS: EpcLabel[] = ['A+', 'A', 'B', 'C', 'D', 'E', 'F']

export function parseEpcPdf(bytes: Uint8Array, fileName: string): ParsedEpc {
  const { text, warnings } = extractPdfText(bytes)
  return parseEpcText(text, { fileName, warnings })
}

export function parseEpcText(
  text: string,
  opts: { fileName?: string; warnings?: string[] } = {},
): ParsedEpc {
  const warnings = [...(opts.warnings ?? [])]
  const normalized = text.replace(/\u00a0/g, ' ')

  const energiescore = firstNumber(normalized, [
    /energiescore[^0-9-]{0,40}(-?\d+(?:[.,]\d+)?)/i,
    /(-?\d+(?:[.,]\d+)?)\s*kWh\s*\/\s*m/i,
    /(-?\d+(?:[.,]\d+)?)\s*kWh\/\(m/i,
  ])

  const label = firstLabel(normalized)
  const area = firstNumber(normalized, [
    /bruikbare\s+vloeroppervlakte[^0-9]{0,40}(\d+(?:[.,]\d+)?)/i,
    /vloeroppervlakte[^0-9]{0,40}(\d+(?:[.,]\d+)?)\s*m/i,
  ])
  const volume = firstNumber(normalized, [
    /beschermd(?:e)?\s+volume[^0-9]{0,40}(\d+(?:[.,]\d+)?)/i,
    /beschermd\s+volume[^0-9]{0,40}(\d+(?:[.,]\d+)?)\s*m/i,
  ])
  const bouwjaar = firstNumber(normalized, [
    /bouwjaar[^0-9]{0,20}(19\d{2}|20\d{2})/i,
    /jaar\s+van\s+bouw[^0-9]{0,20}(19\d{2}|20\d{2})/i,
  ])

  const attestnummer =
    normalized.match(/attestnummer[^A-Z0-9]{0,20}([A-Z0-9][A-Z0-9\-\/ ]{5,})/i)?.[1]?.trim() ??
    normalized.match(/\b(\d{5}-\d{7}-\d{4}-\d{4}-\d{1,2})\b/)?.[1] ??
    null

  const address = guessAddress(normalized)
  const dwellingType = guessDwelling(normalized)
  const heatingFuel = guessFuel(normalized)

  if (energiescore == null) warnings.push('Could not find energiescore in PDF text')
  if (area == null) warnings.push('Could not find bruikbare vloeroppervlakte')

  return {
    source: 'pdf',
    fileName: opts.fileName,
    attestnummer,
    address,
    energiescore,
    label,
    bruikbareVloeroppervlakteM2: area,
    beschermdVolumeM3: volume,
    bouwjaar,
    dwellingType,
    heatingFuel,
    rawTextExcerpt: normalized.slice(0, 1200),
    warnings,
  }
}

function firstNumber(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const n = Number(m[1].replace(',', '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function firstLabel(text: string): EpcLabel | null {
  const m = text.match(/energielabel[^A-F+]{0,30}(A\+|A|B|C|D|E|F)\b/i)
  if (m?.[1]) {
    const v = m[1].toUpperCase() as EpcLabel
    if (LABELS.includes(v)) return v
  }
  // Standalone label near score colour bar wording
  const m2 = text.match(/\blabel\s*(A\+|A|B|C|D|E|F)\b/i)
  if (m2?.[1]) {
    const v = m2[1].toUpperCase() as EpcLabel
    if (LABELS.includes(v)) return v
  }
  return null
}

function guessAddress(text: string): string | null {
  const m = text.match(
    /(?:straat|laan|lei|steenweg|baan)[^.]{0,80}?\d{1,4}[a-zA-Z]?(?:\s*,?\s*\d{4}\s+[A-ZÀ-Ü][a-zà-ü\- ]+)?/i,
  )
  return m?.[0]?.trim() ?? null
}

function guessDwelling(text: string): DwellingType {
  const t = text.toLowerCase()
  if (t.includes('appartement') || t.includes('studio')) return 'appartement'
  if (t.includes('rijwoning') || t.includes('gesloten')) return 'gesloten'
  if (t.includes('halfopen') || t.includes('half-open')) return 'halfopen'
  if (t.includes('vrijstaand') || t.includes('open bebouwing')) return 'vrijstaand'
  return 'onbekend'
}

function guessFuel(text: string): HeatingFuel {
  const t = text.toLowerCase()
  if (t.includes('warmtepomp')) return 'warmtepomp'
  if (t.includes('stookolie') || t.includes('mazout')) return 'stookolie'
  if (t.includes('aardgas') || t.includes('gascondensatie') || t.includes('gasketel')) return 'aardgas'
  if (t.includes('elektrische verwarming') || t.includes('accumulatie')) return 'elektriciteit'
  if (t.includes('pellets') || t.includes('biomassa') || t.includes('houtkachel')) return 'hout'
  if (t.includes('stadsverwarming') || t.includes('warmtenet')) return 'stadswarmte'
  return 'onbekend'
}
