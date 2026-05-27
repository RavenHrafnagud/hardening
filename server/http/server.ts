import { createServer } from 'node:http'
import type {
  AssignedUserFormData,
  AssignedUserUpdateFormData,
  EquipmentFormData,
  EquipmentUpdateFormData,
} from '../../src/hardening/domain/hardening.js'
import type {
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
} from '../../src/identity-access/domain/accessControl.js'
import { HardeningSqliteDatabase } from '../hardening-sqlite/HardeningSqliteDatabase.js'
import { parseBody } from './requestParser.js'
import { serveStaticFile } from './staticFile.js'
import { sendJson, sendRouteError } from './response.js'
import { withAccount, withAdmin, type RouteHandler } from './auth.js'

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001)
const database = new HardeningSqliteDatabase()

const routes: Record<string, RouteHandler> = {
  'GET /api/health': (_request, response) => {
    sendJson(response, 200, { ok: true, storage: 'sqlite' })
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
  'GET /api/hardening': withAccount(database, (_request, response) => {
    sendJson(response, 200, database.getDatabase())
  }),
  'GET /api/accounts': withAdmin(database, (request, response) => {
    sendJson(response, 200, database.getAccountDirectory(request.account!.id))
  }),
  'POST /api/accounts': withAdmin(database, async (request, response) => {
    const body = await parseBody<CreateUserFormData>(request)
    sendJson(response, 201, database.createUser(body, request.account!.id))
  }),
  'POST /api/equipments': withAdmin(database, async (request, response) => {
    const body = await parseBody<EquipmentFormData>(request)
    sendJson(response, 201, database.createEquipment(body))
  }),
  'POST /api/assignments': withAccount(database, async (request, response) => {
    const body = await parseBody<AssignedUserFormData>(request)
    sendJson(response, 201, database.assignUser(body, request.account!))
  }),
}

const accountCredentialPath = /^\/api\/accounts\/([^/]+)$/
const equipmentUpdatePath = /^\/api\/equipments\/([^/]+)$/
const assignmentUpdatePath = /^\/api\/assignments\/([^/]+)$/

const server = createServer(async (request, response) => {
  const method = request.method ?? 'GET'
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  const route = routes[`${method} ${pathname}`]
  const isAccountCredentialUpdate = method === 'PATCH' && accountCredentialPath.test(pathname)
  const isEquipmentUpdate = method === 'PATCH' && equipmentUpdatePath.test(pathname)
  const isAssignmentUpdate = method === 'PATCH' && assignmentUpdatePath.test(pathname)

  try {
    if (route) {
      await route(request, response)
      return
    }

    if (isAccountCredentialUpdate) {
      await withAdmin(database, async (securedRequest, securedResponse) => {
        const accountId = pathname.match(accountCredentialPath)?.[1]

        if (!accountId) {
          sendJson(securedResponse, 404, { message: 'Ruta no encontrada.' })
          return
        }

        const body = await parseBody<Omit<UpdateAccountCredentialsFormData, 'accountId'>>(securedRequest)

        sendJson(
          securedResponse,
          200,
          database.updateAccountCredentials(
            {
              accountId,
              password: body.password ?? '',
              username: body.username ?? '',
            },
            securedRequest.account!.id,
            securedRequest.token!,
          ),
        )
      })(request, response)
      return
    }

    if (isEquipmentUpdate) {
      await withAdmin(database, async (securedRequest, securedResponse) => {
        const equipmentId = pathname.match(equipmentUpdatePath)?.[1]

        if (!equipmentId) {
          sendJson(securedResponse, 404, { message: 'Ruta no encontrada.' })
          return
        }

        const body = await parseBody<Omit<EquipmentUpdateFormData, 'equipmentId'>>(securedRequest)

        sendJson(
          securedResponse,
          200,
          database.updateEquipment(
            {
              equipmentId,
              name: body.name ?? '',
              serial: body.serial ?? '',
              assetId: body.assetId ?? '',
              anydeskId: body.anydeskId ?? '',
              bitlockerKey: body.bitlockerKey ?? '',
            },
          ),
        )
      })(request, response)
      return
    }

    if (isAssignmentUpdate) {
      await withAccount(database, async (securedRequest, securedResponse) => {
        const assignmentId = pathname.match(assignmentUpdatePath)?.[1]

        if (!assignmentId) {
          sendJson(securedResponse, 404, { message: 'Ruta no encontrada.' })
          return
        }

        const body = await parseBody<Omit<AssignedUserUpdateFormData, 'id'>>(securedRequest)

        sendJson(
          securedResponse,
          200,
          database.updateAssignedUser(
            {
              id: assignmentId,
              name: body.name ?? '',
              gmail: body.gmail ?? '',
              outlook: body.outlook ?? '',
              area: body.area ?? '',
              notes: body.notes ?? '',
            },
          ),
        )
      })(request, response)
      return
    }

    if (pathname.startsWith('/api/')) {
      sendJson(response, 404, { message: 'Ruta no encontrada.' })
      return
    }

    serveStaticFile(request, response)
  } catch (error) {
    sendRouteError(response, error)
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
