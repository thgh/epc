import type { EpcLabel } from './types'

/**
 * Official residential EPC label bands (Vlaanderen, since 2019).
 * Source: VEKA / Statistiek Vlaanderen metadata + EPC uitleg pagina.
 *
 * A+: score <= 0
 * A:  0 < score <= 100
 * B:  100 < score <= 200
 * …
 * F:  score > 500
 */
export function labelFromScore(score: number): EpcLabel {
  if (score <= 0) return 'A+'
  if (score <= 100) return 'A'
  if (score <= 200) return 'B'
  if (score <= 300) return 'C'
  if (score <= 400) return 'D'
  if (score <= 500) return 'E'
  return 'F'
}

export const LABEL_BANDS: { label: EpcLabel; minExclusive: number; maxInclusive: number | null }[] = [
  { label: 'A+', minExclusive: -Infinity, maxInclusive: 0 },
  { label: 'A', minExclusive: 0, maxInclusive: 100 },
  { label: 'B', minExclusive: 100, maxInclusive: 200 },
  { label: 'C', minExclusive: 200, maxInclusive: 300 },
  { label: 'D', minExclusive: 300, maxInclusive: 400 },
  { label: 'E', minExclusive: 400, maxInclusive: 500 },
  { label: 'F', minExclusive: 500, maxInclusive: null },
]
