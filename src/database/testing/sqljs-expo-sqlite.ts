import initSqlJs, { type SqlValue } from 'sql.js';

export type SQLiteBindValue =
  number | string | boolean | null | Uint8Array | ArrayBuffer | undefined;

type SqlJsDatabase = initSqlJs.Database;

type SqlJsModule = Awaited<ReturnType<typeof initSqlJs>>;

const snapshots = new Map<string, Uint8Array>();

let sqlModulePromise: Promise<SqlJsModule> | null = null;

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
      this.db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ??
        0,
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
    snapshots.set(this.name, bytes);
    this.db.close();
  }
}

export async function openDatabaseAsync(name: string): Promise<SQLiteDatabase> {
  const SQL = await getSql();
  const snapshot = snapshots.get(name);
  const db = snapshot ? new SQL.Database(snapshot) : new SQL.Database();
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
  multiGet: async (): Promise<
    readonly (readonly [string, string | null])[]
  > => [],
  multiSet: async (): Promise<void> => undefined,
  multiRemove: async (): Promise<void> => undefined,
};

export const Storage = {
  ...AsyncStorage,
  setItemSync: () => undefined,
};