import type { FormulaVersionId, HeatingFuel } from './types'

/**
 * Primary energy conversion factors f_p.
 * Formulestructuur EPC: electricity uses a fixed primary factor (historically 2.5).
 * Version hooks exist so we can pin diffs when VEKA publishes updates.
 */
export function primaryFactor(
  fuel: HeatingFuel | 'pv',
  version: FormulaVersionId,
): number {
  void version
  switch (fuel) {
    case 'elektriciteit':
    case 'warmtepomp':
    case 'pv':
      return 2.5
    case 'aardgas':
    case 'stookolie':
    case 'hout':
    case 'stadswarmte':
      return 1
    case 'onbekend':
      return 1
  }
}

/** Approximate seasonal system efficiency η when PDF does not state one. */
export function defaultHeatingEfficiency(fuel: HeatingFuel): number {
  switch (fuel) {
    case 'warmtepomp':
      return 3.5
    case 'aardgas':
      return 0.9
    case 'stookolie':
      return 0.85
    case 'elektriciteit':
      return 1
    case 'hout':
      return 0.75
    case 'stadswarmte':
      return 0.95
    case 'onbekend':
      return 0.85
  }
}

/**
 * Heating degree-days × ΔT factor used in the simplified transmission model.
 * Official method uses monthly climate data; this is a playground stand-in.
 */
export const SIMPLIFIED_HDD_KH = 50_000 // ≈ degree-hours for Belgian climate at θi=18°C
