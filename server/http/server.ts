import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, resolve } from 'node:path'
import type {
  AssignedUserFormData,
  EquipmentFormData,
} from '../../src/hardening/domain/hardening.js'
import { HardeningSqliteDatabase } from '../hardening-sqlite/HardeningSqliteDatabase.js'

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001)
const publicDirectory = resolve(process.cwd(), 'dist')
const database = new HardeningSqliteDatabase()

type RouteHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void> | void

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

const parseBody = async <T>(request: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? (JSON.parse(rawBody) as T) : ({} as T)
}

const getBearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return ''
  }

  return authorization.slice('Bearer '.length)
}

const withAccount =
  (handler: RouteHandler): RouteHandler =>
  async (request, response) => {
    const account = database.authenticate(getBearerToken(request))

    if (!account) {
      sendJson(response, 401, { message: 'Sesion invalida o expirada.' })
      return
    }

    request.account = account
    await handler(request, response)
  }

const withAdmin =
  (handler: RouteHandler): RouteHandler =>
  withAccount(async (request, response) => {
    if (request.account?.role !== 'admin') {
      sendJson(response, 403, { message: 'Solo el administrador puede hacer esto.' })
      return
    }

    await handler(request, response)
  })

const routes: Record<string, RouteHandler> = {
  'GET /api/health': (_request, response) => {
    sendJson(response, 200, { ok: true, database: database.path })
  },
  'POST /api/auth/login': async (request, response) => {
    const body = await parseBody<{ username?: string; password?: string }>(request)
    const session = database.login(body.username ?? '', body.password ?? '')

    if (!session) {
      sendJson(response, 401, { message: 'Credenciales invalidas.' })
      return
    }

    sendJson(response, 200, session)
  },
  'GET /api/hardening': withAccount((_request, response) => {
    sendJson(response, 200, database.getDatabase())
  }),
  'POST /api/equipments': withAdmin(async (request, response) => {
    const body = await parseBody<EquipmentFormData>(request)
    sendJson(response, 201, database.createEquipment(body))
  }),
  'POST /api/assignments': withAccount(async (request, response) => {
    try {
      const body = await parseBody<AssignedUserFormData>(request)
      sendJson(response, 201, database.assignUser(body, request.account!))
    } catch (error) {
      sendJson(response, 409, {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo asignar el usuario.',
      })
    }
  }),
}

const serveStaticFile = (request: IncomingMessage, response: ServerResponse) => {
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
  })
  createReadStream(resolvedFile).pipe(response)
}

const server = createServer(async (request, response) => {
  const method = request.method ?? 'GET'
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  const route = routes[`${method} ${pathname}`]

  try {
    if (route) {
      await route(request, response)
      return
    }

    if (pathname.startsWith('/api/')) {
      sendJson(response, 404, { message: 'Ruta no encontrada.' })
      return
    }

    serveStaticFile(request, response)
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
      : 'Error interno del servidor.',
    })
  }
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`No se pudo iniciar la API: el puerto ${port} ya esta en uso.`)
    console.error('Cierra el proceso anterior o ejecuta: API_PORT=3002 yarn dev')
    process.exit(1)
  }

  throw error
})

server.listen(port, () => {
  console.log(`API y frontend listos en http://localhost:${port}`)
  console.log(`Base SQLite: ${database.path}`)
})
