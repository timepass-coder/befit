import { SQLiteDatabase } from 'expo-sqlite';
import { Migration } from './Migration';

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  up: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
  down: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      DROP TABLE IF EXISTS schema_migrations;
    `);
  },
};