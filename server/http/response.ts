import type { ServerResponse } from 'node:http'
import { DatabaseOperationError } from '../hardening-sqlite/HardeningSqliteDatabase.js'
import {
  RequestBodyParseError,
  RequestBodyTooLargeError,
} from './requestParser.js'

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

  if (error instanceof RequestBodyParseError) {
    sendJson(response, 400, { message: error.message })
    return
  }

  console.error(error)
  sendJson(response, 500, {
    message: 'Error interno del servidor.',
  })
}
