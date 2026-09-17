import { MigrationRunner, migrationRunner } from '../database/migrations/MigrationRunner';
import { Migration } from '../database/migrations/Migration';
import { initialSchemaMigration } from '../database/migrations/001_initial_schema';
import { createUserProfilesMigration } from '../database/migrations/002_create_user_profiles';
import { DatabaseMigrationError } from '../errors/DatabaseError';
import { databaseManager } from '../database/DatabaseManager';
import type { SQLiteDatabase as ExpoSQLiteDatabase } from 'expo-sqlite';
import {
  openDatabaseAsync,
  removeDatabaseFile,
  type SQLiteDatabase,
} from '../testing/sqljs-expo-sqlite';

function createTableMigration(
  version: number,
  name: string,
  tableName: string,
  withDown: boolean = true,
): Migration {
  return {
    version,
    name,
    up: async (db: ExpoSQLiteDatabase) => {
      await db.execAsync(
        `CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL)`,
      );
    },
    ...(withDown
      ? {
          down: async (db: ExpoSQLiteDatabase) => {
            await db.execAsync(`DROP TABLE ${tableName}`);
          },
        }
      : {}),
  };
}

let dbSequence = 0;
function freshDbName(prefix: string): string {
  dbSequence += 1;
  return `${prefix}_${Date.now()}_${dbSequence}`;
}

// The test harness adapter exposes the same method surface expo-sqlite does,
// so it is bridged to the expo type for the runner's public API.
function asExpo(db: SQLiteDatabase): ExpoSQLiteDatabase {
  return db as unknown as ExpoSQLiteDatabase;
}

function tableExists(db: SQLiteDatabase, table: string): Promise<boolean> {
  return db
    .getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?",
      table,
    )
    .then((row) => (row?.count ?? 0) > 0);
}

async function appliedVersions(db: SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  return rows.map((r) => r.version);
}
describe('MigrationRunner', () => {
  it('should apply pending migrations in version order and record them', async () => {
    const name = freshDbName('order');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    runner.registerMigration(createTableMigration(2, 'second', 'mig_second'));
    runner.registerMigration(createTableMigration(1, 'first', 'mig_first'));

    await runner.runMigrations(asExpo(db));

    expect(await tableExists(db, 'mig_first')).toBe(true);
    expect(await tableExists(db, 'mig_second')).toBe(true);
    expect(await appliedVersions(db)).toEqual([1, 2]);
    expect(await runner.getCurrentVersion(asExpo(db))).toBe(2);

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should not re-run when database is already at target version', async () => {
    const name = freshDbName('idempotent');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    runner.registerMigration(createTableMigration(1, 'first', 'mig_idem_a'));
    runner.registerMigration(createTableMigration(2, 'second', 'mig_idem_b'));

    await runner.runMigrations(asExpo(db));
    await runner.runMigrations(asExpo(db));

    expect(await appliedVersions(db)).toEqual([1, 2]);
    expect(await tableExists(db, 'mig_idem_a')).toBe(true);
    expect(await tableExists(db, 'mig_idem_b')).toBe(true);

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should skip an already-applied migration when user_version is stale (desynced)', async () => {
    const name = freshDbName('desync');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    // Simulate an interrupted prior run: migration 1 was committed into
    // schema_migrations, but PRAGMA user_version was never advanced to 2.
    // This is the state that previously caused "Migration 1 failed" on every
    // subsequent startup due to a UNIQUE constraint on the version key.
    await db.execAsync(
      "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))",
    );
    await db.runAsync(
      'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      1,
      'initial_schema',
    );
    await db.execAsync('PRAGMA user_version = 0');

    const runner = new MigrationRunner();
    runner.registerMigration(createTableMigration(1, 'initial_schema', 'mig_desync_a'));
    runner.registerMigration(createTableMigration(2, 'create_user_profiles', 'mig_desync_b'));

    // Must NOT throw "UNIQUE constraint failed: schema_migrations.version".
    await expect(runner.runMigrations(asExpo(db))).resolves.not.toThrow();

    expect(await appliedVersions(db)).toEqual([1, 2]);
    expect(await tableExists(db, 'mig_desync_b')).toBe(true);
    expect(await runner.getCurrentVersion(asExpo(db))).toBe(2);

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should be idempotent when user_version is stale lower than applied migrations', async () => {
    const name = freshDbName('stale');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    runner.registerMigration(createTableMigration(1, 'first', 'mig_stale_a'));
    runner.registerMigration(createTableMigration(2, 'second', 'mig_stale_b'));

    await runner.runMigrations(asExpo(db));
    expect(await appliedVersions(db)).toEqual([1, 2]);

    // Force user_version out of sync (e.g. restored from a backup / WAL edge).
    await db.execAsync('PRAGMA user_version = 0');

    await expect(runner.runMigrations(asExpo(db))).resolves.not.toThrow();
    expect(await appliedVersions(db)).toEqual([1, 2]);
    expect(await runner.getCurrentVersion(asExpo(db))).toBe(2);

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should run the initial schema migration inside an exclusive transaction', async () => {
    const name = freshDbName('txsafety');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    // The runner migrates inside an exclusive transaction, so migration 001
    // must not contain connection PRAGMAs (e.g. journal_mode) that are invalid
    // within a transaction. This asserts the exact production migration passes.
    await expect(
      db.withExclusiveTransactionAsync(async (txn) => {
        await initialSchemaMigration.up(asExpo(txn));
        await createUserProfilesMigration.up(asExpo(txn));
      }),
    ).resolves.not.toThrow();

    expect(await tableExists(db, 'user_profiles')).toBe(true);

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should roll back migrations to a target version', async () => {
    const name = freshDbName('rollback');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    runner.registerMigration(createTableMigration(1, 'first', 'mig_rb_a'));
    runner.registerMigration(createTableMigration(2, 'second', 'mig_rb_b'));

    await runner.runMigrations(asExpo(db));
    expect(await appliedVersions(db)).toEqual([1, 2]);

    await runner.rollbackMigration(asExpo(db), 1);
    expect(await tableExists(db, 'mig_rb_b')).toBe(false);
    expect(await tableExists(db, 'mig_rb_a')).toBe(true);
    expect(await appliedVersions(db)).toEqual([1]);
    expect(await runner.getCurrentVersion(asExpo(db))).toBe(1);

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should wrap a failing migration in DatabaseMigrationError without recording it', async () => {
    const name = freshDbName('failure');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    const fail: Migration = {
      version: 1,
      name: 'boom',
      up: async () => {
        throw new Error('migration exploded');
      },
    };
    runner.registerMigration(fail);

    await expect(runner.runMigrations(asExpo(db))).rejects.toThrow(
      DatabaseMigrationError,
    );
    expect(await appliedVersions(db)).toEqual([]);
    expect(await runner.getCurrentVersion(asExpo(db))).toBe(0);

    await db.closeAsync();
    removeDatabaseFile(name);
  });
it('should throw DatabaseMigrationError when no migrations exist for the target range', async () => {
    const name = freshDbName('missing');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    // No migrations registered, but DATABASE_VERSION is 2.
    await expect(runner.runMigrations(asExpo(db))).rejects.toThrow(
      DatabaseMigrationError,
    );

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should throw DatabaseMigrationError when rolling back a migration without a down step', async () => {
    const name = freshDbName('nodown');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    const runner = new MigrationRunner();
    runner.registerMigration(
      createTableMigration(1, 'no_down', 'mig_no_down', false),
    );
    await runner.runMigrations(asExpo(db));

    await expect(runner.rollbackMigration(asExpo(db), 0)).rejects.toThrow(
      DatabaseMigrationError,
    );

    await db.closeAsync();
    removeDatabaseFile(name);
  });

  it('should apply the production migrations to create the real schema', async () => {
    // Importing databaseManager registers the production migrations as a side effect.
    expect(databaseManager).toBeDefined();

    const name = freshDbName('production');
    removeDatabaseFile(name);
    const db = await openDatabaseAsync(name);

    await migrationRunner.runMigrations(asExpo(db));

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = tables.map((t) => t.name);

    expect(names).toContain('schema_migrations');
    expect(names).toContain('user_profiles');
    expect(await appliedVersions(db)).toEqual([1, 2]);

    await db.closeAsync();
    removeDatabaseFile(name);
  });
});