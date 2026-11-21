import type { FormulaVersionId } from './types'

export type FormulaVersion = {
  id: FormulaVersionId
  name: string
  validFrom: string
  validTo: string | null
  /** Official formulestructuur document */
  sourceUrl: string
  notes: string
}

/**
 * Official formulestructuur versions (VEKA / Belgisch Staatsblad).
 * Full calc rules live in those PDFs; this app pins behaviour per version id.
 */
export const FORMULA_VERSIONS: FormulaVersion[] = [
  {
    id: '2022',
    name: 'Formulestructuur EPC 2022',
    validFrom: '2022-01-01',
    validTo: '2023-12-31',
    sourceUrl:
      'https://assets.vlaanderen.be/image/upload/v1659343451/EPC_2022_Formulestructuur_r8m89y.pdf',
    notes: 'Residentieel + kleine niet-residentieel; geldig vanaf 1 jan 2022.',
  },
  {
    id: '2024',
    name: 'Formulestructuur EPC 2024',
    validFrom: '2024-01-01',
    validTo: '2026-06-30',
    sourceUrl:
      'https://www.vlaanderen.be/epc-pedia/info-type-a/documenten-voor-de-energiedeskundige-type-a',
    notes:
      'Bijlage 18/3 MB Energieprestaties; geldig vanaf 1 jan 2024 (BS 7 dec 2023).',
  },
  {
    id: '2026-07',
    name: 'Formulestructuur EPC vanaf 1-7-2026',
    validFrom: '2026-07-01',
    validTo: null,
    sourceUrl:
      'https://www.vlaanderen.be/epc-pedia/info-type-a/documenten-voor-de-energiedeskundige-type-a',
    notes: 'Aangekondigde formulestructuur vanaf 1 juli 2026.',
  },
]

export function getVersion(id: FormulaVersionId): FormulaVersion {
  const found = FORMULA_VERSIONS.find((v) => v.id === id)
  if (!found) throw new Error(`Unknown formula version: ${id}`)
  return found
}

export function defaultVersionForDate(isoDate = new Date().toISOString().slice(0, 10)): FormulaVersionId {
  if (isoDate >= '2026-07-01') return '2026-07'
  if (isoDate >= '2024-01-01') return '2024'
  return '2022'
}
