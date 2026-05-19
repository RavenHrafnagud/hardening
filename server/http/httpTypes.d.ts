import type { Account } from '../../src/identity-access/domain/accessControl.js'

declare module 'node:http' {
  interface IncomingMessage {
    account?: Account
  }
}
