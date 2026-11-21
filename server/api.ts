import {
  buildDiff,
  calculateEpc,
  callBerekening,
  callBerekenIndicatief,
  FORMULA_VERSIONS,
  inputFromParsed,
  matchSummary,
  parseEpcPdf,
  readVekaConfig,
  type EpcInput,
  type ParsedEpc,
} from '../calc'

export async function handleApi(request: Request, pathname: string): Promise<Response | null> {
  if (pathname === '/api/health') {
    return Response.json({
      ok: true,
      vekaConfigured: Boolean(readVekaConfig()),
      versions: FORMULA_VERSIONS.map((v) => v.id),
    })
  }

  if (pathname === '/api/versions' && request.method === 'GET') {
    return Response.json({ versions: FORMULA_VERSIONS })
  }

  if (pathname === '/api/parse' && request.method === 'POST') {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'file required' }, { status: 400 })
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const parsed = parseEpcPdf(bytes, file.name)
    const input = inputFromParsed(parsed)
    const local = calculateEpc(input)
    return Response.json({
      parsed,
      input,
      local,
      diff: buildDiff(parsed, local, null),
      match: matchSummary(local, parsed, null),
    })
  }

  if (pathname === '/api/calculate' && request.method === 'POST') {
    const body = (await request.json()) as {
      parsed?: ParsedEpc
      input: EpcInput
      compareApi?: boolean
      apiMode?: 'berekening' | 'indicatief'
    }
    const local = calculateEpc(body.input)
    const parsed = body.parsed ?? {
      source: 'manual' as const,
      attestnummer: null,
      address: null,
      energiescore: null,
      label: null,
      bruikbareVloeroppervlakteM2: body.input.bruikbareVloeroppervlakteM2,
      beschermdVolumeM3: body.input.beschermdVolumeM3,
      bouwjaar: body.input.bouwjaar,
      dwellingType: body.input.dwellingType,
      heatingFuel: body.input.heatingFuel,
      rawTextExcerpt: '',
      warnings: [],
    }

    let api = null
    if (body.compareApi) {
      api =
        body.apiMode === 'indicatief'
          ? await callBerekenIndicatief(body.input)
          : await callBerekening(body.input)
    }

    return Response.json({
      local,
      api,
      diff: buildDiff(parsed, local, api),
      match: matchSummary(local, parsed, api),
      vekaConfigured: Boolean(readVekaConfig()),
    })
  }

  return null
}
