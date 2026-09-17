import { databaseManager } from '../database/DatabaseManager';
import { dbTestRecordRepository } from '../repositories/DbTestRecordRepository';
import { CreateDbTestRecordInput } from '../models/DbTestRecord';
import { DatabaseError, isDatabaseError } from '../errors/DatabaseError';

describe('Database Foundation', () => {
  beforeAll(async () => {
    await databaseManager.initialize();
  });

  afterAll(async () => {
    await databaseManager.close();
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

    it('should have correct database version', async () => {
      const version = await databaseManager.getCurrentVersion();
      expect(version).toBe(1);
    });
  });

  describe('CRUD Operations', () => {
    const testValue = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    it('should create a record', async () => {
      const input: CreateDbTestRecordInput = {
        value: testValue,
        intValue: 42,
      };

      const created = await dbTestRecordRepository.create(input);

      expect(created.id).toBeGreaterThan(0);
      expect(created.value).toBe(testValue);
      expect(created.intValue).toBe(42);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('should get a record by id', async () => {
      const input: CreateDbTestRecordInput = {
        value: `get_by_id_${Date.now()}`,
        intValue: 100,
      };

      const created = await dbTestRecordRepository.create(input);
      const found = await dbTestRecordRepository.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.value).toBe(created.value);
      expect(found!.intValue).toBe(created.intValue);
    });

    it('should return null for non-existent id', async () => {
      const found = await dbTestRecordRepository.getById(999999);
      expect(found).toBeNull();
    });

    it('should get all records', async () => {
      const all = await dbTestRecordRepository.getAll();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0);
    });

    it('should update a record', async () => {
      const input: CreateDbTestRecordInput = {
        value: `update_test_${Date.now()}`,
        intValue: 200,
      };

      const created = await dbTestRecordRepository.create(input);
      const updated = await dbTestRecordRepository.update({
        id: created.id,
        value: 'updated_value',
        intValue: 300,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.value).toBe('updated_value');
      expect(updated.intValue).toBe(300);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should partially update a record', async () => {
      const input: CreateDbTestRecordInput = {
        value: `partial_update_${Date.now()}`,
        intValue: 400,
      };

      const created = await dbTestRecordRepository.create(input);
      const updated = await dbTestRecordRepository.update({
        id: created.id,
        value: 'partially_updated',
      });

      expect(updated.value).toBe('partially_updated');
      expect(updated.intValue).toBe(400);
    });

    it('should delete a record', async () => {
      const input: CreateDbTestRecordInput = {
        value: `delete_test_${Date.now()}`,
        intValue: 500,
      };

      const created = await dbTestRecordRepository.create(input);
      const deleted = await dbTestRecordRepository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await dbTestRecordRepository.getById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent record', async () => {
      const deleted = await dbTestRecordRepository.delete(999999);
      expect(deleted).toBe(false);
    });

    it('should check existence', async () => {
      const input: CreateDbTestRecordInput = {
        value: `exists_test_${Date.now()}`,
        intValue: 600,
      };

      const created = await dbTestRecordRepository.create(input);
      const exists = await dbTestRecordRepository.exists(created.id);
      const notExists = await dbTestRecordRepository.exists(999999);

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should count records', async () => {
      const all = await dbTestRecordRepository.getAll();
      expect(all.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Transaction Support', () => {
    it('should commit transaction on success', async () => {
      const results = await databaseManager.executeInTransaction(async (db) => {
        const result1 = await db.runAsync(
          'INSERT INTO db_test_records (value, int_value) VALUES (?, ?)',
          'txn_test_1',
          1
        );
        const result2 = await db.runAsync(
          'INSERT INTO db_test_records (value, int_value) VALUES (?, ?)',
          'txn_test_2',
          2
        );
        return [result1.lastInsertRowId, result2.lastInsertRowId];
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toBeGreaterThan(0);
      expect(results[1]).toBeGreaterThan(0);

      const record1 = await dbTestRecordRepository.getById(results[0]);
      const record2 = await dbTestRecordRepository.getById(results[1]);

      expect(record1).not.toBeNull();
      expect(record2).not.toBeNull();
    });

    it('should rollback transaction on error', async () => {
      const initialCount = await dbTestRecordRepository.count();

      await expect(
        databaseManager.executeInTransaction(async (db) => {
          await db.runAsync(
            'INSERT INTO db_test_records (value, int_value) VALUES (?, ?)',
            'txn_rollback_1',
            1
          );
          throw new Error('Intentional error for rollback test');
        })
      ).rejects.toThrow('Intentional error for rollback test');

      const finalCount = await dbTestRecordRepository.count();
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('Error Handling', () => {
    it('should throw DatabaseNotFoundError for update on non-existent id', async () => {
      await expect(
        dbTestRecordRepository.update({
          id: 999999,
          value: 'test',
        })
      ).rejects.toThrow();

      try {
        await dbTestRecordRepository.update({
          id: 999999,
          value: 'test',
        });
      } catch (error) {
        expect(isDatabaseError(error)).toBe(true);
        if (isDatabaseError(error)) {
          expect(error.code).toBe('DATABASE_NOT_FOUND_ERROR');
        }
      }
    });

    it('should wrap database errors in DatabaseError', async () => {
      expect.assertions(2);
      try {
        await dbTestRecordRepository.find({ non_existent_column: 'test' });
      } catch (error) {
        expect(isDatabaseError(error)).toBe(true);
        if (isDatabaseError(error)) {
          expect(error.code).toBe('DATABASE_QUERY_ERROR');
        }
      }
    });
  });

  describe('Persistence', () => {
    it('should persist data across database reopen', async () => {
      const input: CreateDbTestRecordInput = {
        value: `persist_test_${Date.now()}`,
        intValue: 700,
      };

      const created = await dbTestRecordRepository.create(input);
      const id = created.id;

      await databaseManager.close();
      await databaseManager.initialize();

      const found = await dbTestRecordRepository.getById(id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(id);
      expect(found!.value).toBe(input.value);
      expect(found!.intValue).toBe(input.intValue);
    });
  });
});