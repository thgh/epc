import type { EpcInput } from './types'
import type { ApiEpcResult } from './compare'

/**
 * Optional client for the official VEKA EPC rekenmotor APIs:
 * - API Berekening (full input)
 * - API BerekenIndicatief (simplified → assumptions → full)
 *
 * Access is gated by VEKA (veka@vlaanderen.be), typically mTLS against
 * https://energie-*-secure.api.vlaanderen.be
 *
 * Until credentials are present we return a clear "not configured" result so
 * the playground and diff UI still work offline against the local engine.
 */
export type VekaConfig = {
  baseUrl: string
  certPath?: string
  keyPath?: string
  keyPassword?: string
}

export function readVekaConfig(): VekaConfig | null {
  const baseUrl = process.env.VEKA_EPC_API_URL?.trim()
  if (!baseUrl) return null
  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    certPath: process.env.VEKA_EPC_CLIENT_CERT,
    keyPath: process.env.VEKA_EPC_CLIENT_KEY,
    keyPassword: process.env.VEKA_EPC_CLIENT_KEY_PASSWORD,
  }
}

export async function callBerekening(input: EpcInput): Promise<ApiEpcResult> {
  const config = readVekaConfig()
  if (!config) {
    return {
      energiescore: null,
      label: null,
      error: 'VEKA_EPC_API_URL not configured',
    }
  }

  const body = toVekaBerekeningPayload(input)
  try {
    const response = await fetchWithOptionalMtls(
      `${config.baseUrl}/epc/berekening`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      },
      config,
    )
    if (!response.ok) {
      return {
        energiescore: null,
        label: null,
        error: `VEKA HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`,
        raw: body,
      }
    }
    const json = (await response.json()) as Record<string, unknown>
    return normalizeVekaResponse(json)
  } catch (error) {
    return {
      energiescore: null,
      label: null,
      error: error instanceof Error ? error.message : String(error),
      raw: body,
    }
  }
}

export async function callBerekenIndicatief(
  input: EpcInput,
): Promise<ApiEpcResult> {
  const config = readVekaConfig()
  if (!config) {
    return {
      energiescore: null,
      label: null,
      error: 'VEKA_EPC_API_URL not configured',
    }
  }

  const body = toVekaIndicatiefPayload(input)
  try {
    const response = await fetchWithOptionalMtls(
      `${config.baseUrl}/epc/berekenindicatief`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      },
      config,
    )
    if (!response.ok) {
      return {
        energiescore: null,
        label: null,
        error: `VEKA HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`,
        raw: body,
      }
    }
    const json = (await response.json()) as Record<string, unknown>
    return normalizeVekaResponse(json)
  } catch (error) {
    return {
      energiescore: null,
      label: null,
      error: error instanceof Error ? error.message : String(error),
      raw: body,
    }
  }
}

/**
 * Payload shapes are reverse-engineered placeholders.
 * Once VEKA API docs/access are available, adjust field names here and
 * keep golden fixtures under test/fixtures/veka/ to lock behaviour.
 */
export function toVekaBerekeningPayload(input: EpcInput) {
  return {
    formulestructuurVersie: input.version,
    bruikbareVloeroppervlakte: input.bruikbareVloeroppervlakteM2,
    beschermdVolume: input.beschermdVolumeM3,
    bouwjaar: input.bouwjaar,
    typeGebouweenheid: input.dwellingType,
    verwarming: {
      brandstof: input.heatingFuel,
      rendement: input.heatingEfficiency,
    },
    schil: {
      oppervlaktes: input.surfaces,
      uWaarden: input.uValues,
    },
    zonneEnergie: {
      pvKwp: input.pvKwp,
      zonneboilerM2: input.solarThermalM2,
    },
    ventilatie: input.ventilationSystem,
  }
}

export function toVekaIndicatiefPayload(input: EpcInput) {
  return {
    typeWoning: input.dwellingType,
    bruikbareVloeroppervlakte: input.bruikbareVloeroppervlakteM2,
    bouwjaar: input.bouwjaar,
    verwarming: input.heatingFuel,
    isolatie: {
      muurU: input.uValues.muur,
      dakU: input.uValues.dak,
      vloerU: input.uValues.vloer,
      raamU: input.uValues.raam,
    },
    pvKwp: input.pvKwp,
  }
}

function normalizeVekaResponse(json: Record<string, unknown>): ApiEpcResult {
  const score =
    num(json.energiescore) ??
    num(json.EnergieScore) ??
    num(json.score) ??
    nestedNum(json, ['resultaat', 'energiescore'])
  const label =
    str(json.energielabel) ??
    str(json.EnergieLabel) ??
    str(json.label) ??
    nestedStr(json, ['resultaat', 'energielabel'])
  const prim =
    num(json.primairEnergieverbruik) ??
    num(json.QprimTot) ??
    nestedNum(json, ['resultaat', 'primairTotaal'])

  return {
    energiescore: score,
    label,
    primairTotaalKwh: prim,
    raw: json,
  }
}

async function fetchWithOptionalMtls(
  url: string,
  init: RequestInit,
  config: VekaConfig,
): Promise<Response> {
  if (config.certPath && config.keyPath) {
    const cert = await Bun.file(config.certPath).text()
    const key = await Bun.file(config.keyPath).text()
    // Bun.tls custom client cert
    return fetch(url, {
      ...init,
      tls: {
        cert,
        key,
        passphrase: config.keyPassword,
      },
    } as RequestInit)
  }
  return fetch(url, init)
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function nestedNum(obj: Record<string, unknown>, path: string[]): number | null {
  let cur: unknown = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[key]
  }
  return num(cur)
}

function nestedStr(obj: Record<string, unknown>, path: string[]): string | null {
  let cur: unknown = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[key]
  }
  return str(cur)
}
