import { openDatabaseAsync } from '../testing/sqljs-expo-sqlite';

describe('adapter debug', () => {
  it('inspects runAsync create+update', async () => {
    const db = await openDatabaseAsync('x.db');
    await db.execAsync(
      'CREATE TABLE db_test_records (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, value TEXT NOT NULL, int_value INTEGER, updated_at TEXT)',
    );
    const ins = await db.runAsync(
      'INSERT INTO db_test_records (value, int_value) VALUES (?, ?)',
      'hello',
      7,
    );
    console.log('INSERT result:', JSON.stringify(ins));
    console.log('row:', JSON.stringify(await db.getAllAsync('SELECT * FROM db_test_records')));

    const upd = await db.runAsync(
      'UPDATE db_test_records SET value = ?, int_value = ?, updated_at = ? WHERE id = ?',
      'world',
      9,
      '2026-01-01',
      ins.lastInsertRowId,
    );
    console.log('UPDATE result:', JSON.stringify(upd));
    console.log('row after:', JSON.stringify(await db.getAllAsync('SELECT * FROM db_test_records')));

    const del = await db.runAsync('DELETE FROM db_test_records WHERE id = ?', ins.lastInsertRowId);
    console.log('DELETE result:', JSON.stringify(del));
  });
});