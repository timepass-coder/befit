import initSqlJs from 'sql.js';

export type SQLiteBindValue =
  number | string | boolean | null | Uint8Array | ArrayBuffer | undefined;

export class SQLiteDatabase {
  private readonly db: ReturnType<typeof initSqlJs> extends Promise<infer T>
    ? T['Database']
    : never;

  constructor(
    db: ReturnType<typeof initSqlJs> extends Promise<infer T>
      ? T['Database']
      : never,
  ) {
    this.db = db;
  }

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(
    sql: string,
    ...params: SQLiteBindValue[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    this.db.run(sql, ...params);

    const lastInsertRowId = Number(
      this.db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] ??
        0,
    );
    const changes = Number(this.db.getRowsModified() ?? 0);

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
        stmt.bind(params as unknown[]);
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
    this.db.close();
  }
}

export async function openDatabaseAsync(name: string): Promise<SQLiteDatabase> {
  const SQL = await initSqlJs();
  return new SQLiteDatabase(new SQL.Database());
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
