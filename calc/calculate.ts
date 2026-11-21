import { defaultHeatingEfficiency, primaryFactor, SIMPLIFIED_HDD_KH } from './factors'
import { labelFromScore } from './label'
import type { EpcInput, EpcResult, ParsedEpc } from './types'
import { defaultVersionForDate } from './versions'

/**
 * Energiescore per formulestructuur:
 *   ES = Q_prim,tot / A_bruikbaar   [kWh/(m²·jaar)]
 * (Q already expressed in kWh/year in this implementation.)
 */
export function energiescoreFromPrimary(
  qPrimTotKwh: number,
  areaM2: number,
): number {
  if (areaM2 <= 0) return Number.NaN
  return qPrimTotKwh / areaM2
}

function transmissionLossKwh(input: EpcInput): number {
  const { surfaces: s, uValues: u } = input
  const hT =
    s.muurM2 * u.muur +
    s.dakM2 * u.dak +
    s.vloerM2 * u.vloer +
    s.raamM2 * u.raam +
    s.deurM2 * u.deur
  // Q = H_T · HDD  (W/K · K·h → Wh → kWh)
  return (hT * SIMPLIFIED_HDD_KH) / 1000
}

function swwNeedKwh(volumeM3: number): number {
  // Rough residential SWW demand ~ proportional to protected volume.
  return Math.max(0, volumeM3 * 2.2)
}

function auxNeedKwh(areaM2: number, ventilation: EpcInput['ventilationSystem']): number {
  const base = areaM2 * 3
  const ventBoost =
    ventilation === 'D' ? 8 : ventilation === 'C' ? 4 : ventilation === 'B' ? 3 : 0
  return base + areaM2 * ventBoost
}

function pvProductionKwh(kwp: number): number {
  // Belgian specific yield ≈ 900 kWh/kWp·year (indicative)
  return Math.max(0, kwp) * 900
}

/**
 * Simplified residential engine aligned with formulestructuur *structure*
 * (primary energy / usable floor area → label), not a byte-for-byte VEKA port.
 * Use the VEKA API compare path to reverse-engineer residual deltas.
 */
export function calculateEpc(input: EpcInput): EpcResult {
  const notes: string[] = []
  const eta = input.heatingEfficiency > 0 ? input.heatingEfficiency : defaultHeatingEfficiency(input.heatingFuel)
  if (input.heatingEfficiency <= 0) {
    notes.push(`Heating efficiency defaulted to ${eta} for fuel ${input.heatingFuel}`)
  }

  const qTrans = transmissionLossKwh(input)
  const qHeatFinal = qTrans / eta
  const qSwwFinal = swwNeedKwh(input.beschermdVolumeM3) / Math.min(eta, 1)
  const qAux = auxNeedKwh(input.bruikbareVloeroppervlakteM2, input.ventilationSystem)
  const qCool = 0
  const qPv = pvProductionKwh(input.pvKwp)
  if (input.solarThermalM2 > 0) {
    notes.push('Solar thermal reduces SWW; simplified model credits 300 kWh/m²·jaar')
  }
  const solarThermalCredit = input.solarThermalM2 * 300
  const qSwwNet = Math.max(0, qSwwFinal - solarThermalCredit)

  const fpHeat = primaryFactor(input.heatingFuel, input.version)
  const fpElec = primaryFactor('elektriciteit', input.version)
  const fpPv = primaryFactor('pv', input.version)

  const primHeat = qHeatFinal * fpHeat
  const primSww = qSwwNet * fpHeat
  const primAux = qAux * fpElec
  const primCool = qCool * fpElec
  const primPv = -qPv * fpPv

  const primTot = primHeat + primSww + primAux + primCool + primPv
  const score = energiescoreFromPrimary(primTot, input.bruikbareVloeroppervlakteM2)
  const rounded = Math.round(score)

  notes.push(
    'Fidelity: simplified-formulestructuur — compare with VEKA API Berekening to isolate deltas.',
  )

  return {
    version: input.version,
    energiescore: rounded,
    label: labelFromScore(rounded),
    breakdown: {
      ruimteverwarmingKwh: round1(qHeatFinal),
      swwKwh: round1(qSwwNet),
      hulpenergieKwh: round1(qAux),
      koelingKwh: round1(qCool),
      pvExportKwh: round1(qPv),
      primairRuimteverwarmingKwh: round1(primHeat),
      primairSwwKwh: round1(primSww),
      primairHulpKwh: round1(primAux),
      primairKoelingKwh: round1(primCool),
      primairPvKwh: round1(primPv),
      primairTotaalKwh: round1(primTot),
    },
    notes,
    fidelity: 'simplified-formulestructuur',
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function inputFromParsed(
  parsed: ParsedEpc,
  overrides: Partial<EpcInput> = {},
): EpcInput {
  const area = overrides.bruikbareVloeroppervlakteM2 ?? parsed.bruikbareVloeroppervlakteM2 ?? 150
  const volume = overrides.beschermdVolumeM3 ?? parsed.beschermdVolumeM3 ?? area * 2.7
  const fuel = overrides.heatingFuel ?? parsed.heatingFuel

  // Default envelope if PDF only had totals: rough box from area + dwelling type
  const defaults = defaultEnvelope(area, overrides.dwellingType ?? parsed.dwellingType)

  return {
    version: overrides.version ?? defaultVersionForDate(),
    bruikbareVloeroppervlakteM2: area,
    beschermdVolumeM3: volume,
    bouwjaar: overrides.bouwjaar ?? parsed.bouwjaar,
    dwellingType: overrides.dwellingType ?? parsed.dwellingType,
    heatingFuel: fuel,
    heatingEfficiency: overrides.heatingEfficiency ?? defaultHeatingEfficiency(fuel),
    surfaces: overrides.surfaces ?? defaults.surfaces,
    uValues: overrides.uValues ?? defaults.uValues,
    pvKwp: overrides.pvKwp ?? 0,
    solarThermalM2: overrides.solarThermalM2 ?? 0,
    ventilationSystem: overrides.ventilationSystem ?? 'geen',
  }
}

function defaultEnvelope(area: number, type: EpcInput['dwellingType']) {
  const compact =
    type === 'appartement' ? 0.55 : type === 'gesloten' ? 0.75 : type === 'halfopen' ? 0.9 : 1
  const wall = area * 1.1 * compact
  const roof = area * (type === 'appartement' ? 0.15 : 0.85)
  const floor = area * (type === 'appartement' ? 0.15 : 0.85)
  const window = area * 0.2
  const door = 2
  return {
    surfaces: {
      muurM2: round1(wall),
      dakM2: round1(roof),
      vloerM2: round1(floor),
      raamM2: round1(window),
      deurM2: door,
    },
    uValues: {
      muur: 1.7,
      dak: 1.2,
      vloer: 1.0,
      raam: 2.8,
      deur: 3.5,
    },
  }
}

export function emptyParsed(): ParsedEpc {
  return {
    source: 'manual',
    attestnummer: null,
    address: null,
    energiescore: null,
    label: null,
    bruikbareVloeroppervlakteM2: 150,
    beschermdVolumeM3: 405,
    bouwjaar: 1975,
    dwellingType: 'vrijstaand',
    heatingFuel: 'aardgas',
    rawTextExcerpt: '',
    warnings: [],
  }
}
