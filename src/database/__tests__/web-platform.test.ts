import { databaseManager } from '../database/DatabaseManager';
import { DatabaseMigrationError } from '../errors/DatabaseError';
import { Platform, removeDatabaseFile, openDatabaseAsync } from '../testing/sqljs-expo-sqlite';
import { setTestPlatform } from '../database/transactions';
import { DATABASE_NAME } from '../database/DatabaseConfig';

// This test file runs with setTestPlatform('web') to verify web-specific behavior

let testCounter = 0;
function uniqueName(base: string): string {
  return `${base}-${Date.now()}-${++testCounter}`;
}

describe('Web Platform SQLite Behavior', () => {
  beforeAll(() => {
    // Force web platform for these tests
    setTestPlatform('web');
    // Also update the mock Platform for tests that use it directly
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      writable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    // Restore original platform
    setTestPlatform(null);
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
      configurable: true,
    });
  });

  beforeEach(async () => {
    removeDatabaseFile(DATABASE_NAME);
    await databaseManager.close();
  });

  afterEach(async () => {
    await databaseManager.close();
    removeDatabaseFile(DATABASE_NAME);
  });

  describe('withExclusiveTransactionAsync on web', () => {
    it('should throw when calling withExclusiveTransactionAsync on web', async () => {
      const dbName = uniqueName('test-exclusive-web');
      const db = await openDatabaseAsync(dbName);
      
      await expect(
        db.withExclusiveTransactionAsync(async () => {})
      ).rejects.toThrow('withExclusiveTransactionAsync is not supported on web');
      
      await db.closeAsync();
      removeDatabaseFile(dbName);
    });
  });

  describe('withTransactionAsync on web', () => {
    it('should work with regular withTransactionAsync on web', async () => {
      const dbName = uniqueName('test-transaction-web');
      const db = await openDatabaseAsync(dbName);
      
      await db.execAsync('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
      
      const result = await db.withTransactionAsync(async (txn) => {
        await txn.runAsync('INSERT INTO test (value) VALUES (?)', 'hello');
        return 'success';
      });
      
      expect(result).toBe('success');
      
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM test');
      expect(row?.value).toBe('hello');
      
      await db.closeAsync();
      removeDatabaseFile(dbName);
    });

    it('should rollback on error in withTransactionAsync on web', async () => {
      const dbName = uniqueName('test-rollback-web');
      const db = await openDatabaseAsync(dbName);
      
      await db.execAsync('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT UNIQUE)');
      await db.runAsync('INSERT INTO test (value) VALUES (?)', 'existing');
      
      await expect(
        db.withTransactionAsync(async (txn) => {
          await txn.runAsync('INSERT INTO test (value) VALUES (?)', 'new-value');
          // This will fail due to UNIQUE constraint
          await txn.runAsync('INSERT INTO test (value) VALUES (?)', 'existing');
        })
      ).rejects.toThrow();
      
      // Verify rollback happened - only the first row should exist
      const rows = await db.getAllAsync<{ value: string }>('SELECT value FROM test');
      expect(rows.length).toBe(1);
      expect(rows[0].value).toBe('existing');
      
      await db.closeAsync();
      removeDatabaseFile(dbName);
    });
  });
});