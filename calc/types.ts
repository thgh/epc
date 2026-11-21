/** Shared EPC model used by PDF parse, playground, and API comparison. */

export type EpcLabel = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export type FormulaVersionId = '2022' | '2024' | '2026-07'

export type DwellingType =
  | 'vrijstaand'
  | 'halfopen'
  | 'gesloten'
  | 'appartement'
  | 'onbekend'

export type HeatingFuel =
  | 'aardgas'
  | 'stookolie'
  | 'elektriciteit'
  | 'warmtepomp'
  | 'hout'
  | 'stadswarmte'
  | 'onbekend'

export type EnvelopeSurfaces = {
  muurM2: number
  dakM2: number
  vloerM2: number
  raamM2: number
  deurM2: number
}

export type EnvelopeUValues = {
  muur: number
  dak: number
  vloer: number
  raam: number
  deur: number
}

export type EpcInput = {
  version: FormulaVersionId
  bruikbareVloeroppervlakteM2: number
  beschermdVolumeM3: number
  bouwjaar: number | null
  dwellingType: DwellingType
  heatingFuel: HeatingFuel
  heatingEfficiency: number
  surfaces: EnvelopeSurfaces
  uValues: EnvelopeUValues
  /** Peak PV power in kWp; 0 = none */
  pvKwp: number
  /** Solar thermal collector area m² */
  solarThermalM2: number
  ventilationSystem: 'geen' | 'A' | 'B' | 'C' | 'D'
}

export type EnergyBreakdown = {
  ruimteverwarmingKwh: number
  swwKwh: number
  hulpenergieKwh: number
  koelingKwh: number
  pvExportKwh: number
  primairRuimteverwarmingKwh: number
  primairSwwKwh: number
  primairHulpKwh: number
  primairKoelingKwh: number
  primairPvKwh: number
  primairTotaalKwh: number
}

export type EpcResult = {
  version: FormulaVersionId
  energiescore: number
  label: EpcLabel
  breakdown: EnergyBreakdown
  notes: string[]
  fidelity: 'official-label-map' | 'simplified-formulestructuur'
}

export type ParsedEpc = {
  source: 'pdf' | 'manual'
  fileName?: string
  attestnummer: string | null
  address: string | null
  energiescore: number | null
  label: EpcLabel | null
  bruikbareVloeroppervlakteM2: number | null
  beschermdVolumeM3: number | null
  bouwjaar: number | null
  dwellingType: DwellingType
  heatingFuel: HeatingFuel
  rawTextExcerpt: string
  warnings: string[]
}

export type DiffRow = {
  field: string
  pdf: number | string | null
  local: number | string | null
  api: number | string | null
  deltaLocalVsPdf: number | null
  deltaLocalVsApi: number | null
}
