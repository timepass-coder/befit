import { SQLiteDatabase } from 'expo-sqlite';
import { Migration, MigrationRecord, createMigrationTableSql } from './Migration';
import { DATABASE_VERSION } from '../DatabaseConfig';
import {
  DatabaseMigrationError,
  DatabaseQueryError,
} from '../../errors/DatabaseError';
import { runInTransactionAsync } from '../transactions';

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

  private async ensureMigrationTable(db: SQLiteDatabase): Promise<void> {
    try {
      await db.execAsync(createMigrationTableSql);
    } catch (error) {
      throw new DatabaseMigrationError(
        'Failed to ensure schema_migrations table',
        error as Error,
      );
    }
  }

  async runMigrations(db: SQLiteDatabase): Promise<void> {
    await this.ensureMigrationTable(db);

    const targetVersion = DATABASE_VERSION;

    // The schema_migrations rows are the source of truth for which migrations
    // have actually been applied. Relying only on PRAGMA user_version is not
    // safe: user_version is written at the end of a migration run and can fall
    // out of sync (e.g. an interrupted run), which would otherwise cause an
    // already-applied migration to re-run and fail on its bookkeeping insert.
    const appliedVersions = new Set(
      (await this.getAppliedMigrations(db)).map((m) => m.version),
    );
    const maxApplied = Math.max(0, ...appliedVersions);

    if (maxApplied >= targetVersion) {
      // Reconcile user_version so it matches the source of truth even when
      // there is nothing to apply (e.g. left stale by an interrupted run).
      const currentVersion = await this.getCurrentVersion(db);
      if (currentVersion !== maxApplied) {
        await db.execAsync(`PRAGMA user_version = ${maxApplied}`);
      }
      return;
    }

    const pendingMigrations = this.migrations
      .filter(
        (m) =>
          m.version >= 1 &&
          m.version <= targetVersion &&
          !appliedVersions.has(m.version),
      )
      .sort((a, b) => a.version - b.version);

    if (pendingMigrations.length === 0) {
      throw new DatabaseMigrationError(
        `No migrations found for versions ${maxApplied + 1} to ${targetVersion}`
      );
    }

    for (const migration of pendingMigrations) {
      await this.runMigration(db, migration);
      // Keep user_version in sync as each migration is applied so it matches
      // the recorded schema_migrations rows even if a later step fails.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    }

    // Re-sync user_version to the highest applied version so a stale value
    // (e.g. 0 from an interrupted prior run) is reconciled going forward.
    const appliedAfterRun = (await this.getAppliedMigrations(db)).map(
      (m) => m.version,
    );
    const maxAppliedAfterRun = Math.max(0, ...appliedAfterRun);
    await db.execAsync(`PRAGMA user_version = ${maxAppliedAfterRun}`);
  }

  private async runMigration(db: SQLiteDatabase, migration: Migration): Promise<void> {
    try {
      await runInTransactionAsync(db, async (txn) => {
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
    await this.ensureMigrationTable(db);

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
        await runInTransactionAsync(db, async (txn) => {
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