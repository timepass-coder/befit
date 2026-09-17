import { databaseManager } from '../database/DatabaseManager';
import { userProfileRepository } from '../repositories/UserProfileRepository';
import { DATABASE_NAME } from '../database/DatabaseConfig';
import {
  DatabaseConnectionError,
  DatabaseNotFoundError,
  isDatabaseError,
} from '../errors/DatabaseError';
import {
  openDatabaseAsync,
  removeDatabaseFile,
} from '../testing/sqljs-expo-sqlite';

describe('Database Foundation', () => {
  beforeAll(async () => {
    removeDatabaseFile(DATABASE_NAME);
    await databaseManager.initialize();
  });

  afterAll(async () => {
    await databaseManager.close();
    removeDatabaseFile(DATABASE_NAME);
  });

  beforeEach(async () => {
    await databaseManager.close();
    await databaseManager.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(databaseManager.isInitialized()).toBe(true);
    });

    it('should be safe to call initialize multiple times', async () => {
      await expect(databaseManager.initialize()).resolves.not.toThrow();
      expect(databaseManager.isInitialized()).toBe(true);
    });

    it('should have the current database version', async () => {
      const version = await databaseManager.getCurrentVersion();
      expect(version).toBe(2);
    });

    it('should create the production schema tables', async () => {
      const db = databaseManager.getDatabase();
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      );
      const names = tables.map((t) => t.name);
      expect(names).toContain('schema_migrations');
      expect(names).toContain('user_profiles');
    });

    it('should throw DatabaseConnectionError before initialization', async () => {
      await databaseManager.close();
      expect(() => databaseManager.getDatabase()).toThrow(DatabaseConnectionError);
    });
  });
describe('CRUD Operations', () => {
    const uniqueEmail = () =>
      `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

    it('should create a user profile', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
      });

      expect(created.id).toBeGreaterThan(0);
      expect(created.displayName).toBe('Ada Lovelace');
      expect(created.email).toBe('ada@example.com');
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('should create a user profile without an email', async () => {
      const created = await userProfileRepository.create({
        displayName: 'No Email',
      });

      expect(created.id).toBeGreaterThan(0);
      expect(created.email).toBeNull();
    });

    it('should get a user profile by id', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Grace Hopper',
      });
      const found = await userProfileRepository.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.displayName).toBe('Grace Hopper');
    });

    it('should throw DatabaseNotFoundError from getByIdOrThrow for missing id', async () => {
      await expect(userProfileRepository.getByIdOrThrow(999999)).rejects.toThrow(
        DatabaseNotFoundError,
      );
    });

    it('should return null for a non-existent id', async () => {
      const found = await userProfileRepository.getById(999999);
      expect(found).toBeNull();
    });

    it('should get all user profiles', async () => {
      await userProfileRepository.create({ displayName: 'Lin A' });
      await userProfileRepository.create({ displayName: 'Lin B' });

      const all = await userProfileRepository.getAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
it('should find a user profile by email', async () => {
      const email = uniqueEmail();
      await userProfileRepository.create({ displayName: 'Find Me', email });

      const found = await userProfileRepository.findByEmail(email);
      expect(found).not.toBeNull();
      expect(found!.email).toBe(email);
    });

    it('should find user profiles by display name', async () => {
      const displayName = `SharedName_${Date.now()}`;
      await userProfileRepository.create({ displayName });
      await userProfileRepository.create({ displayName });

      const found = await userProfileRepository.findByDisplayName(displayName);
      expect(found.length).toBe(2);
    });

    it('should update a user profile', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Old Name',
        email: 'old@example.com',
      });

      const updated = await userProfileRepository.update({
        id: created.id,
        displayName: 'New Name',
        email: 'new@example.com',
      });

      expect(updated.id).toBe(created.id);
      expect(updated.displayName).toBe('New Name');
      expect(updated.email).toBe('new@example.com');
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should partially update a user profile preserving unspecified fields', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Keep Email',
        email: 'keep@example.com',
      });

      const updated = await userProfileRepository.update({
        id: created.id,
        displayName: 'Changed Name',
      });

      expect(updated.displayName).toBe('Changed Name');
      expect(updated.email).toBe('keep@example.com');
    });

    it('should clear an email via update', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Clear Email',
        email: 'clear@example.com',
      });

      const updated = await userProfileRepository.update({
        id: created.id,
        email: null,
      });

      expect(updated.email).toBeNull();
    });

    it('should delete a user profile', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Delete Me',
      });

      const deleted = await userProfileRepository.delete(created.id);
      expect(deleted).toBe(true);

      const found = await userProfileRepository.getById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting a non-existent record', async () => {
      const deleted = await userProfileRepository.delete(999999);
      expect(deleted).toBe(false);
    });

    it('should check existence', async () => {
      const created = await userProfileRepository.create({ displayName: 'Exists' });

      expect(await userProfileRepository.exists(created.id)).toBe(true);
      expect(await userProfileRepository.exists(999999)).toBe(false);
    });

    it('should count user profiles', async () => {
      const count = await userProfileRepository.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
describe('Transaction Support', () => {
    it('should commit a transaction on success', async () => {
      const results = await databaseManager.executeInTransaction(async (db) => {
        const result1 = await db.runAsync(
          'INSERT INTO user_profiles (display_name, email) VALUES (?, ?)',
          'Txn A',
          'txn.a@example.com',
        );
        const result2 = await db.runAsync(
          'INSERT INTO user_profiles (display_name, email) VALUES (?, ?)',
          'Txn B',
          'txn.b@example.com',
        );
        return [result1.lastInsertRowId, result2.lastInsertRowId];
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toBeGreaterThan(0);
      expect(results[1]).toBeGreaterThan(0);

      const record1 = await userProfileRepository.getById(results[0]);
      const record2 = await userProfileRepository.getById(results[1]);

      expect(record1).not.toBeNull();
      expect(record2).not.toBeNull();
    });

    it('should rollback a transaction on error', async () => {
      const initialCount = await userProfileRepository.count();

      await expect(
        databaseManager.executeInTransaction(async (db) => {
          await db.runAsync(
            'INSERT INTO user_profiles (display_name, email) VALUES (?, ?)',
            'Rollback 1',
            'rollback.1@example.com',
          );
          throw new Error('Intentional error for rollback test');
        }),
      ).rejects.toThrow('Intentional error for rollback test');

      const finalCount = await userProfileRepository.count();
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Error Handling', () => {
    it('should throw DatabaseNotFoundError for update on non-existent id', async () => {
      let caught: unknown;
      try {
        await userProfileRepository.update({
          id: 999999,
          displayName: 'test',
        });
      } catch (error) {
        caught = error;
      }

      expect(isDatabaseError(caught)).toBe(true);
      if (isDatabaseError(caught)) {
        expect(caught.code).toBe('DATABASE_NOT_FOUND_ERROR');
      }
    });

    it('should wrap database errors in DatabaseQueryError', async () => {
      let caught: unknown;
      try {
        await userProfileRepository.find({ non_existent_column: 'test' });
      } catch (error) {
        caught = error;
      }

      expect(isDatabaseError(caught)).toBe(true);
      if (isDatabaseError(caught)) {
        expect(caught.code).toBe('DATABASE_QUERY_ERROR');
      }
    });

    it('should wrap constraint violations in DatabaseQueryError', async () => {
      const email = 'duplicate@example.com';
      await userProfileRepository.create({
        displayName: 'First',
        email,
      });

      let caught: unknown;
      try {
        await userProfileRepository.create({
          displayName: 'Second',
          email,
        });
      } catch (error) {
        caught = error;
      }

      expect(isDatabaseError(caught)).toBe(true);
    });
  });
describe('Persistence', () => {
    it('should persist data across a database reopen', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Persist Reopen',
        email: 'persist.reopen@example.com',
      });
      const id = created.id;

      await databaseManager.close();
      await databaseManager.initialize();

      const found = await userProfileRepository.getById(id);
      expect(found).not.toBeNull();
      expect(found!.displayName).toBe('Persist Reopen');
    });

    it('should persist data to disk across a fresh connection', async () => {
      const created = await userProfileRepository.create({
        displayName: 'Persist Disk',
        email: 'persist.disk@example.com',
      });
      const id = created.id;

      // Close so the current connection is flushed to disk.
      await databaseManager.close();

      // Simulate a completely new connection/process reading from disk.
      const freshDb = await openDatabaseAsync(DATABASE_NAME);
      const row = await freshDb.getFirstAsync<{
        display_name: string;
        email: string | null;
      }>('SELECT display_name, email FROM user_profiles WHERE id = ?', id);

      expect(row).not.toBeNull();
      expect(row!.display_name).toBe('Persist Disk');
      expect(row!.email).toBe('persist.disk@example.com');

      await freshDb.closeAsync();
    });
  });
describe('Migration Recovery at Startup', () => {
    it('recovers at startup when schema_migrations and user_version are desynced (partial prior run)', async () => {
      const db = databaseManager.getDatabase();

      // Reproduce the state that previously caused every startup (and Retry) to
      // fail with "Migration 1 (initial_schema) failed": migration 1 is recorded
      // in schema_migrations, but PRAGMA user_version was never advanced and
      // migration 2's work is missing. The manager must skip migration 1 and
      // apply only what is missing instead of re-running migration 1 (which
      // would violate the schema_migrations.version PRIMARY KEY).
      await db.execAsync('DROP TABLE IF EXISTS user_profiles');
      await db.runAsync('DELETE FROM schema_migrations WHERE version = 2');
      await db.execAsync('PRAGMA user_version = 0');

      // App startup re-initializes the database.
      await databaseManager.close();
      await databaseManager.initialize();

      expect(await databaseManager.getCurrentVersion()).toBe(2);

      const tables = await databaseManager
        .getDatabase()
        .getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_profiles'",
        );
      expect(tables.length).toBe(1);
    });
  });
});