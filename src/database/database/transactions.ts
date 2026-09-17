import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Platform detection utility.
 * In production, this uses react-native's Platform.OS.
 * In tests, this can be overridden by calling setTestPlatform().
 */
let testPlatformOverride: 'ios' | 'android' | 'web' | null = null;

function setTestPlatform(platform: 'ios' | 'android' | 'web' | null): void {
  testPlatformOverride = platform;
}

function getPlatform(): 'ios' | 'android' | 'web' {
  // Check for test environment override
  if (testPlatformOverride) {
    return testPlatformOverride;
  }
  
  // In production, use react-native's Platform
  // We use dynamic require to avoid Jest transformation issues with react-native
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native');
    return Platform.OS as 'ios' | 'android' | 'web';
  } catch {
    // Fallback for environments where react-native is not available
    return 'ios';
  }
}

/**
 * Runs a callback within a transaction, using the appropriate transaction
 * primitive for the current platform.
 *
 * - On native (iOS/Android): uses `withExclusiveTransactionAsync` which opens
 *   a separate connection for the transaction, providing full isolation.
 * - On web: uses `withTransactionAsync` (plain BEGIN/COMMIT/ROLLBACK) because
 *   the web SQLite driver (sql.js via WASM) runs on a single worker connection
 *   and cannot open a second connection for exclusive transactions.
 *
 * On web, all queries are already serialized through the single worker
 * connection, so a regular transaction provides the same all-or-nothing guarantee.
 */
export async function runInTransactionAsync<T>(
  db: SQLiteDatabase,
  callback: (txn: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  let result: T;
  const platform = getPlatform();
  
  if (platform === 'web') {
    // On web, use the regular transaction API (BEGIN/COMMIT/ROLLBACK)
    // The sql.js web driver doesn't support exclusive transactions
    // withTransactionAsync takes a callback with no parameters, so we use the db from closure
    await db.withTransactionAsync(async () => {
      result = await callback(db);
    });
  } else {
    // On native, use exclusive transaction for full isolation
    // withExclusiveTransactionAsync passes a Transaction (extends SQLiteDatabase) to the callback
    await db.withExclusiveTransactionAsync(async (txn) => {
      result = await callback(txn);
    });
  }
  
  return result!;
}

// Export for testing
export { getPlatform, setTestPlatform };