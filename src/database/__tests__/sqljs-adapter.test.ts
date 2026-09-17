import {
  openDatabaseAsync,
  removeDatabaseFile,
} from '../testing/sqljs-expo-sqlite';

describe('sql.js adapter', () => {
  it('binds parameters and reports affected rows for insert/update/delete', async () => {
    const db = await openDatabaseAsync('adapter_regression.db');
    await db.execAsync(
      'CREATE TABLE adapter_records (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, value TEXT NOT NULL, int_value INTEGER, updated_at TEXT)',
    );

    const ins = await db.runAsync(
      'INSERT INTO adapter_records (value, int_value) VALUES (?, ?)',
      'hello',
      7,
    );
    expect(ins.lastInsertRowId).toBeGreaterThan(0);
    expect(ins.changes).toBe(1);

    const rows = await db.getAllAsync(
      'SELECT value, int_value FROM adapter_records',
    );
    expect(rows).toEqual([{ value: 'hello', int_value: 7 }]);

    const upd = await db.runAsync(
      'UPDATE adapter_records SET value = ?, int_value = ? WHERE id = ?',
      'world',
      9,
      ins.lastInsertRowId,
    );
    expect(upd.changes).toBe(1);

    const updated = await db.getAllAsync(
      'SELECT value, int_value FROM adapter_records',
    );
    expect(updated).toEqual([{ value: 'world', int_value: 9 }]);

    const del = await db.runAsync(
      'DELETE FROM adapter_records WHERE id = ?',
      ins.lastInsertRowId,
    );
    expect(del.changes).toBe(1);

    const remaining = await db.getAllAsync('SELECT value FROM adapter_records');
    expect(remaining).toEqual([]);

    await db.closeAsync();
    removeDatabaseFile('adapter_regression.db');
  });

  it('persists database contents to disk and reloads them on reopen', async () => {
    const name = 'adapter_persist.db';
    removeDatabaseFile(name);

    const db = await openDatabaseAsync(name);
    await db.execAsync(
      'CREATE TABLE persisted (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, value TEXT NOT NULL)',
    );
    const res = await db.runAsync(
      'INSERT INTO persisted (value) VALUES (?)',
      'on-disk-value',
    );
    const id = res.lastInsertRowId;
    await db.closeAsync();

    // Reopen the same on-disk file from a brand-new connection.
    const reopened = await openDatabaseAsync(name);
    const row = await reopened.getFirstAsync<{ value: string }>(
      'SELECT value FROM persisted WHERE id = ?',
      id,
    );
    expect(row).not.toBeNull();
    expect(row!.value).toBe('on-disk-value');

    await reopened.closeAsync();
    removeDatabaseFile(name);
  });
});