import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type {
  AssignedUser,
  AssignedUserFormData,
  Equipment,
  EquipmentFormData,
  HardeningDatabase,
} from '../../src/hardening/domain/hardening.js'
import type {
  Account,
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

const dataDirectory = resolve(process.cwd(), 'data')
const databasePath = resolve(dataDirectory, 'hardening.sqlite')
const seedPath = resolve(
  process.cwd(),
  'src/hardening/seed/hardeningSeed.json',
)

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`

const now = () => new Date().toISOString()

const readSeed = () =>
  JSON.parse(readFileSync(seedPath, 'utf8')) as SeedFile

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

const toAccount = (row: AccountRow): Account => ({
  id: row.id,
  username: row.username,
  role: row.role,
  displayName: row.display_name,
})

export class HardeningSqliteDatabase {
  private readonly db: DatabaseSync

  constructor() {
    if (!existsSync(dataDirectory)) {
      mkdirSync(dataDirectory, { recursive: true })
    }

    this.db = new DatabaseSync(databasePath)
    this.db.exec('PRAGMA foreign_keys = ON')
    this.createSchema()
    this.seedIfNeeded()
  }

  login(username: string, password: string) {
    const account = this.db
      .prepare(
        `SELECT id, username, role, display_name, password_hash, password_salt
         FROM accounts
         WHERE username = ?`,
      )
      .get(username.trim().toLowerCase()) as AccountRow | undefined

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
    const row = this.db
      .prepare(
        `SELECT accounts.id, accounts.username, accounts.role, accounts.display_name,
                accounts.password_hash, accounts.password_salt
         FROM sessions
         INNER JOIN accounts ON accounts.id = sessions.account_id
         WHERE sessions.token = ? AND sessions.expires_at > ?`,
      )
      .get(token, now()) as AccountRow | undefined

    return row ? toAccount(row) : null
  }

  getDatabase(): HardeningDatabase {
    const seed = readSeed()
    const equipmentRows = this.db
      .prepare(
        `SELECT id, name, serial, asset_id, anydesk_id, bitlocker_key,
                status, created_at, updated_at
         FROM equipments
         ORDER BY created_at DESC, name ASC`,
      )
      .all() as unknown as EquipmentRow[]

    const userRows = this.db
      .prepare(
        `SELECT id, equipment_id, name, gmail, outlook, area, assigned_at, notes
         FROM assigned_users
         ORDER BY assigned_at DESC`,
      )
      .all() as unknown as AssignedUserRow[]

    const usersByEquipment = userRows.reduce<Record<string, AssignedUser[]>>(
      (collection, user) => {
        collection[user.equipment_id] ??= []
        collection[user.equipment_id].push({
          id: user.id,
          name: user.name,
          gmail: user.gmail,
          outlook: user.outlook,
          area: user.area,
          assignedAt: user.assigned_at,
          notes: user.notes,
        })

        return collection
      },
      {},
    )

    const equipments: Equipment[] = equipmentRows.map((equipment) => ({
      id: equipment.id,
      name: equipment.name,
      serial: equipment.serial,
      assetId: equipment.asset_id,
      anydeskId: equipment.anydesk_id,
      bitlockerKey: equipment.bitlocker_key,
      status: equipment.status,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at,
      assignedUsers: usersByEquipment[equipment.id] ?? [],
    }))

    return {
      version: seed.version,
      importedAt: seed.importedAt,
      source: `${seed.source} -> ${databasePath}`,
      equipments,
    }
  }

  createEquipment(formData: EquipmentFormData) {
    const timestamp = now()

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
        formData.name.trim(),
        formData.serial.trim(),
        formData.assetId.trim(),
        formData.anydeskId.trim(),
        formData.bitlockerKey.trim(),
        timestamp,
        timestamp,
      )

    return this.getDatabase()
  }

  assignUser(formData: AssignedUserFormData, account: Account) {
    const existingUsers = this.db
      .prepare('SELECT COUNT(*) AS total FROM assigned_users WHERE equipment_id = ?')
      .get(formData.equipmentId) as { total: number } | undefined

    if (account.role === 'standard' && existingUsers?.total) {
      throw new Error('El equipo ya tiene un usuario asignado.')
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
          formData.equipmentId,
          formData.name.trim(),
          formData.gmail.trim(),
          formData.outlook.trim(),
          formData.area.trim(),
          formData.notes.trim(),
          timestamp,
        )

      this.db
        .prepare(
          `UPDATE equipments
           SET status = 'assigned', updated_at = ?
           WHERE id = ?`,
        )
        .run(timestamp, formData.equipmentId)

      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }

    return this.getDatabase()
  }

  get path() {
    return databasePath
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

    const seed = readSeed()
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
