interface MockRow {
  [key: string]: unknown;
}

interface MockTable {
  rows: MockRow[];
  columns: string[];
}

class MockDatabase {
  private tables: Map<string, MockTable> = new Map();
  private persistentRows: Map<string, MockRow[]> = new Map();
  private nextId = 1;
  private userVersion = 0;
  private inTransaction = false;

  constructor() {
    this.initializeSchema();
    this.restorePersistentData();
  }

  private initializeSchema() {
    this.tables.set('schema_migrations', { rows: [], columns: ['version', 'name', 'applied_at'] });
    this.tables.set('db_test_records', { 
      rows: [], 
      columns: ['id', 'value', 'int_value', 'created_at', 'updated_at'] 
    });
    // Initialize persistent storage for db_test_records
    this.persistentRows.set('db_test_records', []);
  }

  private restorePersistentData() {
    // Restore db_test_records from persistent storage
    const persisted = this.persistentRows.get('db_test_records') ?? [];
    if (persisted.length > 0) {
      this.tables.set('db_test_records', { 
        rows: persisted, 
        columns: ['id', 'value', 'int_value', 'created_at', 'updated_at'] 
      });
    }
  }

  private parseSql(sql: string): { type: string; table?: string; columns?: string[]; values?: unknown[]; where?: string; orderBy?: string; limit?: number; offset?: number } {
    const normalized = sql.trim().toUpperCase();
    
    if (normalized.startsWith('PRAGMA USER_VERSION')) {
      const match = sql.match(/PRAGMA USER_VERSION\s*=\s*(\d+)/i);
      if (match) {
        return { type: 'PRAGMA_USER_VERSION_SET', table: 'user_version', values: [parseInt(match[1], 10)] };
      }
      return { type: 'PRAGMA_USER_VERSION_GET' };
    }
    
    if (normalized.startsWith('PRAGMA JOURNAL_MODE')) {
      return { type: 'PRAGMA_JOURNAL_MODE' };
    }
    
    if (normalized.startsWith('PRAGMA FOREIGN_KEYS')) {
      return { type: 'PRAGMA_FOREIGN_KEYS' };
    }

    if (normalized.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      if (match) {
        const tableName = match[1];
        const columnsMatch = sql.match(/\(([^)]+)\)/);
        const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim().split(' ')[0]) : [];
        return { type: 'CREATE_TABLE', table: tableName, columns };
      }
    }

    if (normalized.startsWith('INSERT INTO')) {
      const match = sql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const table = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const valuesStr = match[3];
        const values = this.parseValues(valuesStr);
        return { type: 'INSERT', table, columns, values };
      }
    }

    if (normalized.startsWith('UPDATE')) {
      const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const table = match[1];
        const setClause = match[2].trim();
        const where = match[3]?.trim();
        const setParts = setClause.split(',').map(s => s.trim());
        const columns = setParts.map(p => p.split('=')[0].trim());
        const values = setParts.map(p => {
          const parts = p.split('=');
          return parts.length > 1 ? parts[1].trim() : '';
        });
        return { type: 'UPDATE', table, columns, values: this.parseValues(values.join(',')), where };
      }
    }

    if (normalized.startsWith('DELETE FROM')) {
      const match = sql.match(/DELETE FROM\s+(\w+)(?:WHERE\s+(.+))?/i);
      if (match) {
        return { type: 'DELETE', table: match[1], where: match[2]?.trim() };
      }
    }

    if (normalized.startsWith('SELECT')) {
      const match = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:WHERE\s+(.+?))?(?:ORDER BY\s+(.+?))?(?:LIMIT\s+(\d+))?(?:OFFSET\s+(\d+))?/i);
      if (match) {
        return { 
          type: 'SELECT', 
          table: match[2], 
          where: match[3]?.trim(),
          orderBy: match[4]?.trim(),
          limit: match[5] ? parseInt(match[5], 10) : undefined,
          offset: match[6] ? parseInt(match[6], 10) : undefined,
        };
      }
    }

    return { type: 'UNKNOWN', table: undefined };
  }

  private parseValues(valuesStr: string): unknown[] {
    return valuesStr.split(',').map(v => {
      const trimmed = v.trim();
      if (trimmed === '?' || trimmed.startsWith('$')) {
        return trimmed;
      }
      if (trimmed === 'NULL' || trimmed === 'null') {
        return null;
      }
      if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1);
      }
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
      }
      const num = Number(trimmed);
      if (!isNaN(num)) {
        return num;
      }
      return trimmed;
    });
  }

  private evaluateWhere(row: MockRow, where: string, params: unknown[]): boolean {
    if (!where) return true;
    
    let condition = where;
    let paramIndex = 0;
    
    condition = condition.replace(/\?/g, () => {
      const val = params[paramIndex++];
      return this.formatValue(val);
    });
    
    condition = condition.replace(/\$(\w+)/g, (_, key) => {
      const paramObj = params.find(p => typeof p === 'object' && p !== null && key in (p as Record<string, unknown>));
      if (paramObj) {
        return this.formatValue((paramObj as Record<string, unknown>)[key]);
      }
      return '';
    });

    try {
      return new Function('row', `return ${condition.replace(/(\w+)\s*=\s*/g, 'row["$1"] == ')}`)(row);
    } catch {
      return true;
    }
  }

  private formatValue(val: unknown): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
    return String(val);
  }

  private executeSelect(tableName: string, where?: string, orderBy?: string, limit?: number, offset?: number, params: unknown[] = []): MockRow[] {
    const table = this.tables.get(tableName);
    if (!table) return [];

    let results = table.rows.filter(row => this.evaluateWhere(row, where || '', params));

    if (orderBy) {
      const [column, direction] = orderBy.split(/\s+/);
      const col = column.toLowerCase();
      const desc = direction?.toUpperCase() === 'DESC';
      results = [...results].sort((a, b) => {
        const av = String(a[col] ?? '');
        const bv = String(b[col] ?? '');
        if (av < bv) return desc ? 1 : -1;
        if (av > bv) return desc ? -1 : 1;
        return 0;
      });
    }

    if (offset) {
      results = results.slice(offset);
    }
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async execAsync(sql: string): Promise<void> {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await this.executeStatement(stmt, []);
    }
  }

  private async executeStatement(sql: string, params: unknown[]): Promise<{ lastInsertRowId: number; changes: number } | MockRow[] | MockRow | null> {
    const parsed = this.parseSql(sql);
    
    switch (parsed.type) {
      case 'PRAGMA_USER_VERSION_SET':
        this.userVersion = parsed.values?.[0] as number ?? 0;
        return { lastInsertRowId: 0, changes: 1 };
      case 'PRAGMA_USER_VERSION_GET':
        return [{ user_version: this.userVersion }];
      case 'PRAGMA_JOURNAL_MODE':
      case 'PRAGMA_FOREIGN_KEYS':
        return { lastInsertRowId: 0, changes: 0 };
      case 'CREATE_TABLE':
        if (parsed.table && !this.tables.has(parsed.table)) {
          this.tables.set(parsed.table, { rows: [], columns: parsed.columns || [] });
        }
        return { lastInsertRowId: 0, changes: 0 };
      case 'INSERT': {
        if (!parsed.table || !parsed.columns || !parsed.values) {
          return { lastInsertRowId: 0, changes: 0 };
        }
        const table = this.tables.get(parsed.table);
        if (!table) return { lastInsertRowId: 0, changes: 0 };
        
        const row: MockRow = {};
        parsed.columns.forEach((col, i) => {
          let val = parsed.values![i];
          if (val === '?' || (typeof val === 'string' && val.startsWith('$'))) {
            val = params.shift();
          }
          row[col.toLowerCase()] = val;
        });
        
        if (!('id' in row) || row.id === undefined || row.id === null) {
          row.id = this.nextId++;
        }
        
        if (!('created_at' in row) || row.created_at === undefined) {
          row.created_at = new Date().toISOString();
        }
        if (!('updated_at' in row) || row.updated_at === undefined) {
          row.updated_at = new Date().toISOString();
        }
        
        table.rows.push(row);
        
        // Store in persistent storage
        const persistantTable = this.persistentRows.get(parsed.table);
        if (persistantTable) {
          persistantTable.push(row);
        }
        
        return { lastInsertRowId: row.id as number, changes: 1 };
      }
      case 'UPDATE': {
        if (!parsed.table || !parsed.columns || !parsed.values) {
          return { lastInsertRowId: 0, changes: 0 };
        }
        const table = this.tables.get(parsed.table);
        if (!table) return { lastInsertRowId: 0, changes: 0 };
        
        const where = parsed.where;
        let changes = 0;
        
        for (const row of table.rows) {
          if (this.evaluateWhere(row, where || '', params)) {
            parsed.columns.forEach((col, i) => {
              let val = parsed.values![i];
              if (val === '?' || (typeof val === 'string' && val.startsWith('$'))) {
                val = params.shift();
              }
              row[col.toLowerCase()] = val;
            });
            row.updated_at = new Date().toISOString();
            changes++;
          }
        }
        return { lastInsertRowId: 0, changes };
      }
      case 'DELETE': {
        if (!parsed.table) return { lastInsertRowId: 0, changes: 0 };
        const table = this.tables.get(parsed.table);
        if (!table) return { lastInsertRowId: 0, changes: 0 };
        
        const where = parsed.where;
        const initialLength = table.rows.length;
        table.rows = table.rows.filter(row => !this.evaluateWhere(row, where || '', params));
        
        // Also remove from persistent storage
        const persistantTable = this.persistentRows.get(parsed.table);
        if (persistantTable) {
          persistantTable.filter(row => {
            // Keep rows that were NOT deleted (where condition was false)
            return !this.evaluateWhere(row, where || '', params);
          });
        }
        
        return { lastInsertRowId: 0, changes: initialLength - table.rows.length };
      }
      case 'SELECT': {
        if (!parsed.table) return [];
        return this.executeSelect(parsed.table, parsed.where, parsed.orderBy, parsed.limit, parsed.offset, params);
      }
      default:
        return { lastInsertRowId: 0, changes: 0 };
    }
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const result = await this.executeStatement(sql, params);
    if (Array.isArray(result)) {
      return { lastInsertRowId: 0, changes: result.length };
    }
    return result as { lastInsertRowId: number; changes: number };
  }

  async getFirstAsync<T = MockRow>(sql: string, ...params: unknown[]): Promise<T | null> {
    const result = await this.executeStatement(sql, params);
    if (Array.isArray(result) && result.length > 0) {
      return result[0] as T;
    }
    return null;
  }

  async getAllAsync<T = MockRow>(sql: string, ...params: unknown[]): Promise<T[]> {
    const result = await this.executeStatement(sql, params);
    if (Array.isArray(result)) {
      return result as T[];
    }
    return [];
  }

  async *getEachAsync<T = MockRow>(sql: string, ...params: unknown[]): AsyncIterableIterator<T> {
    const results = await this.getAllAsync<T>(sql, ...params);
    for (const row of results) {
      yield row;
    }
  }

  async withExclusiveTransactionAsync(callback: (txn: MockDatabase) => Promise<void>): Promise<void> {
    this.inTransaction = true;
    try {
      const result = callback(this);
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      this.inTransaction = false;
    }
    return Promise.resolve();
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    this.inTransaction = true;
    try {
      await callback();
    } finally {
      this.inTransaction = false;
    }
    return Promise.resolve();
  }

  isInTransactionAsync(): Promise<boolean> {
    return Promise.resolve(this.inTransaction);
  }

  closeAsync(): Promise<void> {
    // In a real SQLite database, data is persisted to disk.
    // In our mock, we simulate this by keeping the persistentRows.
    // The in-memory tables will be reset on re-initialize.
    return Promise.resolve();
  }

  getDatabaseVersion(): number {
    return this.userVersion;
  }

  setDatabaseVersion(version: number): void {
    this.userVersion = version;
  }
}

const mockDbInstance = new MockDatabase();

const mockOpenDatabaseAsync = jest.fn().mockImplementation(async () => mockDbInstance);
const mockOpenDatabaseSync = jest.fn().mockImplementation(() => mockDbInstance);

const mockSQLiteProvider = ({ children }: { children: React.ReactNode }) => children;
const mockUseSQLiteContext = () => mockDbInstance;

module.exports = {
  openDatabaseAsync: mockOpenDatabaseAsync,
  openDatabaseSync: mockOpenDatabaseSync,
  SQLiteProvider: mockSQLiteProvider,
  useSQLiteContext: mockUseSQLiteContext,
  defaultDatabaseDirectory: '/mock/path',
  SQLiteDatabase: jest.fn().mockImplementation(() => mockDbInstance),
  AsyncStorage: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
  Storage: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
    setItemSync: jest.fn(),
    getItemSync: jest.fn().mockReturnValue(null),
    removeItemSync: jest.fn(),
    clearSync: jest.fn(),
    getAllKeysSync: jest.fn().mockReturnValue([]),
    multiGetSync: jest.fn().mockReturnValue([]),
    multiSetSync: jest.fn(),
    multiRemoveSync: jest.fn(),
  },
  bundledExtensions: {},
};