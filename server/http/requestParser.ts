import type { IncomingMessage } from 'node:http'

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('El cuerpo de la peticion es demasiado grande.')
    this.name = 'RequestBodyTooLargeError'
  }
}

export class RequestBodyParseError extends Error {
  constructor() {
    super('El cuerpo de la peticion no es un JSON valido.')
    this.name = 'RequestBodyParseError'
  }
}

const MAX_BODY_SIZE = 1024 * 1024

export const parseBody = async <T>(request: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length

    if (size > MAX_BODY_SIZE) {
      throw new RequestBodyTooLargeError()
    }

    chunks.push(buffer)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')

  if (!rawBody) {
    return {} as T
  }

  try {
    return JSON.parse(rawBody) as T
  } catch {
    throw new RequestBodyParseError()
  }
}
