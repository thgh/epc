import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from 'react'
import type {
  DiffRow,
  EpcInput,
  EpcResult,
  FormulaVersionId,
  ParsedEpc,
} from '../../calc/types'
import { LabelBar } from './LabelBar'
import { NumberField } from './NumberField'

type CalcResponse = {
  local: EpcResult
  api: {
    energiescore: number | null
    label: string | null
    error?: string
  } | null
  diff: DiffRow[]
  match: { vsPdf: string; vsApi: string; tolerance: number }
  vekaConfigured: boolean
}

type ParseResponse = {
  parsed: ParsedEpc
  input: EpcInput
  local: EpcResult
  diff: DiffRow[]
  match: { vsPdf: string; vsApi: string; tolerance: number }
}

type VersionInfo = {
  id: FormulaVersionId
  name: string
  validFrom: string
  validTo: string | null
  sourceUrl: string
  notes: string
}

const emptyInput = (): EpcInput => ({
  version: '2024',
  bruikbareVloeroppervlakteM2: 150,
  beschermdVolumeM3: 405,
  bouwjaar: 1975,
  dwellingType: 'vrijstaand',
  heatingFuel: 'aardgas',
  heatingEfficiency: 0.9,
  surfaces: { muurM2: 140, dakM2: 120, vloerM2: 120, raamM2: 30, deurM2: 2 },
  uValues: { muur: 1.7, dak: 1.2, vloer: 1.0, raam: 2.8, deur: 3.5 },
  pvKwp: 0,
  solarThermalM2: 0,
  ventilationSystem: 'geen',
})

export function App() {
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [parsed, setParsed] = useState<ParsedEpc | null>(null)
  const [input, setInput] = useState<EpcInput>(emptyInput)
  const [local, setLocal] = useState<EpcResult | null>(null)
  const [diff, setDiff] = useState<DiffRow[]>([])
  const [match, setMatch] = useState<CalcResponse['match'] | null>(null)
  const [api, setApi] = useState<CalcResponse['api']>(null)
  const [vekaConfigured, setVekaConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareApi, setCompareApi] = useState(false)
  const [apiMode, setApiMode] = useState<'berekening' | 'indicatief'>('berekening')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    void fetch('/api/versions')
      .then((r) => r.json())
      .then((j: { versions: VersionInfo[] }) => setVersions(j.versions))
    void fetch('/api/health')
      .then((r) => r.json())
      .then((j: { vekaConfigured: boolean }) => setVekaConfigured(j.vekaConfigured))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      void recalculate(input, parsed, compareApi, apiMode)
    }, 180)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, compareApi, apiMode])

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as ParseResponse
      setParsed(data.parsed)
      setInput(data.input)
      setLocal(data.local)
      setDiff(data.diff)
      setMatch(data.match)
      setApi(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function recalculate(
    next: EpcInput,
    parsedEpc: ParsedEpc | null,
    withApi: boolean,
    mode: 'berekening' | 'indicatief',
  ) {
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input: next,
          parsed: parsedEpc ?? undefined,
          compareApi: withApi,
          apiMode: mode,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as CalcResponse
      setLocal(data.local)
      setDiff(data.diff)
      setMatch(data.match)
      setApi(data.api)
      setVekaConfigured(data.vekaConfigured)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function patchInput(patch: Partial<EpcInput>) {
    setInput((prev) => ({ ...prev, ...patch }))
  }

  function patchSurface(key: keyof EpcInput['surfaces'], value: number) {
    setInput((prev) => ({
      ...prev,
      surfaces: { ...prev.surfaces, [key]: value },
    }))
  }

  function patchU(key: keyof EpcInput['uValues'], value: number) {
    setInput((prev) => ({
      ...prev,
      uValues: { ...prev.uValues, [key]: value },
    }))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void onFile(file)
  }

  const versionMeta = useMemo(
    () => versions.find((v) => v.id === input.version),
    [versions, input.version],
  )

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-10 px-5 py-10 md:px-8 md:py-14">
      <header className="max-w-2xl">
        <p className="mb-3 text-sm font-medium tracking-[0.18em] text-[var(--color-moss)] uppercase">
          Vlaanderen
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-[var(--color-moss-deep)] md:text-5xl">
          EPC
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-ink)]/75">
          Upload je EPC-pdf, speel met de cijfers, en toets af tegen de officiële
          formulestructuur-versies — plus optioneel de VEKA-rekenmotor-API.
        </p>
      </header>

      <section
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border border-dashed px-6 py-10 transition ${
          dragOver
            ? 'border-[var(--color-moss)] bg-[var(--color-mist)]/70'
            : 'border-[var(--color-line)] bg-white/50'
        }`}
      >
        <label className="flex cursor-pointer flex-col items-start gap-3">
          <span className="text-sm font-medium text-[var(--color-moss-deep)]">
            Sleep een EPC-pdf hierheen, of kies een bestand
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-moss)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
            }}
          />
          {busy && <span className="text-sm text-[var(--color-ink)]/60">Bezig met parsen…</span>}
          {parsed?.fileName && (
            <span className="text-sm text-[var(--color-ink)]/70">
              Geladen: <strong>{parsed.fileName}</strong>
              {parsed.attestnummer ? ` · ${parsed.attestnummer}` : ''}
            </span>
          )}
        </label>
        {parsed?.warnings?.length ? (
          <ul className="mt-4 space-y-1 text-sm text-[var(--color-clay)]">
            {parsed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-moss-deep)]">
              Speelveld
            </h2>
            <label className="text-sm">
              Formulestructuur{' '}
              <select
                className="ml-2 rounded-md border border-[var(--color-line)] bg-white px-2 py-1"
                value={input.version}
                onChange={(e) =>
                  patchInput({ version: e.target.value as FormulaVersionId })
                }
              >
                {(versions.length ? versions : [{ id: '2024', name: '2024' }]).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {versionMeta && (
            <p className="text-sm text-[var(--color-ink)]/65">
              {versionMeta.name} · geldig vanaf {versionMeta.validFrom}
              {versionMeta.validTo ? ` tot ${versionMeta.validTo}` : ''} ·{' '}
              <a
                className="underline decoration-[var(--color-line)] underline-offset-2 hover:text-[var(--color-moss)]"
                href={versionMeta.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                officiële bron
              </a>
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Bruikbare vloeroppervlakte (m²)"
              value={input.bruikbareVloeroppervlakteM2}
              onChange={(n) => patchInput({ bruikbareVloeroppervlakteM2: n })}
            />
            <NumberField
              label="Beschermd volume (m³)"
              value={input.beschermdVolumeM3}
              onChange={(n) => patchInput({ beschermdVolumeM3: n })}
            />
            <NumberField
              label="Bouwjaar"
              value={input.bouwjaar ?? 0}
              onChange={(n) => patchInput({ bouwjaar: n || null })}
            />
            <NumberField
              label="Rendement verwarming"
              value={input.heatingEfficiency}
              step={0.01}
              onChange={(n) => patchInput({ heatingEfficiency: n })}
            />
            <label className="text-sm">
              Type woning
              <select
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-white px-2 py-1.5"
                value={input.dwellingType}
                onChange={(e) =>
                  patchInput({ dwellingType: e.target.value as EpcInput['dwellingType'] })
                }
              >
                {['vrijstaand', 'halfopen', 'gesloten', 'appartement', 'onbekend'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Brandstof
              <select
                className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-white px-2 py-1.5"
                value={input.heatingFuel}
                onChange={(e) =>
                  patchInput({ heatingFuel: e.target.value as EpcInput['heatingFuel'] })
                }
              >
                {[
                  'aardgas',
                  'stookolie',
                  'elektriciteit',
                  'warmtepomp',
                  'hout',
                  'stadswarmte',
                  'onbekend',
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="PV (kWp)"
              value={input.pvKwp}
              step={0.1}
              onChange={(n) => patchInput({ pvKwp: n })}
            />
            <NumberField
              label="Zonneboiler (m²)"
              value={input.solarThermalM2}
              step={0.1}
              onChange={(n) => patchInput({ solarThermalM2: n })}
            />
          </div>

          <details className="rounded-xl border border-[var(--color-line)] bg-white/40 p-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-moss-deep)]">
              Schil: oppervlaktes & U-waarden
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['muurM2', 'Muur m²'],
                  ['dakM2', 'Dak m²'],
                  ['vloerM2', 'Vloer m²'],
                  ['raamM2', 'Raam m²'],
                  ['deurM2', 'Deur m²'],
                ] as const
              ).map(([key, label]) => (
                <NumberField
                  key={key}
                  label={label}
                  value={input.surfaces[key]}
                  onChange={(n) => patchSurface(key, n)}
                />
              ))}
              {(
                [
                  ['muur', 'U muur'],
                  ['dak', 'U dak'],
                  ['vloer', 'U vloer'],
                  ['raam', 'U raam'],
                  ['deur', 'U deur'],
                ] as const
              ).map(([key, label]) => (
                <NumberField
                  key={key}
                  label={label}
                  value={input.uValues[key]}
                  step={0.05}
                  onChange={(n) => patchU(key, n)}
                />
              ))}
            </div>
          </details>
        </section>

        <section className="space-y-5">
          <div className="rounded-2xl bg-[var(--color-moss-deep)] px-6 py-6 text-white shadow-[0_20px_50px_-30px_rgba(15,61,44,0.8)]">
            <p className="text-sm tracking-wide text-white/70 uppercase">Lokale berekening</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-display)] text-5xl tabular-nums">
                  {local?.energiescore ?? '—'}
                </p>
                <p className="text-sm text-white/70">kWh/(m²·jaar)</p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-5xl">
                {local?.label ?? '—'}
              </p>
            </div>
            {local && <LabelBar score={local.energiescore} className="mt-5" />}
            {parsed?.energiescore != null && (
              <p className="mt-4 text-sm text-white/75">
                PDF rapporteerde {parsed.energiescore}
                {parsed.label ? ` (${parsed.label})` : ''}
                {match ? ` · vs PDF: ${match.vsPdf}` : ''}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-white/55 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-[var(--color-moss-deep)]">
                VEKA API-vergelijking
              </h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={compareApi}
                  onChange={(e) => setCompareApi(e.target.checked)}
                />
                Vergelijk
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="apiMode"
                  checked={apiMode === 'berekening'}
                  onChange={() => setApiMode('berekening')}
                />
                Berekening
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="apiMode"
                  checked={apiMode === 'indicatief'}
                  onChange={() => setApiMode('indicatief')}
                />
                BerekenIndicatief
              </label>
            </div>
            <p className="mt-2 text-xs text-[var(--color-ink)]/60">
              {vekaConfigured
                ? 'VEKA credentials gevonden — calls gaan naar de geconfigureerde base URL.'
                : 'Nog niet geconfigureerd. Zet VEKA_EPC_API_URL (+ mTLS certs) in .env na toegang via veka@vlaanderen.be.'}
            </p>
            {api?.error && <p className="mt-2 text-sm text-[var(--color-clay)]">{api.error}</p>}
            {api && !api.error && (
              <p className="mt-2 text-sm">
                API: {api.energiescore ?? '—'} ({api.label ?? '—'})
                {match ? ` · ${match.vsApi}` : ''}
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-line)] bg-white/55">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-[var(--color-line)] text-[var(--color-ink)]/60">
                <tr>
                  <th className="px-3 py-2 font-medium">Veld</th>
                  <th className="px-3 py-2 font-medium">PDF</th>
                  <th className="px-3 py-2 font-medium">Lokaal</th>
                  <th className="px-3 py-2 font-medium">API</th>
                  <th className="px-3 py-2 font-medium">Δ lokaal−PDF</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((row) => (
                  <tr key={row.field} className="border-b border-[var(--color-line)]/60">
                    <td className="px-3 py-2 font-medium">{row.field}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(row.pdf)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(row.local)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(row.api)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(row.deltaLocalVsPdf)}</td>
                  </tr>
                ))}
                {!diff.length && (
                  <tr>
                    <td className="px-3 py-4 text-[var(--color-ink)]/50" colSpan={5}>
                      Upload of pas cijfers aan om een diff te zien.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {local?.notes?.length ? (
            <ul className="space-y-1 text-xs text-[var(--color-ink)]/55">
              {local.notes.map((n) => (
                <li key={n}>· {n}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <footer className="mt-auto border-t border-[var(--color-line)]/70 pt-6 text-xs text-[var(--color-ink)]/50">
        Geen vervanging van een officieel EPC. Lokale motor = vereenvoudigde formulestructuur;
        gebruik de API-diff om echte VEKA-afwijkingen te reverse-engineeren.
      </footer>
    </div>
  )
}

function fmt(v: number | string | null): string {
  if (v == null) return '—'
  return String(v)
}
