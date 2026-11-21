import tailwind from 'bun-plugin-tailwind'
import { join } from 'node:path'

export type Assets = {
  appHtml: string
  files: Map<string, { body: Uint8Array; contentType: string }>
}

const webRoot = join(import.meta.dir, '../web')

let cached: Assets | null = null

export async function loadAssets(): Promise<Assets> {
  if (cached && process.env.NODE_ENV === 'production') return cached
  const production = process.env.NODE_ENV === 'production'
  const built = await Bun.build({
    entrypoints: [`${webRoot}/public/app/index.html`],
    publicPath: '/app/',
    plugins: [tailwind],
    target: 'browser',
    minify: production,
    splitting: production,
  })
  if (!built.success) {
    console.error(built.logs)
    throw new Error('Asset build failed')
  }
  const files = new Map<string, { body: Uint8Array; contentType: string }>()
  let appHtml = ''
  for (const output of built.outputs) {
    const base = output.path.split(/[/\\]/).pop() ?? output.path
    const path = `/app/${base.replace(/^\.\//, '')}`
    const body = new Uint8Array(await output.arrayBuffer())
    const contentType =
      path.endsWith('.css')
        ? 'text/css; charset=utf-8'
        : path.endsWith('.js')
          ? 'text/javascript; charset=utf-8'
          : path.endsWith('.html')
            ? 'text/html; charset=utf-8'
            : output.type || 'application/octet-stream'
    files.set(path, { body, contentType })
    if (path.endsWith('.html')) {
      appHtml = new TextDecoder().decode(body)
    }
  }
  cached = { appHtml, files }
  return cached
}

export async function serveAsset(pathname: string): Promise<Response | null> {
  const assets = await loadAssets()
  const file = assets.files.get(pathname)
  if (!file) return null
  return new Response(file.body.slice(), {
    headers: {
      'content-type': file.contentType,
      'cache-control':
        process.env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-store',
    },
  })
}

export async function appDocument(): Promise<string> {
  const assets = await loadAssets()
  return assets.appHtml
}
