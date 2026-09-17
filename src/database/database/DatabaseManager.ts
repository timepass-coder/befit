import * as SQLite from 'expo-sqlite';
import { SQLiteDatabase } from 'expo-sqlite';
import { defaultDatabaseConfig, DatabaseConfig } from './DatabaseConfig';
import { migrationRunner } from './migrations/MigrationRunner';
import { initialSchemaMigration } from './migrations/001_initial_schema';
import { createUserProfilesMigration } from './migrations/002_create_user_profiles';
import {
  DatabaseInitializationError,
  DatabaseConnectionError,
  isDatabaseError,
} from '../errors/DatabaseError';
import { runInTransactionAsync } from './transactions';

migrationRunner.registerMigrations([
  initialSchemaMigration,
  createUserProfilesMigration,
]);

export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private database: SQLiteDatabase | null = null;
  private config: DatabaseConfig;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor(config: DatabaseConfig = defaultDatabaseConfig) {
    this.config = config;
  }

  static getInstance(config?: DatabaseConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(config);
    }
    return DatabaseManager.instance;
  }

  static resetInstance(): void {
    if (DatabaseManager.instance) {
      DatabaseManager.instance.close();
      DatabaseManager.instance = null;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized && this.database) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize().finally(() => {
      // Clear the cached promise so that a subsequent retry can start fresh.
      // This fixes the bug where the Retry button did nothing because
      // the rejected promise was cached and re-awaited on every retry.
      this.initializationPromise = null;
    });
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      this.database = await SQLite.openDatabaseAsync(this.config.name);

      await this.database.execAsync(
        `PRAGMA journal_mode = ${this.config.journalMode};`
      );

      if (this.config.enableForeignKeys) {
        await this.database.execAsync('PRAGMA foreign_keys = ON;');
      }

      await migrationRunner.runMigrations(this.database);

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.database = null;
      if (isDatabaseError(error)) {
        throw error;
      }
      throw new DatabaseInitializationError(
        'Failed to initialize database',
        error as Error
      );
    }
  }

  getDatabase(): SQLiteDatabase {
    if (!this.database || !this.initialized) {
      throw new DatabaseConnectionError(
        'Database not initialized. Call initialize() first.'
      );
    }
    return this.database;
  }

  async close(): Promise<void> {
    if (this.database) {
      try {
        await this.database.closeAsync();
      } catch (error) {
        throw new DatabaseConnectionError(
          'Failed to close database',
          error as Error
        );
      } finally {
        this.database = null;
        this.initialized = false;
        this.initializationPromise = null;
      }
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.database !== null;
  }

  async executeInTransaction<T>(
    callback: (db: SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    const db = this.getDatabase();
    let result: T;
    await runInTransactionAsync(db, async (txn) => {
      result = await callback(txn);
    });
    return result!;
  }

  async getCurrentVersion(): Promise<number> {
    const db = this.getDatabase();
    return migrationRunner.getCurrentVersion(db);
  }
}

export const databaseManager = DatabaseManager.getInstance();