import { SQLiteDatabase } from 'expo-sqlite';
import { Migration, MigrationRecord } from './Migration';
import { DATABASE_VERSION } from '../DatabaseConfig';
import {
  DatabaseMigrationError,
  DatabaseQueryError,
} from '../../errors/DatabaseError';

export class MigrationRunner {
  private migrations: Migration[] = [];

  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  registerMigrations(migrations: Migration[]): void {
    migrations.forEach((m) => this.registerMigration(m));
  }

  async getCurrentVersion(db: SQLiteDatabase): Promise<number> {
    try {
      const result = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
      );
      return result?.user_version ?? 0;
    } catch (error) {
      throw new DatabaseQueryError(
        'Failed to get current database version',
        error as Error
      );
    }
  }

  async getAppliedMigrations(db: SQLiteDatabase): Promise<MigrationRecord[]> {
    try {
      return await db.getAllAsync<MigrationRecord>(
        'SELECT version, name, applied_at as appliedAt FROM schema_migrations ORDER BY version'
      );
    } catch (error) {
      throw new DatabaseQueryError(
        'Failed to get applied migrations',
        error as Error
      );
    }
  }

  async runMigrations(db: SQLiteDatabase): Promise<void> {
    const currentVersion = await this.getCurrentVersion(db);
    const targetVersion = DATABASE_VERSION;

    if (currentVersion >= targetVersion) {
      return;
    }

    const pendingMigrations = this.migrations.filter(
      (m) => m.version > currentVersion && m.version <= targetVersion
    );

    if (pendingMigrations.length === 0) {
      throw new DatabaseMigrationError(
        `No migrations found for versions ${currentVersion + 1} to ${targetVersion}`
      );
    }

    for (const migration of pendingMigrations) {
      await this.runMigration(db, migration);
    }

    await db.execAsync(`PRAGMA user_version = ${targetVersion}`);
  }

  private async runMigration(db: SQLiteDatabase, migration: Migration): Promise<void> {
    try {
      await db.withExclusiveTransactionAsync(async (txn) => {
        await migration.up(txn);
        await txn.runAsync(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          migration.version,
          migration.name
        );
      });
    } catch (error) {
      throw new DatabaseMigrationError(
        `Migration ${migration.version} (${migration.name}) failed`,
        error as Error
      );
    }
  }

  async rollbackMigration(db: SQLiteDatabase, targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion(db);

    if (targetVersion >= currentVersion) {
      return;
    }

    const migrationsToRollback = this.migrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version);

    for (const migration of migrationsToRollback) {
      if (!migration.down) {
        throw new DatabaseMigrationError(
          `Migration ${migration.version} (${migration.name}) does not support rollback`
        );
      }

      try {
        await db.withExclusiveTransactionAsync(async (txn) => {
          await migration.down!(txn);
          await txn.runAsync(
            'DELETE FROM schema_migrations WHERE version = ?',
            migration.version
          );
        });
      } catch (error) {
        throw new DatabaseMigrationError(
          `Rollback of migration ${migration.version} (${migration.name}) failed`,
          error as Error
        );
      }
    }

    await db.execAsync(`PRAGMA user_version = ${targetVersion}`);
  }

  getMigrations(): Migration[] {
    return [...this.migrations];
  }
}

export const migrationRunner = new MigrationRunner();