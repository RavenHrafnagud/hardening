import type { ServerResponse } from 'node:http'
import { DatabaseOperationError } from '../hardening-sqlite/HardeningSqliteDatabase.js'
import { RequestBodyTooLargeError } from './requestParser.js'

export const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

export const sendRouteError = (
  response: ServerResponse,
  error: unknown,
) => {
  if (error instanceof DatabaseOperationError) {
    sendJson(response, error.statusCode, { message: error.message })
    return
  }

  if (error instanceof RequestBodyTooLargeError) {
    sendJson(response, 413, { message: error.message })
    return
  }

  sendJson(response, 500, {
    message:
      error instanceof Error
        ? error.message
        : 'Error interno del servidor.',
  })
}
