import { appDocument, loadAssets, serveAsset } from './assets'
import { handleApi } from './api'

export type Handler = {
  handle: (request: Request) => Promise<Response>
}

export function createHandler(): Handler {
  return {
    async handle(request) {
      const url = new URL(request.url)
      const pathname = url.pathname

      if (pathname.startsWith('/api/')) {
        const api = await handleApi(request, pathname)
        if (api) return api
        return Response.json({ error: 'not_found' }, { status: 404 })
      }

      const asset = await serveAsset(pathname)
      if (asset) return asset

      if (pathname === '/' || pathname === '/index.html') {
        const html = await appDocument()
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      }

      return new Response('Not found', { status: 404 })
    },
  }
}

// Warm the bundle once at import time in production paths that call loadAssets first.
export { loadAssets }
