import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from './response.js'

const publicDirectory = resolve(process.cwd(), 'dist')

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const getCacheControlHeader = (filePath: string) => {
  const extension = extname(filePath)

  if (extension === '.html') {
    return 'no-cache'
  }

  return 'public, max-age=31536000, immutable'
}

export const serveStaticFile = (request: IncomingMessage, response: ServerResponse) => {
  const requestedPath = new URL(request.url ?? '/', 'http://localhost').pathname
  const safePath = requestedPath === '/' ? '/index.html' : requestedPath
  const filePath = join(publicDirectory, safePath)
  const fallbackPath = join(publicDirectory, 'index.html')
  const resolvedFile = existsSync(filePath) && statSync(filePath).isFile()
    ? filePath
    : fallbackPath

  if (!existsSync(resolvedFile)) {
    sendJson(response, 404, { message: 'Frontend no construido. Ejecuta yarn build.' })
    return
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(resolvedFile)] ?? 'application/octet-stream',
    'Cache-Control': getCacheControlHeader(resolvedFile),
  })

  createReadStream(resolvedFile).pipe(response)
}
