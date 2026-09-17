import { openDatabaseAsync } from '../testing/sqljs-expo-sqlite';

describe('sql.js adapter', () => {
  it('binds parameters and reports affected rows for insert/update/delete', async () => {
    const db = await openDatabaseAsync('adapter_regression.db');
    await db.execAsync(
      'CREATE TABLE db_test_records (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, value TEXT NOT NULL, int_value INTEGER, updated_at TEXT)',
    );

    const ins = await db.runAsync(
      'INSERT INTO db_test_records (value, int_value) VALUES (?, ?)',
      'hello',
      7,
    );
    expect(ins.lastInsertRowId).toBeGreaterThan(0);
    expect(ins.changes).toBe(1);

    const rows = await db.getAllAsync(
      'SELECT value, int_value FROM db_test_records',
    );
    expect(rows).toEqual([{ value: 'hello', int_value: 7 }]);

    const upd = await db.runAsync(
      'UPDATE db_test_records SET value = ?, int_value = ? WHERE id = ?',
      'world',
      9,
      ins.lastInsertRowId,
    );
    expect(upd.changes).toBe(1);

    const updated = await db.getAllAsync(
      'SELECT value, int_value FROM db_test_records',
    );
    expect(updated).toEqual([{ value: 'world', int_value: 9 }]);

    const del = await db.runAsync(
      'DELETE FROM db_test_records WHERE id = ?',
      ins.lastInsertRowId,
    );
    expect(del.changes).toBe(1);

    const remaining = await db.getAllAsync('SELECT value FROM db_test_records');
    expect(remaining).toEqual([]);

    await db.closeAsync();
  });
});