import type { DiffRow, EpcResult, ParsedEpc } from './types'

export type ApiEpcResult = {
  energiescore: number | null
  label: string | null
  primairTotaalKwh?: number | null
  raw?: unknown
  error?: string
}

export function buildDiff(
  parsed: ParsedEpc,
  local: EpcResult,
  api: ApiEpcResult | null,
): DiffRow[] {
  const rows: DiffRow[] = [
    numRow('energiescore', parsed.energiescore, local.energiescore, api?.energiescore ?? null),
    strRow('label', parsed.label, local.label, api?.label ?? null),
    numRow(
      'primairTotaalKwh',
      null,
      local.breakdown.primairTotaalKwh,
      api?.primairTotaalKwh ?? null,
    ),
    numRow('bruikbareVloeroppervlakteM2', parsed.bruikbareVloeroppervlakteM2, null, null),
    numRow('beschermdVolumeM3', parsed.beschermdVolumeM3, null, null),
  ]
  return rows
}

function numRow(
  field: string,
  pdf: number | null,
  local: number | null,
  api: number | null,
): DiffRow {
  return {
    field,
    pdf,
    local,
    api,
    deltaLocalVsPdf: delta(local, pdf),
    deltaLocalVsApi: delta(local, api),
  }
}

function strRow(
  field: string,
  pdf: string | null,
  local: string | null,
  api: string | null,
): DiffRow {
  return {
    field,
    pdf,
    local,
    api,
    deltaLocalVsPdf: null,
    deltaLocalVsApi: null,
  }
}

function delta(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null
  return Math.round((a - b) * 10) / 10
}

/** Summarise whether local calc matches PDF / API within tolerance. */
export function matchSummary(
  local: EpcResult,
  parsed: ParsedEpc,
  api: ApiEpcResult | null,
  tolerance = 1,
) {
  const vsPdf =
    parsed.energiescore == null
      ? 'no-pdf-score'
      : Math.abs(local.energiescore - parsed.energiescore) <= tolerance
        ? 'match'
        : 'diff'
  const vsApi =
    api == null || api.energiescore == null
      ? 'no-api'
      : api.error
        ? 'api-error'
        : Math.abs(local.energiescore - api.energiescore) <= tolerance
          ? 'match'
          : 'diff'
  return { vsPdf, vsApi, tolerance }
}
