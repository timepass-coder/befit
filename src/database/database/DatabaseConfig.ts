export const DATABASE_NAME = 'befit.db';

export const DATABASE_VERSION = 2;

export const DATABASE_JOURNAL_MODE = 'WAL';

export interface DatabaseConfig {
  name: string;
  version: number;
  journalMode: string;
  enableForeignKeys: boolean;
}

export const defaultDatabaseConfig: DatabaseConfig = {
  name: DATABASE_NAME,
  version: DATABASE_VERSION,
  journalMode: DATABASE_JOURNAL_MODE,
  enableForeignKeys: true,
};