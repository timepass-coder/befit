import initSqlJs, { type SqlValue } from 'sql.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type SQLiteBindValue =
  number | string | boolean | null | Uint8Array | ArrayBuffer | undefined;

type SqlJsDatabase = initSqlJs.Database;

type SqlJsModule = Awaited<ReturnType<typeof initSqlJs>>;

let sqlModulePromise: Promise<SqlJsModule> | null = null;

/**
 * Directory hosting the on-disk SQLite files used by the Node test adapter so
 * that database persistence is real (filesystem-backed) rather than a purely
 * in-memory map. Isolated per project in the OS temp directory.
 */
const TEST_DB_DIR = path.join(os.tmpdir(), 'befit-sqljs-test-db');

function ensureDbDir(): void {
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
}

function dbFileName(name: string): string {
  return `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.db`;
}

function dbFilePath(name: string): string {
  return path.join(TEST_DB_DIR, dbFileName(name));
}

/**
 * Deletes a specific database file from disk. Used to reset the test database
 * between suites without touching unrelated database files.
 */
export function removeDatabaseFile(name: string): void {
  const file = dbFilePath(name);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

function getSql(): Promise<SqlJsModule> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs();
  }
  return sqlModulePromise;
}

function toBindParams(params: SQLiteBindValue[]): SqlValue[] {
  return params.map((param) => {
    if (param === undefined) {
      return null;
    }
    if (typeof param === 'boolean') {
      return param ? 1 : 0;
    }
    if (param instanceof ArrayBuffer) {
      return new Uint8Array(param);
    }
    return param as SqlValue;
  });
}

export class SQLiteDatabase {
  private readonly db: SqlJsDatabase;
  private readonly name: string;

  constructor(db: SqlJsDatabase, name: string) {
    this.db = db;
    this.name = name;
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(
    sql: string,
    ...params: SQLiteBindValue[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    this.db.run(sql, toBindParams(params));

    const changes = Number(this.db.getRowsModified() ?? 0);
    const lastInsertRowId = Number(
      this.db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ?? 0,
    );

    return {
      lastInsertRowId,
      changes,
    };
  }

  async getFirstAsync<T = Record<string, unknown>>(
    sql: string,
    ...params: SQLiteBindValue[]
  ): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows[0] ?? null;
  }

  async getAllAsync<T = Record<string, unknown>>(
    sql: string,
    ...params: SQLiteBindValue[]
  ): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    const rows: T[] = [];

    try {
      if (params.length > 0) {
        stmt.bind(toBindParams(params));
      }

      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }

      return rows;
    } finally {
      stmt.free();
    }
  }

  async withExclusiveTransactionAsync<T>(
    callback: (db: SQLiteDatabase) => Promise<T>,
  ): Promise<T> {
    this.db.run('BEGIN IMMEDIATE');
    try {
      const result = await callback(this);
      this.db.run('COMMIT');
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    const bytes = this.db.export();
    ensureDbDir();
    fs.writeFileSync(dbFilePath(this.name), Buffer.from(bytes));
    this.db.close();
  }
}

/**
 * Opens (or creates) a database that is persisted to disk. Reopening the same
 * name reloads the previous contents from disk, which is what allows tests to
 * prove real persistence across connection/process boundaries.
 */
export async function openDatabaseAsync(name: string): Promise<SQLiteDatabase> {
  const SQL = await getSql();
  ensureDbDir();

  const file = dbFilePath(name);
  let db: SqlJsDatabase;
  if (fs.existsSync(file)) {
    const bytes = fs.readFileSync(file);
    db = new SQL.Database(bytes);
  } else {
    db = new SQL.Database();
  }
  return new SQLiteDatabase(db, name);
}

export function openDatabaseSync(name: string): SQLiteDatabase {
  throw new Error(
    'sql.js adapter does not support synchronous open in this test harness',
  );
}

export const SQLiteProvider = ({ children }: { children: React.ReactNode }) =>
  children;
export const useSQLiteContext = () => null;
export const defaultDatabaseDirectory = '/tmp';

export const AsyncStorage = {
  setItem: async (): Promise<void> => undefined,
  getItem: async (): Promise<string | null> => null,
  removeItem: async (): Promise<void> => undefined,
  clear: async (): Promise<void> => undefined,
  getAllKeys: async (): Promise<string[]> => [],
  multiGet: async (): Promise<readonly (readonly [string, string | null])[]> =>
    [],
  multiSet: async (): Promise<void> => undefined,
  multiRemove: async (): Promise<void> => undefined,
};

export const Storage = {
  ...AsyncStorage,
  setItemSync: () => undefined,
};