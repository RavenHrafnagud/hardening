import type { HardeningDatabase } from '../../domain/hardening'
import seed from '../seed/hardeningSeed.json'

const STORAGE_KEY = 'credismart-hardening-db-v1'

const cloneDatabase = (database: HardeningDatabase): HardeningDatabase =>
  structuredClone(database)

export class LocalHardeningRepository {
  load(): HardeningDatabase {
    const storedDatabase = window.localStorage.getItem(STORAGE_KEY)

    if (!storedDatabase) {
      return cloneDatabase(seed as HardeningDatabase)
    }

    try {
      return JSON.parse(storedDatabase) as HardeningDatabase
    } catch {
      return cloneDatabase(seed as HardeningDatabase)
    }
  }

  save(database: HardeningDatabase) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database))
  }

  reset() {
    const freshDatabase = cloneDatabase(seed as HardeningDatabase)
    this.save(freshDatabase)
    return freshDatabase
  }
}
