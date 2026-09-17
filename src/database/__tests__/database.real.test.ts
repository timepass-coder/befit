import { databaseManager } from '../database/DatabaseManager';
import { dbTestRecordRepository } from '../repositories/DbTestRecordRepository';

describe('Database Foundation (real sql.js)', () => {
  beforeEach(async () => {
    await databaseManager.close();
    await databaseManager.initialize();
  });

  afterEach(async () => {
    await databaseManager.close();
  });

  it('should update the database row using the snake_case updated_at column', async () => {
    const created = await dbTestRecordRepository.create({
      value: 'sqljs_update_test',
      intValue: 7,
    });

    console.log('created', created);
    console.log(
      'before update rows',
      await databaseManager
        .getDatabase()
        .getAllAsync('SELECT * FROM db_test_records'),
    );

    const updated = await dbTestRecordRepository.update({
      id: created.id,
      value: 'sqljs_updated_value',
      intValue: 9,
    });

    expect(updated.value).toBe('sqljs_updated_value');
    expect(updated.intValue).toBe(9);

    const row = await databaseManager
      .getDatabase()
      .getFirstAsync<{ updated_at: string }>(
        'SELECT updated_at FROM db_test_records WHERE id = ?',
        created.id,
      );

    expect(row).not.toBeNull();
    expect(row!.updated_at).toBe(updated.updatedAt);
  });
});
