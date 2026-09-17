import { SQLiteDatabase } from 'expo-sqlite';
import { Migration } from './Migration';

export const createUserProfilesMigration: Migration = {
  version: 2,
  name: 'create_user_profiles',
  up: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
    `);
  },
  down: async (db: SQLiteDatabase) => {
    await db.execAsync(`
      DROP TABLE IF EXISTS user_profiles;
    `);
  },
};