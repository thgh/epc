import { createHandler, loadAssets } from './handle'

export const defaultPort = 26130

const live = createHandler()

export async function startServer(
  port = Number(process.env.PORT ?? defaultPort),
): Promise<Bun.Server<undefined>> {
  await loadAssets()
  return Bun.serve({
    port,
    hostname: '0.0.0.0',
    development: process.env.NODE_ENV !== 'production',
    fetch: live.handle,
    error(error) {
      console.error(error)
      return new Response('Internal Server Error', { status: 500 })
    },
  })
}

if (import.meta.main) {
  const server = await startServer()
  console.log(`EPC playground → http://localhost:${server.port}`)
  console.log(`Health         → http://localhost:${server.port}/api/health`)
}
