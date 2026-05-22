import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson } from './response.js'
import { HardeningSqliteDatabase } from '../hardening-sqlite/HardeningSqliteDatabase.js'

export type RouteHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void> | void

const getBearerToken = (request: IncomingMessage) => {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return ''
  }

  return authorization.slice('Bearer '.length)
}

export const withAccount = (
  database: HardeningSqliteDatabase,
  handler: RouteHandler,
): RouteHandler =>
  async (request, response) => {
    const token = getBearerToken(request)
    const account = database.authenticate(token)

    if (!account) {
      sendJson(response, 401, { message: 'Sesion invalida o expirada.' })
      return
    }

    request.account = account
    request.token = token

    await handler(request, response)
  }

export const withAdmin = (
  database: HardeningSqliteDatabase,
  handler: RouteHandler,
): RouteHandler =>
  withAccount(database, async (request, response) => {
    if (request.account?.role !== 'admin') {
      sendJson(response, 403, { message: 'Solo el administrador puede hacer esto.' })
      return
    }

    await handler(request, response)
  })
