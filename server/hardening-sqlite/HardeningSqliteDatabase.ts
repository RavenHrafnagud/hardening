import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type {
  AssignedUserFormData,
  AssignedUserUpdateFormData,
  Equipment,
  EquipmentFormData,
  EquipmentUpdateFormData,
  HardeningDatabase,
} from '../../src/hardening/domain/hardening.js'
import type {
  Account,
  AccountDirectory,
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
  UserRole,
} from '../../src/identity-access/domain/accessControl.js'

type SeedFile = HardeningDatabase

interface EquipmentRow {
  id: string
  name: string
  serial: string
  asset_id: string
  anydesk_id: string
  bitlocker_key: string
  status: 'hardened' | 'assigned'
  created_at: string
  updated_at: string
}

interface AssignedUserRow {
  id: string
  equipment_id: string
  name: string
  gmail: string
  outlook: string
  area: string
  assigned_at: string
  notes: string
}

interface AccountRow {
  id: string
  username: string
  role: UserRole
  display_name: string
  password_hash: string
  password_salt: string
}

interface AccountIdentityRow {
  id: string
  username: string
  role: UserRole
  display_name: string
}

const dataDirectory = resolve(process.cwd(), 'data')
const databasePath = resolve(dataDirectory, 'hardening.sqlite')
const seedPath = resolve(
  process.cwd(),
  'src/hardening/seed/hardeningSeed.json',
)
const SESSION_CLEANUP_INTERVAL_MS = 60_000

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`

const now = () => new Date().toISOString()

const readSeed = () =>
  JSON.parse(readFileSync(seedPath, 'utf8')) as SeedFile

const normalizeUsername = (username: string) => username.trim().toLowerCase()

const requireText = (value: string | undefined, message: string) => {
  const trimmedValue = value?.trim() ?? ''

  if (!trimmedValue) {
    throw new DatabaseOperationError(message, 400)
  }

  return trimmedValue
}

const optionalText = (value: string | undefined) => value?.trim() ?? ''

const hashPassword = (password: string, salt = randomBytes(16).toString('hex')) => {
  const hash = pbkdf2Sync(password, salt, 120_000, 64, 'sha512').toString('hex')
  return { hash, salt }
}

const verifyPassword = (
  password: string,
  passwordHash: string,
  passwordSalt: string,
) => {
  const { hash } = hashPassword(password, passwordSalt)
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(passwordHash, 'hex'))
}

const toAccount = (row: AccountIdentityRow): Account => ({
  id: row.id,
  username: row.username,
  role: row.role,
  displayName: row.display_name,
})

export class DatabaseOperationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
  }
}

export class HardeningSqliteDatabase {
  private readonly db: DatabaseSync
  private readonly seed: SeedFile
  private lastSessionCleanupAt = 0

  constructor() {
    if (!existsSync(dataDirectory)) {
      mkdirSync(dataDirectory, { recursive: true })
    }

    this.db = new DatabaseSync(databasePath)
    this.db.exec('PRAGMA foreign_keys = ON')
    this.seed = readSeed()
    this.createSchema()
    this.seedIfNeeded()
  }

  login(username: string, password: string) {
    this.cleanupExpiredSessions()

    const account = this.db
      .prepare(
        `SELECT id, username, role, display_name, password_hash, password_salt
         FROM accounts
         WHERE username = ?`,
      )
      .get(normalizeUsername(username)) as AccountRow | undefined

    if (!account || !verifyPassword(password, account.password_hash, account.password_salt)) {
      return null
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString()

    this.db
      .prepare(
        `INSERT INTO sessions (token, account_id, expires_at)
         VALUES (?, ?, ?)`,
      )
      .run(token, account.id, expiresAt)

    return { account: toAccount(account), token }
  }

  authenticate(token: string) {
    this.cleanupExpiredSessions()

    const row = this.db
      .prepare(
        `SELECT accounts.id, accounts.username, accounts.role, accounts.display_name
         FROM sessions
         INNER JOIN accounts ON accounts.id = sessions.account_id
         WHERE sessions.token = ? AND sessions.expires_at > ?`,
      )
      .get(token, now()) as AccountIdentityRow | undefined

    return row ? toAccount(row) : null
  }

  getAccountDirectory(currentAccountId: string): AccountDirectory {
    return {
      accounts: this.listAccounts(),
      currentAccount: this.getAccountById(currentAccountId),
    }
  }

  getDatabase(): HardeningDatabase {
    const rows = this.db
      .prepare(
        `SELECT
           e.id AS equipment_id,
           e.name AS equipment_name,
           e.serial AS equipment_serial,
           e.asset_id AS equipment_asset_id,
           e.anydesk_id AS equipment_anydesk_id,
           e.bitlocker_key AS equipment_bitlocker_key,
           e.status AS equipment_status,
           e.created_at AS equipment_created_at,
           e.updated_at AS equipment_updated_at,
           au.id AS user_id,
           au.name AS user_name,
           au.gmail AS user_gmail,
           au.outlook AS user_outlook,
           au.area AS user_area,
           au.notes AS user_notes,
           au.assigned_at AS user_assigned_at
         FROM equipments e
         LEFT JOIN assigned_users au ON au.equipment_id = e.id
         ORDER BY e.created_at DESC, e.name ASC, au.assigned_at DESC`,
      )
      .all() as Array<Record<string, string | null>>

    const equipmentsById = new Map<string, Equipment>()

    for (const row of rows) {
      const equipmentId = String(row.equipment_id)
      let equipment = equipmentsById.get(equipmentId)

      if (!equipment) {
        equipment = {
          id: equipmentId,
          name: String(row.equipment_name),
          serial: String(row.equipment_serial),
          assetId: String(row.equipment_asset_id),
          anydeskId: String(row.equipment_anydesk_id),
          bitlockerKey: String(row.equipment_bitlocker_key),
          status: row.equipment_status as 'hardened' | 'assigned',
          createdAt: String(row.equipment_created_at),
          updatedAt: String(row.equipment_updated_at),
          assignedUsers: [],
        }

        equipmentsById.set(equipmentId, equipment)
      }

      if (row.user_id) {
        equipment.assignedUsers.push({
          id: String(row.user_id),
          name: String(row.user_name),
          gmail: String(row.user_gmail),
          outlook: String(row.user_outlook),
          area: String(row.user_area),
          assignedAt: String(row.user_assigned_at),
          notes: String(row.user_notes),
        })
      }
    }

    return {
      version: this.seed.version,
      importedAt: this.seed.importedAt,
      source: this.seed.source,
      equipments: Array.from(equipmentsById.values()),
    }
  }

  createUser(formData: CreateUserFormData, currentAccountId: string) {
    const username = normalizeUsername(
      requireText(formData.username, 'El nombre de usuario es obligatorio.'),
    )
    const password = requireText(formData.password, 'La contraseña es obligatoria.')

    const credentials = hashPassword(password)

    try {
      this.db
        .prepare(
          `INSERT INTO accounts (
            id, username, password_hash, password_salt, role, display_name
          )
          VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('acct'),
          username,
          credentials.hash,
          credentials.salt,
          'standard',
          username,
        )
    } catch (error) {
      throw this.toOperationError(error)
    }

    return this.getAccountDirectory(currentAccountId)
  }

  updateAccountCredentials(
    formData: UpdateAccountCredentialsFormData,
    currentAccountId: string,
    currentToken: string,
  ) {
    const existingAccount = this.findAccountRowById(formData.accountId)
    const username = normalizeUsername(formData.username)

    if (!username) {
      throw new DatabaseOperationError('El nombre de usuario es obligatorio.', 400)
    }

    if (!existingAccount) {
      throw new DatabaseOperationError('La cuenta no existe.', 404)
    }

    const nextPassword = formData.password || null
    const nextHash = nextPassword
      ? hashPassword(nextPassword)
      : {
          hash: existingAccount.password_hash,
          salt: existingAccount.password_salt,
        }

    try {
      this.db.exec('BEGIN')
      this.db
        .prepare(
          `UPDATE accounts
           SET username = ?, password_hash = ?, password_salt = ?, display_name = ?
           WHERE id = ?`,
        )
        .run(
          username,
          nextHash.hash,
          nextHash.salt,
          username,
          formData.accountId,
        )

      this.db
        .prepare(
          `DELETE FROM sessions
           WHERE account_id = ? AND token <> ?`,
        )
        .run(formData.accountId, currentToken)

      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw this.toOperationError(error)
    }

    return this.getAccountDirectory(currentAccountId)
  }

  createEquipment(formData: EquipmentFormData) {
    const timestamp = now()
    const name = requireText(formData.name, 'El nombre del equipo es obligatorio.')
    const serial = requireText(formData.serial, 'El serial del equipo es obligatorio.')
    const anydeskId = requireText(formData.anydeskId, 'El ID de AnyDesk es obligatorio.')
    const bitlockerKey = requireText(formData.bitlockerKey, 'La llave BitLocker es obligatoria.')

    try {
      this.db
        .prepare(
          `INSERT INTO equipments (
            id, name, serial, asset_id, anydesk_id, bitlocker_key,
            status, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 'hardened', ?, ?)`,
        )
        .run(
          createId('eq'),
          name,
          serial,
          optionalText(formData.assetId),
          anydeskId,
          bitlockerKey,
          timestamp,
          timestamp,
        )
    } catch (error) {
      throw this.toOperationError(error)
    }

    return this.getDatabase()
  }

  assignUser(formData: AssignedUserFormData, account: Account) {
    const equipmentId = requireText(formData.equipmentId, 'El equipo es obligatorio.')
    const name = requireText(formData.name, 'El nombre del usuario es obligatorio.')

    if (!this.findEquipmentById(equipmentId)) {
      throw new DatabaseOperationError('El equipo no existe.', 404)
    }

    const existingUsers = this.db
      .prepare('SELECT COUNT(*) AS total FROM assigned_users WHERE equipment_id = ?')
      .get(equipmentId) as { total: number } | undefined

    if (account.role === 'standard' && existingUsers?.total) {
      throw new DatabaseOperationError(
        'El equipo ya tiene un usuario asignado.',
        409,
      )
    }

    const timestamp = now()

    this.db.exec('BEGIN')
    try {
      this.db
        .prepare(
          `INSERT INTO assigned_users (
            id, equipment_id, name, gmail, outlook, area, notes, assigned_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          createId('user'),
          equipmentId,
          name,
          optionalText(formData.gmail),
          optionalText(formData.outlook),
          optionalText(formData.area),
          optionalText(formData.notes),
          timestamp,
        )

      this.db
        .prepare(
          `UPDATE equipments
           SET status = 'assigned', updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, equipmentId)

      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw this.toOperationError(error)
    }

    return this.getDatabase()
  }

  updateEquipment(formData: EquipmentUpdateFormData) {
    const existingEquipment = this.findEquipmentById(formData.equipmentId)
    const name = requireText(formData.name, 'El nombre del equipo es obligatorio.')
    const serial = requireText(formData.serial, 'El serial del equipo es obligatorio.')
    const anydeskId = requireText(formData.anydeskId, 'El ID de AnyDesk es obligatorio.')
    const bitlockerKey = requireText(formData.bitlockerKey, 'La llave BitLocker es obligatoria.')

    if (!existingEquipment) {
      throw new DatabaseOperationError('El equipo no existe.', 404)
    }

    const timestamp = now()

    try {
      this.db
        .prepare(
          `UPDATE equipments
           SET name = ?, serial = ?, asset_id = ?, anydesk_id = ?, bitlocker_key = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          name,
          serial,
          optionalText(formData.assetId),
          anydeskId,
          bitlockerKey,
          timestamp,
          formData.equipmentId,
        )
    } catch (error) {
      throw this.toOperationError(error)
    }

    return this.getDatabase()
  }

  updateAssignedUser(formData: AssignedUserUpdateFormData) {
    const existingUser = this.findAssignedUserById(formData.id)
    const name = requireText(formData.name, 'El nombre del usuario es obligatorio.')

    if (!existingUser) {
      throw new DatabaseOperationError('El usuario asignado no existe.', 404)
    }

    const timestamp = now()

    this.db.exec('BEGIN')
    try {
      this.db
        .prepare(
          `UPDATE assigned_users
           SET name = ?, gmail = ?, outlook = ?, area = ?, notes = ?
           WHERE id = ?`,
        )
        .run(
          name,
          optionalText(formData.gmail),
          optionalText(formData.outlook),
          optionalText(formData.area),
          optionalText(formData.notes),
          formData.id,
        )

      this.db
        .prepare(
          `UPDATE equipments
           SET updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, existingUser.equipment_id)

      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw this.toOperationError(error)
    }

    return this.getDatabase()
  }

  get path() {
    return databasePath
  }

  private listAccounts() {
    const rows = this.db
      .prepare(
        `SELECT id, username, role, display_name
         FROM accounts
         ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, username ASC`,
      )
      .all() as unknown as AccountIdentityRow[]

    return rows.map(toAccount)
  }

  private getAccountById(accountId: string) {
    const row = this.db
      .prepare(
        `SELECT id, username, role, display_name
         FROM accounts
         WHERE id = ?`,
      )
      .get(accountId) as AccountIdentityRow | undefined

    if (!row) {
      throw new DatabaseOperationError('La cuenta no existe.', 404)
    }

    return toAccount(row)
  }

  private findAccountRowById(accountId: string) {
    return this.db
      .prepare(
        `SELECT id, username, role, display_name, password_hash, password_salt
         FROM accounts
         WHERE id = ?`,
      )
      .get(accountId) as AccountRow | undefined
  }

  private findEquipmentById(equipmentId: string) {
    return this.db
      .prepare(
        `SELECT id, name, serial, asset_id, anydesk_id, bitlocker_key, status, created_at, updated_at
         FROM equipments
         WHERE id = ?`,
      )
      .get(equipmentId) as EquipmentRow | undefined
  }

  private findAssignedUserById(userId: string) {
    return this.db
      .prepare(
        `SELECT id, equipment_id, name, gmail, outlook, area, notes, assigned_at
         FROM assigned_users
         WHERE id = ?`,
      )
      .get(userId) as AssignedUserRow | undefined
  }

  private cleanupExpiredSessions() {
    const currentTime = Date.now()

    if (currentTime - this.lastSessionCleanupAt < SESSION_CLEANUP_INTERVAL_MS) {
      return
    }

    this.db
      .prepare('DELETE FROM sessions WHERE expires_at <= ?')
      .run(now())
    this.lastSessionCleanupAt = currentTime
  }

  private toOperationError(error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: accounts.username')
    ) {
      return new DatabaseOperationError(
        'Ese nombre de usuario ya existe.',
        409,
      )
    }

    if (
      error instanceof Error &&
      error.message.includes('FOREIGN KEY constraint failed')
    ) {
      return new DatabaseOperationError('El registro relacionado no existe.', 404)
    }

    if (error instanceof DatabaseOperationError) {
      return error
    }

    return new DatabaseOperationError(
      error instanceof Error
        ? error.message
        : 'No se pudo completar la operación.',
      500,
    )
  }

  private createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'standard')),
        display_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
        ON sessions(expires_at);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_single_admin
        ON accounts(role)
        WHERE role = 'admin';

      CREATE TABLE IF NOT EXISTS equipments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        serial TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        anydesk_id TEXT NOT NULL,
        bitlocker_key TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('hardened', 'assigned')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assigned_users (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        gmail TEXT NOT NULL,
        outlook TEXT NOT NULL,
        area TEXT NOT NULL,
        notes TEXT NOT NULL,
        assigned_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_assigned_users_equipment_id
        ON assigned_users(equipment_id);
    `)
  }

  private seedIfNeeded() {
    const seeded = this.db
      .prepare("SELECT value FROM metadata WHERE key = 'seeded'")
      .get() as { value: string } | undefined

    if (seeded?.value === 'true') {
      return
    }

    const seed = this.seed
    const adminPassword = hashPassword('admin123')
    const userPassword = hashPassword('standard123')

    this.db.exec('BEGIN')
    try {
      this.db
        .prepare(
          `INSERT INTO accounts (
            id, username, password_hash, password_salt, role, display_name
          )
          VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'acct-admin',
          'admin',
          adminPassword.hash,
          adminPassword.salt,
          'admin',
          'Administrador',
        )

      this.db
        .prepare(
          `INSERT INTO accounts (
            id, username, password_hash, password_salt, role, display_name
          )
          VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          'acct-standard',
          'standard',
          userPassword.hash,
          userPassword.salt,
          'standard',
          'Usuario',
        )

      const equipmentStatement = this.db.prepare(
        `INSERT INTO equipments (
          id, name, serial, asset_id, anydesk_id, bitlocker_key,
          status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      const userStatement = this.db.prepare(
        `INSERT INTO assigned_users (
          id, equipment_id, name, gmail, outlook, area, notes, assigned_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )

      for (const equipment of seed.equipments) {
        equipmentStatement.run(
          equipment.id,
          equipment.name,
          equipment.serial,
          equipment.assetId,
          equipment.anydeskId,
          equipment.bitlockerKey,
          equipment.status,
          equipment.createdAt,
          equipment.updatedAt,
        )

        for (const assignedUser of equipment.assignedUsers) {
          userStatement.run(
            assignedUser.id,
            equipment.id,
            assignedUser.name,
            assignedUser.gmail,
            assignedUser.outlook,
            assignedUser.area,
            assignedUser.notes,
            assignedUser.assignedAt,
          )
        }
      }

      this.db
        .prepare("INSERT INTO metadata (key, value) VALUES ('seeded', 'true')")
        .run()
      this.db
        .prepare("INSERT INTO metadata (key, value) VALUES ('seed_source', ?)")
        .run(seed.source)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}
