import { SQLiteDatabase } from 'expo-sqlite';
import { Migration } from './Migration';

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  up: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS db_test_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        value TEXT NOT NULL,
        int_value INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_db_test_records_value ON db_test_records(value);
    `);
  },
  down: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      DROP TABLE IF EXISTS db_test_records;
      DROP TABLE IF EXISTS schema_migrations;
    `);
  },
};